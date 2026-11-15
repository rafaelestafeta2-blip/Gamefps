import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, firebaseConfig, googleProvider } from './firebaseClient';

const OAUTH_PENDING_KEY = 'kinetic_oauth_pending_v1';
const OAUTH_STASH_URL_KEY = 'kinetic_oauth_stash_url_v1';
/** Native WebView OAuth must not leave CONECTANDO forever. */
const NATIVE_SIGN_IN_TIMEOUT_MS = 90_000;
/** Stale pending flag from abandoned/cold-start attempts. */
const OAUTH_PENDING_MAX_AGE_MS = 3 * 60_000;

declare global {
  interface Window {
    KineticNativeAuth?: {
      startGoogleSignIn: (oauthUrl: string) => void;
      pollPendingOAuthResult?: () => string;
      isOAuthInProgress?: () => boolean;
      clearPendingOAuth?: () => void;
    };
    __kineticHandleNativeOAuthRedirect?: (callbackUrl: string) => void;
    __kineticHandleNativeOAuthCancel?: (reason?: string) => void;
    __kineticNotifyOAuthResume?: () => void;
    __kineticStashOAuthUrl?: (callbackUrl: string) => void;
  }
}

export interface GoogleSignInResult {
  ok: boolean;
  error?: string;
}

function hasNativeGoogleAuth(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      window.KineticNativeAuth &&
      typeof window.KineticNativeAuth.startGoogleSignIn === 'function'
  );
}

function buildNativeGoogleOAuthUrl(): string {
  const nonce =
    Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  const redirectUri = `https://${firebaseConfig.authDomain}/__/auth/handler`;
  const clientId = firebaseConfig.oAuthClientId;

  return (
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=${encodeURIComponent('id_token token')}` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account` +
    `&nonce=${encodeURIComponent(nonce)}`
  );
}

function parseOAuthParamsFromUrl(callbackUrl: string): URLSearchParams {
  const hashIndex = callbackUrl.indexOf('#');
  const queryIndex = callbackUrl.indexOf('?');

  const fragmentPart = hashIndex >= 0 ? callbackUrl.slice(hashIndex + 1) : '';
  const queryPart =
    queryIndex >= 0
      ? callbackUrl.slice(
          queryIndex + 1,
          hashIndex >= 0 ? hashIndex : undefined
        )
      : '';

  const merged = new URLSearchParams(queryPart);
  const hashParams = new URLSearchParams(fragmentPart);
  hashParams.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}

