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

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

function googleRedirectUri(): string {
  return `https://${firebaseConfig.authDomain}/__/auth/handler`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = base64UrlEncode(bytes);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge };
}

async function buildNativeGoogleOAuthUrl(): Promise<{
  url: string;
  verifier: string;
}> {
  const { verifier, challenge } = await createPkcePair();
  const nonce =
    Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  const redirectUri = googleRedirectUri();
  const clientId = firebaseConfig.oAuthClientId;

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&nonce=${encodeURIComponent(nonce)}`;

  return { url, verifier };
}

export function parseOAuthParamsFromUrl(callbackUrl: string): URLSearchParams {
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

function oauthDeniedMessage(params: URLSearchParams): string {
  const code = params.get('error') || 'erro';
  const description = params.get('error_description');
  if (description) {
    return `Acesso com Google negado (${code}): ${description}`;
  }
  return `Acesso com Google cancelado ou negado (${code}).`;
}

async function exchangeAuthCodeForTokens(
  code: string,
  verifier: string
): Promise<{ idToken: string | null; accessToken: string | null }> {
  const body = new URLSearchParams({
    code,
    client_id: firebaseConfig.oAuthClientId,
    redirect_uri: googleRedirectUri(),
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const payload = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || payload.error) {
    const detail =
      payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return {
    idToken: payload.id_token || null,
    accessToken: payload.access_token || null,
  };
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
    return 'Janela de login do Google foi fechada. (auth/popup-closed-by-user)';
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'O navegador bloqueou a janela de login do Google. (auth/popup-blocked)';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'O login com Google foi interrompido. (auth/cancelled-popup-request)';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Este endereço não está autorizado no Firebase. (auth/unauthorized-domain)';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Login com Google está desligado no Firebase. (auth/operation-not-allowed)';
  }
  if (code === 'auth/network-request-failed') {
    return 'Sem conexão para concluir o login com Google. (auth/network-request-failed)';
  }
  if (code) {
    return `Não foi possível concluir o login com Google. (${code})`;
  }
  return 'Não foi possível concluir o login com Google. Faça login com uma conta válida.';
}

export async function performGoogleSignIn(): Promise<GoogleSignInResult> {
  if (
    typeof window !== 'undefined' &&
    window.KineticNativeAuth &&
    typeof window.KineticNativeAuth.startGoogleSignIn === 'function'
  ) {
    const { url: oauthUrl, verifier } = await buildNativeGoogleOAuthUrl();

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
              error: oauthDeniedMessage(params),
            });
            return;
          }

          let idToken = params.get('id_token');
          let accessToken = params.get('access_token');
          const code = params.get('code');
          if (code) {
            const exchanged = await exchangeAuthCodeForTokens(code, verifier);
            idToken = exchanged.idToken;
            accessToken = exchanged.accessToken;
          }

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
    return { ok: false, error: popupErrorMessage(err) };
  }
}

export async function performGoogleSignOut(): Promise<void> {
  await signOut(auth);
}
