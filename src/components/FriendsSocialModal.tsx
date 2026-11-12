import React, { useEffect, useState } from 'react';
import {
  acceptFriendRequest,
  declineFriendRequest,
  DirectChatMessage,
  dismissPartyInvite,
  fetchFriendFullProfile,
  FriendEntry,
  PartyInviteEntry,
  sendDirectChatMessage,
  sendFriendRequestByCallsign,
  sendPartyInviteToFriend,
  SocialInboxState,
  subscribeDirectChat,
  subscribeSocialInbox,
} from '../firebase/friendsSocialService';
import { PlayerCloudProfile } from '../firebase/playerCloudSync';
import { createMultiplayerRoom, getActiveOnlineRoom, joinRoomByCode } from '../multiplayer/onlineRoomService';
import { DrillMode } from '../types/game';
import { FriendChatAndProfilePanel } from './FriendChatAndProfilePanel';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface FriendsSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  myCallsign: string;
  onOpenOnlineLobbyWithRoom: (mode: DrillMode) => void;
}

export const FriendsSocialModal: React.FC<FriendsSocialModalProps> = ({
  isOpen,
  onClose,
  myCallsign,
  onOpenOnlineLobbyWithRoom,
}) => {
  const [inbox, setInbox] = useState<SocialInboxState>({ uid: '', friends: {}, requests: {}, invites: {}, updatedAtMs: 0 });
  const [activeTab, setActiveTab] = useState<'FRIENDS' | 'ADD' | 'REQUESTS'>('FRIENDS');
  const [searchCallsign, setSearchCallsign] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendEntry | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'CHAT' | 'PROFILE'>('CHAT');
  const [chatMessages, setChatMessages] = useState<DirectChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [inspectedProfile, setInspectedProfile] = useState<PlayerCloudProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsub = subscribeSocialInbox((next) => setInbox(next));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedFriend) {
      setChatMessages([]);
      return;
    }
    const unsub = subscribeDirectChat(selectedFriend.uid, (msgs) => setChatMessages(msgs));
    return () => unsub();
  }, [selectedFriend]);

  if (!isOpen) return null;

  const friendsList = Object.values(inbox.friends);
  const requestsList = Object.values(inbox.requests);
  const invitesList = Object.values(inbox.invites);
  const badgeCount = requestsList.length + invitesList.length;

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCallsign.trim()) return;
    setStatusFeedback('Buscando operador na nuvem...');
    const res = await sendFriendRequestByCallsign(searchCallsign);
    setStatusFeedback(res.message);
    if (res.ok) setSearchCallsign('');
  };

  const handleInspectProfile = async (friend: FriendEntry) => {
    setSelectedFriend(friend);
    setRightPanelMode('PROFILE');
    setLoadingProfile(true);
    const prof = await fetchFriendFullProfile(friend.uid);
    setInspectedProfile(prof);
    setLoadingProfile(false);
  };

  const handleOpenChat = (friend: FriendEntry) => {
    setSelectedFriend(friend);
    setRightPanelMode('CHAT');
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    await sendDirectChatMessage(selectedFriend.uid, text);
  };

  const handleInviteFriendToMatch = async (friend: FriendEntry) => {
    let room = getActiveOnlineRoom();
    if (!room) room = await createMultiplayerRoom('DUST2_BOMB_5V5', true);
    if (!room) {
      setStatusFeedback('Erro ao preparar sala para convite.');
      return;
    }
    const sent = await sendPartyInviteToFriend(friend.uid, room.roomId, room.arenaMode);
    if (sent) {
      setStatusFeedback(`Convite da sala [${room.roomId}] enviado para ${friend.callsign}! Abrindo Lobby...`);
      setTimeout(() => onOpenOnlineLobbyWithRoom(room!.arenaMode), 900);
    }
  };

  const handleAcceptMatchInvite = async (inv: PartyInviteEntry) => {
    await dismissPartyInvite(inv.fromUid);
    const res = await joinRoomByCode(inv.roomId);
    if (res.ok && res.room) {
      onOpenOnlineLobbyWithRoom(res.room.arenaMode);
    } else {
      setStatusFeedback(res.error || 'A sala convidada não está mais disponível.');
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-4 pointer-events-auto"
    >
      <div
        className="w-full max-w-[880px] h-[88vh] max-h-[560px] rounded border border-[#c89b3c]/55 bg-[#0b0f17] text-slate-100 shadow-2xl overflow-hidden flex flex-col"
        style={{ fontFamily: "'Rajdhani', sans-serif" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#1a2230] via-[#121824] to-[#1a2230] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-xs font-extrabold text-amber-300 uppercase tracking-wider">
              CENTRAL SOCIAL & CLÃ
            </span>
            <span className="text-xs text-slate-300">
              SEU ID ÚNICO: <strong className="text-amber-300 font-mono tracking-wider">{myCallsign}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer"
          >
            ✕ Fechar
          </button>
        </div>

        {statusFeedback && (
          <div className="px-4 py-1.5 bg-amber-500/15 border-b border-amber-400/40 text-xs text-amber-200 flex items-center justify-between shrink-0">
            <span>📡 {statusFeedback}</span>
            <button type="button" onClick={() => setStatusFeedback(null)} className="text-[10px] underline cursor-pointer">
              OK
            </button>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          <div className="md:col-span-5 border-r border-white/10 flex flex-col min-h-0 bg-[#0d121c]">
            <div className="grid grid-cols-3 border-b border-white/10 shrink-0">
              {(['FRIENDS', 'ADD', 'REQUESTS'] as const).map((t) => {
                const label =
                  t === 'FRIENDS'
                    ? `AMIGOS (${friendsList.length})`
                    : t === 'ADD'
                      ? '+ ADICIONAR'
                      : `CONVITES ${badgeCount > 0 ? `(${badgeCount})` : ''}`;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTab(t)}
                    className={`py-2 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer border-b-2 ${
                      activeTab === t ? 'border-amber-400 text-amber-300 bg-amber-500/10' : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeTab === 'FRIENDS' && (
                <>
                  {friendsList.length === 0 ? (
                    <div className="text-center py-8 px-3 text-xs text-slate-400">
                      Sua lista de amigos está vazia. Clique em <b>+ ADICIONAR</b> para buscar pelo ID Único de um amigo!
                    </div>
                  ) : (
                    friendsList.map((f) => {
                      const isSelected = selectedFriend?.uid === f.uid;
                      return (
                        <div
                          key={f.uid}
                          className={`p-2 rounded border transition-all ${
                            isSelected ? 'bg-amber-500/15 border-amber-400/60' : 'bg-black/45 border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded bg-slate-800 border border-amber-400/50 overflow-hidden flex items-center justify-center shrink-0">
                                {f.avatarDataUrl ? (
                                  <img src={f.avatarDataUrl} alt={f.callsign} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-amber-300">{f.callsign.slice(0, 2)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-white truncate">{f.callsign}</div>
                                <div className="flex items-center gap-1 text-[10px] text-amber-300 font-mono">
                                  <WarfaceRankIcon level={f.rankLevel || 1} className="w-3.5 h-3.5" />
                                  <span>NÍV. {f.rankLevel || 1}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenChat(f)}
                                className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-[10px] font-bold text-sky-200 cursor-pointer"
                              >
                                💬 CHAT
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleInspectProfile(f)}
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-bold text-slate-200 cursor-pointer"
                              >
                                PERFIL
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleInviteFriendToMatch(f)}
                                className="px-2 py-1 rounded bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/50 text-[10px] font-extrabold text-emerald-200 cursor-pointer"
                              >
                                CONVIDAR
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === 'ADD' && (
                <form onSubmit={handleSendFriendRequest} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                      BUSCAR OPERADOR PELO NOME / ID ÚNICO
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={searchCallsign}
                        onChange={(e) => setSearchCallsign(e.target.value.toUpperCase())}
                        placeholder="EX: RAFAEL01"
                        className="flex-1 px-2.5 py-2 rounded bg-black/70 border border-white/20 text-xs font-mono uppercase tracking-wider text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                      >
                        ENVIAR PEDIDO
                      </button>
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-white/10 text-[11px] text-slate-300 leading-relaxed">
                    Compartilhe seu ID único (<strong className="text-amber-300">{myCallsign}</strong>) com seus amigos para que eles possam adicionar você e enviar convites de sala 5v5.
                  </div>
                </form>
              )}

              {activeTab === 'REQUESTS' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                      CONVITES DE PARTIDA 5V5 ({invitesList.length})
                    </div>
                    {invitesList.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">Nenhum convite de sala pendente.</div>
                    ) : (
                      invitesList.map((inv) => (
                        <div key={inv.fromUid} className="p-2.5 rounded bg-emerald-950/35 border border-emerald-400/50 flex items-center justify-between gap-2 mb-1.5">
                          <div>
                            <div className="text-xs font-extrabold text-white">{inv.fromCallsign} convidou você!</div>
                            <div className="text-[10px] text-emerald-300 font-mono">SALA: [{inv.roomId}] • {inv.arenaMode}</div>
                          </div>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => void handleAcceptMatchInvite(inv)} className="px-2.5 py-1 rounded bg-emerald-500 text-black text-[10px] font-extrabold uppercase cursor-pointer">
                              ENTRAR
                            </button>
                            <button type="button" onClick={() => void dismissPartyInvite(inv.fromUid)} className="px-2 py-1 rounded bg-white/10 text-slate-300 text-[10px] cursor-pointer">
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                      PEDIDOS DE AMIZADE RECEBIDOS ({requestsList.length})
                    </div>
                    {requestsList.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">Nenhuma solicitação de amizade pendente.</div>
                    ) : (
                      requestsList.map((req) => (
                        <div key={req.fromUid} className="p-2.5 rounded bg-black/50 border border-amber-400/40 flex items-center justify-between gap-2 mb-1.5">
                          <div>
                            <div className="text-xs font-extrabold text-white">{req.fromCallsign}</div>
                            <div className="text-[10px] text-amber-300 font-mono">Patente Nív. {req.fromRankLevel}</div>
                          </div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => void acceptFriendRequest(req)} className="px-2.5 py-1 rounded bg-amber-500 text-black text-[10px] font-extrabold uppercase cursor-pointer">
                              ACEITAR
                            </button>
                            <button type="button" onClick={() => void declineFriendRequest(req.fromUid)} className="px-2 py-1 rounded bg-red-500/20 border border-red-400/40 text-red-200 text-[10px] font-bold uppercase cursor-pointer">
                              RECUSAR
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-7 flex flex-col min-h-0 bg-[#090d14]">
            <FriendChatAndProfilePanel
              myUid={inbox.uid}
              selectedFriend={selectedFriend}
              rightPanelMode={rightPanelMode}
              onSetRightPanelMode={setRightPanelMode}
              onInspectProfile={(f) => void handleInspectProfile(f)}
              chatMessages={chatMessages}
              chatInput={chatInput}
              onChangeChatInput={setChatInput}
              onSendChat={handleSendChat}
              inspectedProfile={inspectedProfile}
              loadingProfile={loadingProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
