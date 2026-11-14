import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, firebaseConfig, googleProvider } from './firebaseClient';
import {
  CreateAuthUriResponse,
  IdpSignInResponse,
  googleRedirectUri,
  idpErrorMessage,
  interpretGoogleCallback,
} from './googleOAuthCallback';

const SESSION_KEY = 'kinetic_google_oauth_session_v1';

declare global {
  interface Window {
    KineticNativeAuth?: {
      startGoogleSignIn: (oauthUrl: string) => void;
      rememberOAuthSession?: (sessionId: string) => void;
      readOAuthSession?: () => string;
      pollPendingOAuthResult?: () => string;
      clearPendingOAuth?: () => void;
    };
    __kineticHandleNativeOAuthRedirect?: (callbackUrl: string) => void;
    __kineticHandleNativeOAuthCancel?: (reason?: string) => void;
  }
}

export interface GoogleSignInResult {
  ok: boolean;
  error?: string;
  needsPaste?: boolean;
}

type PendingResolve = (result: GoogleSignInResult) => void;
let pendingResolve: PendingResolve | null = null;
let callbackInFlight: Promise<GoogleSignInResult> | null = null;
let callbackInFlightKey = '';

function hasNativeGoogleAuth(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      window.KineticNativeAuth &&
      typeof window.KineticNativeAuth.startGoogleSignIn === 'function'
  );
}

function settlePending(result: GoogleSignInResult): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.(result);
}

function rememberSession(sessionId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    /* ignore quota */
  }
  try {
    window.KineticNativeAuth?.rememberOAuthSession?.(sessionId);
  } catch {
    /* bridge may be missing in the browser */
  }
}

function readSession(): string {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  try {
    return window.KineticNativeAuth?.readOAuthSession?.() || '';
  } catch {
    return '';
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function adoptIdpSession(payload: IdpSignInResponse): Promise<void> {
  const { UserImpl } = await import('@firebase/auth/internal');
  const user = await UserImpl._fromIdTokenResponse(
    auth as unknown as Parameters<typeof UserImpl._fromIdTokenResponse>[0],
    {
      localId: payload.localId || '',
      idToken: payload.idToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
    }
  );
  await (
    auth as unknown as { _updateCurrentUser: (next: unknown) => Promise<void> }
  )._updateCurrentUser(user);
}

async function createGoogleAuthUri(): Promise<CreateAuthUriResponse> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        continueUri: googleRedirectUri(firebaseConfig.authDomain),
        providerId: 'google.com',
        oauthScope: 'openid,email,profile',
        customParameter: { prompt: 'select_account' },
      }),
    }
  );
  const payload = (await response.json()) as CreateAuthUriResponse & {
    error?: { message?: string };
  };
  if (!response.ok || !payload.authUri || !payload.sessionId) {
    throw new Error(payload.error?.message || `HTTP ${response.status}`);
  }
  return { authUri: payload.authUri, sessionId: payload.sessionId };
}

async function signInWithGoogleCode(requestUri: string): Promise<void> {
  const sessionId = readSession();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestUri,
        sessionId: sessionId || undefined,
        returnSecureToken: true,
        returnIdpCredential: true,
      }),
    }
  );
  const payload = (await response.json()) as IdpSignInResponse;
  if (!response.ok) {
    throw new Error(idpErrorMessage(payload, response.status));
  }

  const googleIdToken = payload.oauthIdToken || null;
  const accessToken = payload.oauthAccessToken || null;
  if (googleIdToken || accessToken) {
    const credential = GoogleAuthProvider.credential(googleIdToken, accessToken);
    await signInWithCredential(auth, credential);
  } else if (payload.idToken && payload.refreshToken && payload.localId) {
    await adoptIdpSession(payload);
  } else {
    throw new Error(
      'O Firebase confirmou o código, mas não devolveu o token da conta Google.'
    );
  }
  clearSession();
  try {
    window.KineticNativeAuth?.clearPendingOAuth?.();
  } catch {
    /* ignore */
  }
}

export async function completeGoogleCallback(raw: string): Promise<GoogleSignInResult> {
  const key = raw.trim();
  if (!key) {
    return { ok: false, error: 'Cole o endereço completo da página de login.' };
  }
  if (callbackInFlight && callbackInFlightKey === key) {
    return callbackInFlight;
  }
  callbackInFlightKey = key;
  callbackInFlight = finishGoogleCallback(key).finally(() => {
    callbackInFlight = null;
  });
  return callbackInFlight;
}

