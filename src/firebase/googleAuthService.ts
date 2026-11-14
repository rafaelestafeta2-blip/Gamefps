import { Capacitor } from '@capacitor/core';
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth, firebaseConfig, googleProvider } from './firebaseClient';

declare global {
  interface Window {
    KineticNativeAuth?: {
      startGoogleSignIn: (oauthUrl: string) => void;
    };
    __kineticHandleNativeOAuthRedirect?: (callbackUrl: string) => void;
    __kineticHandleNativeOAuthCancel?: (reason?: string) => void;
  }
}

export interface GoogleSignInResult {
  ok: boolean;
  pendingRedirect?: boolean;
  error?: string;
}

function friendlyAuthError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code || '')
      : '';
  const msg = err instanceof Error ? err.message : String(err);
  const host = typeof location !== 'undefined' ? location.host : '';

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
    return 'Janela de login do Google foi fechada.';
  }
  if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
    return 'O navegador bloqueou a janela do Google.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `O Firebase bloqueou o login neste endereço (${host}). Abra o jogo pelo app ou pelo domínio publicado.`;
  }
  if (code === 'auth/network-request-failed') {
    return 'Sem rede para falar com o Google. Verifique a conexão e tente de novo.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/missing-or-invalid-nonce' ||
    code === 'auth/user-disabled'
  ) {
    return 'O Google devolveu um token que o Firebase não aceitou. Tente de novo.';
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return 'Este navegador não abre o popup do Google. Tentando entrar na mesma página.';
  }
  if (code) return `Falha no login Google (${code}).`;
  return 'Não foi possível concluir o login com Google. Faça login com uma conta válida.';
}

function shouldPreferRedirect(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: string }).code || '')
      : '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported' ||
    code === 'auth/cancelled-popup-request'
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

export async function performGoogleSignIn(): Promise<GoogleSignInResult> {
  if (
    typeof window !== 'undefined' &&
    window.KineticNativeAuth &&
    typeof window.KineticNativeAuth.startGoogleSignIn === 'function'
  ) {
    const oauthUrl = buildNativeGoogleOAuthUrl();

    return new Promise<GoogleSignInResult>((resolve) => {
      let settled = false;
      const finish = (result: GoogleSignInResult) => {
        if (settled) return;
        settled = true;
        delete window.__kineticHandleNativeOAuthRedirect;
        delete window.__kineticHandleNativeOAuthCancel;
        resolve(result);
      };

      window.__kineticHandleNativeOAuthRedirect = async (
        callbackUrl: string
      ) => {
        try {
          const params = parseOAuthParamsFromUrl(callbackUrl);
          const errorParam = params.get('error');
          if (errorParam) {
            finish({
              ok: false,
              error: 'Acesso com Google cancelado ou negado pelo usuário.',
            });
            return;
          }

          const idToken = params.get('id_token');
          const accessToken = params.get('access_token');
          if (!idToken && !accessToken) {
            finish({
              ok: false,
              error:
                'Não foi possível obter o token da conta Google. Tente novamente.',
            });
            return;
          }

          // O id_token deste fluxo traz um nonce que o Firebase não emitiu e
          // rejeita com auth/invalid-credential. O access_token entra direto.
          const credential = accessToken
            ? GoogleAuthProvider.credential(null, accessToken)
            : GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          finish({ ok: true });
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

      window.KineticNativeAuth!.startGoogleSignIn(oauthUrl);
    });
  }

  const nativeShell = Capacitor.isNativePlatform();
  if (nativeShell) {
    return {
      ok: false,
      error:
        'O login nativo do app não iniciou. Feche o jogo, abra de novo e tente Entrar com Google.',
    };
  }

  try {
    await signInWithPopup(auth, googleProvider);
    return { ok: true };
  } catch (err) {
    if (!shouldPreferRedirect(err)) {
      return { ok: false, error: friendlyAuthError(err) };
    }
    try {
      await signInWithRedirect(auth, googleProvider);
      return { ok: false, pendingRedirect: true };
    } catch (redirectErr) {
      return { ok: false, error: friendlyAuthError(redirectErr) };
    }
  }
}

/** Completa o login depois que o Google devolve o usuário para o jogo. */
export async function completePendingGoogleRedirect(): Promise<GoogleSignInResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) return { ok: true };
    return null;
  } catch (err) {
    return { ok: false, error: friendlyAuthError(err) };
  }
}

export async function performGoogleSignOut(): Promise<void> {
  await signOut(auth);
}