function markOAuthPending(pending: boolean): void {
  try {
    if (pending) {
      localStorage.setItem(OAUTH_PENDING_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(OAUTH_PENDING_KEY);
      localStorage.removeItem(OAUTH_STASH_URL_KEY);
    }
  } catch {
    /* ignore quota */
  }
}

function isOAuthPending(): boolean {
  try {
    const raw = localStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return false;
    const started = Number(raw);
    if (
      !Number.isFinite(started) ||
      Date.now() - started > OAUTH_PENDING_MAX_AGE_MS
    ) {
      localStorage.removeItem(OAUTH_PENDING_KEY);
      localStorage.removeItem(OAUTH_STASH_URL_KEY);
      try {
        window.KineticNativeAuth?.clearPendingOAuth?.();
      } catch {
        /* ignore */
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Clear stuck CONECTANDO state (UI cancel / timeout). */
export function cancelGoogleSignInInFlight(reason?: string): void {
  markOAuthPending(false);
  try {
    window.KineticNativeAuth?.clearPendingOAuth?.();
  } catch {
    /* ignore */
  }
  try {
    window.__kineticHandleNativeOAuthCancel?.(
      reason || 'Login cancelado. Toque para tentar de novo.'
    );
  } catch {
    /* ignore */
  }
}

export function getOAuthPendingAgeMs(): number | null {
  try {
    const raw = localStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return null;
    const started = Number(raw);
    if (!Number.isFinite(started)) return null;
    return Math.max(0, Date.now() - started);
  } catch {
    return null;
  }
}

async function completeFirebaseCredentialFromUrl(
  callbackUrl: string
): Promise<GoogleSignInResult> {
  const params = parseOAuthParamsFromUrl(callbackUrl);
  const errorParam = params.get('error');
  if (errorParam) {
    return {
      ok: false,
      error: 'Acesso com Google cancelado ou negado pelo usuário.',
    };
  }

  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');
  if (!idToken && !accessToken) {
    return {
      ok: false,
      error: 'Não foi possível obter o token da conta Google. Tente novamente.',
    };
  }

  const credential = GoogleAuthProvider.credential(
    idToken || null,
    accessToken || null
  );
  await signInWithCredential(auth, credential);
  return { ok: true };
}

function pollNativePendingResult(): string {
  try {
    const fn = window.KineticNativeAuth?.pollPendingOAuthResult;
    if (typeof fn === 'function') {
      return fn.call(window.KineticNativeAuth) || '';
    }
  } catch {
    /* bridge may throw before ready */
  }
  try {
    return localStorage.getItem(OAUTH_STASH_URL_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Install durable window hooks so a MainActivity cold-start after Account Picker
 * can still finish OAuth from SharedPreferences / stashed URL.
 */
function installDurableOAuthHooks(
  onResult: (result: GoogleSignInResult) => void
): () => void {
  let settled = false;
  const finish = (result: GoogleSignInResult) => {
    if (settled) return;
    settled = true;
    markOAuthPending(false);
    try {
      window.KineticNativeAuth?.clearPendingOAuth?.();
    } catch {
      /* ignore */
    }
    delete window.__kineticHandleNativeOAuthRedirect;
    delete window.__kineticHandleNativeOAuthCancel;
    delete window.__kineticNotifyOAuthResume;
    delete window.__kineticStashOAuthUrl;
    onResult(result);
  };

  window.__kineticStashOAuthUrl = (callbackUrl: string) => {
    try {
      localStorage.setItem(OAUTH_STASH_URL_KEY, callbackUrl);
    } catch {
      /* ignore */
    }
  };

  window.__kineticHandleNativeOAuthRedirect = async (callbackUrl: string) => {
    try {
      const res = await completeFirebaseCredentialFromUrl(callbackUrl);
      finish(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      finish({
        ok: false,
        error: `Erro ao autenticar conta Google no Firebase: ${msg}`,
      });
    }
  };

  window.__kineticHandleNativeOAuthCancel = (reason?: string) => {
    finish({
      ok: false,
      error: reason || 'Janela de login do Google foi fechada.',
    });
  };

  window.__kineticNotifyOAuthResume = () => {
    // Native says OAuth activity still running / process resumed — keep waiting.
    markOAuthPending(true);
  };

  const tryConsumePending = () => {
    if (settled) return;
    const pending = pollNativePendingResult();
    if (!pending) return;
    if (pending === '__CANCELLED__') {
      window.__kineticHandleNativeOAuthCancel?.('Login com Google cancelado.');
      return;
    }
    void window.__kineticHandleNativeOAuthRedirect?.(pending);
  };

  const onVis = () => {
    if (document.visibilityState === 'visible') {
      tryConsumePending();
    }
  };
  const onFocus = () => tryConsumePending();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('focus', onFocus);
  // Immediate + delayed polls cover Capacitor bridge re-attach after resume.
  tryConsumePending();
  const t1 = window.setTimeout(tryConsumePending, 400);
  const t2 = window.setTimeout(tryConsumePending, 1200);
  const t3 = window.setTimeout(tryConsumePending, 2800);

  return () => {
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.clearTimeout(t3);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('focus', onFocus);
  };
}

/**
 * Call once on app boot: if OAuth was in flight when the process died, finish it.
 */
export function resumePendingGoogleSignInIfNeeded(): void {
  if (!hasNativeGoogleAuth()) return;
  if (!isOAuthPending()) {
    // Still poll native prefs — process death may have wiped localStorage timing.
    try {
      if (!window.KineticNativeAuth?.isOAuthInProgress?.()) {
        const stash = pollNativePendingResult();
        if (!stash || stash === '__CANCELLED__') return;
      }
    } catch {
      return;
    }
  }

  installDurableOAuthHooks(() => {
    /* result applied via Firebase onAuthStateChanged */
  });
}

export async function performGoogleSignIn(): Promise<GoogleSignInResult> {
  if (hasNativeGoogleAuth()) {
    const oauthUrl = buildNativeGoogleOAuthUrl();
    markOAuthPending(true);

    return new Promise<GoogleSignInResult>((resolve) => {
      let settled = false;
      const settle = (result: GoogleSignInResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        cleanup();
        markOAuthPending(false);
        resolve(result);
      };

      const cleanup = installDurableOAuthHooks((result) => {
        settle(result);
      });

      const timeoutId = window.setTimeout(() => {
        try {
          window.KineticNativeAuth?.clearPendingOAuth?.();
        } catch {
          /* ignore */
        }
        settle({
          ok: false,
          error:
            'Login Google expirou (90s). Toque em TENTAR DE NOVO — se a janela Google abriu, conclua ou cancele nela.',
        });
      }, NATIVE_SIGN_IN_TIMEOUT_MS);

      try {
        window.KineticNativeAuth!.startGoogleSignIn(oauthUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        settle({
          ok: false,
          error: `Falha ao abrir login Google nativo: ${msg}`,
        });
      }
    });
  }

  try {
    await signInWithPopup(auth, googleProvider);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendlyError = msg.includes('popup-closed')
      ? 'Janela de login do Google foi fechada.'
      : 'Não foi possível concluir o login com Google. Faça login com uma conta válida.';
    return { ok: false, error: friendlyError };
  }
}

export async function performGoogleSignOut(): Promise<void> {
  markOAuthPending(false);
  try {
    window.KineticNativeAuth?.clearPendingOAuth?.();
  } catch {
    /* ignore */
  }
  await signOut(auth);
}