async function finishGoogleCallback(raw: string): Promise<GoogleSignInResult> {
  const parsed = interpretGoogleCallback(raw, firebaseConfig.authDomain);
  if (parsed.kind === 'error') {
    return { ok: false, error: parsed.message };
  }

  try {
    if (parsed.kind === 'id_token') {
      const credential = GoogleAuthProvider.credential(
        parsed.idToken,
        parsed.accessToken
      );
      await signInWithCredential(auth, credential);
      clearSession();
      try {
        window.KineticNativeAuth?.clearPendingOAuth?.();
      } catch {
        /* ignore */
      }
      return { ok: true };
    }

    await signInWithGoogleCode(parsed.requestUri);
    return { ok: true };
  } catch (err) {
    try {
      if (typeof window !== 'undefined') {
        window.KineticNativeAuth?.clearPendingOAuth?.();
      }
    } catch {
      /* ignore */
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: msg.startsWith('Não foi possível') || msg.startsWith('O Google') || msg.startsWith('A sessão') || msg.startsWith('O Firebase')
        ? msg
        : `Erro ao autenticar conta Google no Firebase: ${msg}`,
    };
  }
}

function installNativeOAuthHooks(): void {
  if (typeof window === 'undefined') return;
  if (window.__kineticHandleNativeOAuthRedirect) return;

  window.__kineticHandleNativeOAuthRedirect = (callbackUrl: string) => {
    void completeGoogleCallback(callbackUrl).then((result) => {
      settlePending(result);
    });
  };

  window.__kineticHandleNativeOAuthCancel = (reason?: string) => {
    if (reason === '__PASTE__') {
      settlePending({
        ok: false,
        needsPaste: true,
        error:
          'O Chrome não devolveu o login sozinho. Na página do Google, toque na barra de endereço, copie o link inteiro (firebaseapp.com/__/auth/handler?code=...) e cole abaixo.',
      });
      return;
    }
    settlePending({
      ok: false,
      error: reason || 'Janela de login do Google foi fechada.',
    });
  };
}

installNativeOAuthHooks();

export async function resumePendingGoogleSignInIfNeeded(): Promise<GoogleSignInResult | null> {
  if (!hasNativeGoogleAuth()) return null;
  let pending = '';
  try {
    pending = window.KineticNativeAuth?.pollPendingOAuthResult?.() || '';
  } catch {
    return null;
  }
  if (!pending || pending === '__CANCELLED__') return null;
  return completeGoogleCallback(pending);
}

export async function performGoogleSignIn(): Promise<GoogleSignInResult> {
  installNativeOAuthHooks();

  if (hasNativeGoogleAuth()) {
    let authUri = '';
    try {
      const created = await createGoogleAuthUri();
      rememberSession(created.sessionId);
      authUri = created.authUri;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        error: `Não foi possível abrir o login do Google. (${msg})`,
      };
    }

    return new Promise<GoogleSignInResult>((resolve) => {
      pendingResolve = resolve;
      try {
        window.KineticNativeAuth!.startGoogleSignIn(authUri);
      } catch (err) {
        pendingResolve = null;
        const msg = err instanceof Error ? err.message : String(err);
        resolve({
          ok: false,
          error: `Falha ao abrir o Chrome para o login Google: ${msg}`,
        });
      }
    });
  }

  try {
    await signInWithPopup(auth, googleProvider);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: popupErrorMessage(err) };
  }
}

function popupErrorMessage(err: unknown): string {
  const code =
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : '';
  const msg = err instanceof Error ? err.message : String(err);

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
    return 'Janela de login do Google foi fechada.';
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'O navegador bloqueou a janela de login do Google.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'O login com Google foi interrompido.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Este endereço não está autorizado no Firebase. (auth/unauthorized-domain)';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Login com Google está desligado no Firebase. (auth/operation-not-allowed)';
  }
  if (code === 'auth/network-request-failed') {
    return 'Sem conexão para concluir o login com Google.';
  }
  if (code) {
    return `Não foi possível concluir o login com Google. (${code})`;
  }
  return 'Não foi possível concluir o login com Google. Faça login com uma conta válida.';
}

export async function performGoogleSignOut(): Promise<void> {
  clearSession();
  try {
    window.KineticNativeAuth?.clearPendingOAuth?.();
  } catch {
    /* ignore */
  }
  await signOut(auth);
}
