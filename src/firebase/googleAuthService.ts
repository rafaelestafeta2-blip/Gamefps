import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
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
  error?: string;
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

          const credential = GoogleAuthProvider.credential(
            idToken || null,
            accessToken || null
          );
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
  await signOut(auth);
}
