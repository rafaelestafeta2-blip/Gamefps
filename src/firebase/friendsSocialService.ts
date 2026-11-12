import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { DrillMode } from '../types/game';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from './firebaseClient';
import { getCloudSyncState, PlayerCloudProfile } from './playerCloudSync';

export interface FriendEntry {
  uid: string;
  callsign: string;
  rankLevel: number;
  avatarDataUrl: string;
  addedAt: string;
}

export interface FriendRequestEntry {
  fromUid: string;
  fromCallsign: string;
  fromRankLevel: number;
  fromAvatar: string;
  sentAt: string;
}

export interface PartyInviteEntry {
  fromUid: string;
  fromCallsign: string;
  roomId: string;
  arenaMode: DrillMode;
  sentAtMs: number;
}

export interface SocialInboxState {
  uid: string;
  friends: Record<string, FriendEntry>;
  requests: Record<string, FriendRequestEntry>;
  invites: Record<string, PartyInviteEntry>;
  updatedAtMs: number;
}

export interface DirectChatMessage {
  id: string;
  senderUid: string;
  senderCallsign: string;
  text: string;
  sentAtMs: number;
}

type InboxSubscriber = (inbox: SocialInboxState) => void;
const inboxSubscribers = new Set<InboxSubscriber>();

let currentInbox: SocialInboxState = {
  uid: '',
  friends: {},
  requests: {},
  invites: {},
  updatedAtMs: 0,
};

let inboxUnsub: Unsubscribe | null = null;

function emitInbox(): void {
  const snap: SocialInboxState = {
    ...currentInbox,
    friends: { ...currentInbox.friends },
    requests: { ...currentInbox.requests },
    invites: { ...currentInbox.invites },
  };
  inboxSubscribers.forEach((fn) => fn(snap));
}

async function ensureSocialInboxDoc(uid: string): Promise<SocialInboxState> {
  const ref = doc(db, 'social_inboxes', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as SocialInboxState;
  }
  const initial: SocialInboxState = {
    uid,
    friends: {},
    requests: {},
    invites: {},
    updatedAtMs: Date.now(),
  };
  await setDoc(ref, initial);
  return initial;
}

onAuthStateChanged(auth, (user) => {
  if (inboxUnsub) {
    inboxUnsub();
    inboxUnsub = null;
  }
  if (!user) {
    currentInbox = { uid: '', friends: {}, requests: {}, invites: {}, updatedAtMs: 0 };
    emitInbox();
    return;
  }

  const ref = doc(db, 'social_inboxes', user.uid);
  inboxUnsub = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        void ensureSocialInboxDoc(user.uid);
        return;
      }
      currentInbox = snap.data() as SocialInboxState;
      emitInbox();
    },
    (err) => handleFirestoreError(err, OperationType.GET, `social_inboxes/${user.uid}`)
  );
});

export function subscribeSocialInbox(fn: InboxSubscriber): () => void {
  inboxSubscribers.add(fn);
  fn(currentInbox);
  return () => inboxSubscribers.delete(fn);
}

export async function sendFriendRequestByCallsign(
  rawCallsign: string
): Promise<{ ok: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user) return { ok: false, message: 'Faça login com sua Conta Google primeiro.' };

  const cleanUpper = rawCallsign.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const cleanLower = cleanUpper.toLowerCase();
  if (cleanLower.length < 2) {
    return { ok: false, message: 'Digite um Callsign/ID válido (mín. 2 caracteres).' };
  }

  const mySync = getCloudSyncState();
  if (cleanUpper === mySync.profile.callsign.toUpperCase()) {
    return { ok: false, message: 'Você não pode adicionar seu próprio ID.' };
  }

  try {
    let targetUid = '';
    const usernameSnap = await getDoc(doc(db, 'usernames', cleanLower));
    if (usernameSnap.exists()) {
      targetUid = (usernameSnap.data() as { uid: string }).uid;
    } else {
      // Fallback: caso tenha digitado o UID diretamente
      const directSnap = await getDoc(doc(db, 'players', rawCallsign.trim()));
      if (directSnap.exists()) {
        targetUid = directSnap.id;
      }
    }

    if (!targetUid) {
      return {
        ok: false,
        message: `Operador "${cleanUpper}" não encontrado. Verifique se ele já registrou o Callsign Único.`,
      };
    }
    if (targetUid === user.uid) {
      return { ok: false, message: 'Você não pode adicionar seu próprio ID.' };
    }
    if (currentInbox.friends[targetUid]) {
      return { ok: false, message: `"${cleanUpper}" já está na sua lista de amigos!` };
    }

    const targetInbox = await ensureSocialInboxDoc(targetUid);
    targetInbox.requests[user.uid] = {
      fromUid: user.uid,
      fromCallsign: mySync.profile.callsign,
      fromRankLevel: mySync.profile.rankLevel || 1,
      fromAvatar: (mySync.profile.avatarDataUrl || '').slice(0, 6000),
      sentAt: new Date().toISOString(),
    };
    targetInbox.updatedAtMs = Date.now();

    await setDoc(doc(db, 'social_inboxes', targetUid), targetInbox);
    return { ok: true, message: `Pedido de amizade enviado para ${cleanUpper}!` };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'social_inboxes');
    return { ok: false, message: 'Erro ao enviar pedido de amizade.' };
  }
}

