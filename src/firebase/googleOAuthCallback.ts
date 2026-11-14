export interface CreateAuthUriResponse {
  authUri: string;
  sessionId: string;
}

export interface IdpSignInResponse {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  localId?: string;
  oauthIdToken?: string;
  oauthAccessToken?: string;
  error?: { message?: string };
}

export type ParsedGoogleCallback =
  | { kind: 'code'; requestUri: string }
  | { kind: 'id_token'; idToken: string; accessToken: string | null }
  | { kind: 'error'; message: string };

const HANDLER_PATH = '/__/auth/handler';

export function googleRedirectUri(authDomain: string): string {
  return `https://${authDomain}${HANDLER_PATH}`;
}

export function parseOAuthParamsFromUrl(callbackUrl: string): URLSearchParams {
  const trimmed = callbackUrl.trim();
  const hashIndex = trimmed.indexOf('#');
  const queryIndex = trimmed.indexOf('?');

  const fragmentPart = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : '';
  const queryPart =
    queryIndex >= 0
      ? trimmed.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
      : '';

  const merged = new URLSearchParams(queryPart);
  const hashParams = new URLSearchParams(fragmentPart);
  hashParams.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}

export function interpretGoogleCallback(
  raw: string,
  authDomain: string
): ParsedGoogleCallback {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: 'error', message: 'Cole o endereço completo da página de login.' };
  }

  const looksLikeUrl =
    trimmed.includes('://') || trimmed.includes('code=') || trimmed.includes('id_token=') || trimmed.includes('error=');

  if (!looksLikeUrl) {
    const compact = trimmed.replace(/\s+/g, '');
    if (compact.length < 8) {
      return { kind: 'error', message: 'Esse texto não é um retorno de login do Google.' };
    }
    return {
      kind: 'code',
      requestUri: `${googleRedirectUri(authDomain)}?${new URLSearchParams({
        code: compact,
      }).toString()}`,
    };
  }

  const params = parseOAuthParamsFromUrl(trimmed);
  const errorParam = params.get('error');
  if (errorParam) {
    const description = params.get('error_description');
    return {
      kind: 'error',
      message: description
        ? `Acesso com Google negado (${errorParam}): ${description}`
        : `Acesso com Google cancelado ou negado (${errorParam}).`,
    };
  }

  const idToken = params.get('id_token');
  if (idToken) {
    return {
      kind: 'id_token',
      idToken,
      accessToken: params.get('access_token'),
    };
  }

  const code = params.get('code');
  if (!code) {
    return {
      kind: 'error',
      message:
        'Esse endereço não tem o código do Google. Copie a URL inteira da página que abre depois do login.',
    };
  }

  const requestUri = trimmed.includes('://')
    ? trimmed.split('#')[0]
    : `${googleRedirectUri(authDomain)}?${new URLSearchParams({ code }).toString()}`;

  return { kind: 'code', requestUri };
}

export function idpErrorMessage(payload: IdpSignInResponse, status: number): string {
  const raw = payload.error?.message || `HTTP ${status}`;
  if (raw.includes('invalid_grant') || raw.includes('INVALID_IDP_RESPONSE')) {
    return 'O Google recusou esse código. Volte e entre de novo. (' + shorten(raw) + ')';
  }
  if (raw.includes('MISSING_SESSION_INFO') || raw.includes('INVALID_SESSION_ID') || raw.includes('MISSING_OR_INVALID_NONCE')) {
    return 'A sessão do login expirou. Toque em Entrar com Google de novo. (' + shorten(raw) + ')';
  }
  return `Não foi possível concluir o login com Google. (${shorten(raw)})`;
}

function shorten(value: string): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > 180 ? `${oneLine.slice(0, 177)}...` : oneLine;
}