export async function acceptFriendRequest(req: FriendRequestEntry): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const mySync = getCloudSyncState();
  const nowIso = new Date().toISOString();

  try {
    const myInbox = await ensureSocialInboxDoc(user.uid);
    delete myInbox.requests[req.fromUid];
    myInbox.friends[req.fromUid] = {
      uid: req.fromUid,
      callsign: req.fromCallsign,
      rankLevel: req.fromRankLevel || 1,
      avatarDataUrl: req.fromAvatar || '',
      addedAt: nowIso,
    };
    myInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', user.uid), myInbox);

    const senderInbox = await ensureSocialInboxDoc(req.fromUid);
    delete senderInbox.requests[user.uid];
    senderInbox.friends[user.uid] = {
      uid: user.uid,
      callsign: mySync.profile.callsign,
      rankLevel: mySync.profile.rankLevel || 1,
      avatarDataUrl: (mySync.profile.avatarDataUrl || '').slice(0, 6000),
      addedAt: nowIso,
    };
    senderInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', req.fromUid), senderInbox);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'social_inboxes');
  }
}

export async function declineFriendRequest(fromUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const myInbox = await ensureSocialInboxDoc(user.uid);
    delete myInbox.requests[fromUid];
    myInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', user.uid), myInbox);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `social_inboxes/${user.uid}`);
  }
}

export async function removeFriend(friendUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const myInbox = await ensureSocialInboxDoc(user.uid);
    delete myInbox.friends[friendUid];
    myInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', user.uid), myInbox);

    const otherInbox = await ensureSocialInboxDoc(friendUid);
    delete otherInbox.friends[user.uid];
    otherInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', friendUid), otherInbox);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'social_inboxes');
  }
}

export async function sendPartyInviteToFriend(
  friendUid: string,
  roomId: string,
  arenaMode: DrillMode
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const mySync = getCloudSyncState();
  try {
    const targetInbox = await ensureSocialInboxDoc(friendUid);
    targetInbox.invites[user.uid] = {
      fromUid: user.uid,
      fromCallsign: mySync.profile.callsign,
      roomId,
      arenaMode,
      sentAtMs: Date.now(),
    };
    targetInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', friendUid), targetInbox);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `social_inboxes/${friendUid}`);
    return false;
  }
}

export async function dismissPartyInvite(fromUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const myInbox = await ensureSocialInboxDoc(user.uid);
    delete myInbox.invites[fromUid];
    myInbox.updatedAtMs = Date.now();
    await setDoc(doc(db, 'social_inboxes', user.uid), myInbox);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `social_inboxes/${user.uid}`);
  }
}

export async function fetchFriendFullProfile(
  friendUid: string
): Promise<PlayerCloudProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'players', friendUid));
    if (!snap.exists()) return null;
    return snap.data() as PlayerCloudProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `players/${friendUid}`);
    return null;
  }
}

function getDirectChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export function subscribeDirectChat(
  friendUid: string,
  onMessages: (msgs: DirectChatMessage[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !friendUid) return () => {};
  const chatId = getDirectChatId(user.uid, friendUid);
  const ref = doc(db, 'direct_chats', chatId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onMessages([]);
        return;
      }
      const data = snap.data() as { messages?: DirectChatMessage[] };
      onMessages(data.messages || []);
    },
    () => onMessages([])
  );
}

export async function sendDirectChatMessage(
  friendUid: string,
  rawText: string
): Promise<void> {
  const user = auth.currentUser;
  const text = rawText.trim().slice(0, 240);
  if (!user || !friendUid || !text) return;

  const mySync = getCloudSyncState();
  const chatId = getDirectChatId(user.uid, friendUid);
  const ref = doc(db, 'direct_chats', chatId);

  try {
    const snap = await getDoc(ref);
    const existing = snap.exists()
      ? ((snap.data() as { messages?: DirectChatMessage[] }).messages || [])
      : [];
    const nextMsg: DirectChatMessage = {
      id: `${user.uid}_${Date.now()}`,
      senderUid: user.uid,
      senderCallsign: mySync.profile.callsign,
      text,
      sentAtMs: Date.now(),
    };
    const updatedMessages = [...existing.slice(-39), nextMsg];
    await setDoc(ref, {
      chatId,
      participants: [user.uid, friendUid].sort(),
      messages: updatedMessages,
      updatedAtMs: Date.now(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `direct_chats/${chatId}`);
  }
}
