import React, { useEffect, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  CloudSyncState,
  getCloudSyncState,
  signInWithGoogleAccount,
  signOutGoogleAccount,
  subscribePlayerProfile,
} from '../firebase/playerCloudSync';
import { mobileHardware } from '../mobile/nativeHardware';
import { MenuBackground } from './MenuBackground';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface AuthLoginScreenProps {
  onContinueToMenu: () => void;
}

export const AuthLoginScreen: React.FC<AuthLoginScreenProps> = ({
  onContinueToMenu,
}) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(() =>
    getCloudSyncState()
  );
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    soundEngine.playMenuMusic();
    const unsub = subscribePlayerProfile((next) => {
      setSyncState(next);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleGoogleLogin = async () => {
    soundEngine.playMenuSelect();
    soundEngine.playMenuMusic();
    void mobileHardware.enterFullscreenLandscape();
    setSigningIn(true);
    const ok = await signInWithGoogleAccount();
    setSigningIn(false);
    if (ok) {
      soundEngine.playMenuSelect();
      onContinueToMenu();
    }
  };

  const handleEnterCommand = () => {
    if (!syncState.isGoogleLinked) return;
    soundEngine.playMenuSelect();
    soundEngine.playMenuMusic();
    void mobileHardware.enterFullscreenLandscape();
    onContinueToMenu();
  };

  const handleSwitchAccount = async () => {
    soundEngine.playMenuSelect();
    await signOutGoogleAccount();
  };

  const { profile, isGoogleLinked, isSyncing, syncError } = syncState;
  const totalCash = profile.playerCash;

  return (
    <div
      onClick={() => {
        soundEngine.playMenuMusic();
      }}
      className="fixed inset-0 z-50 bg-[#06080c] select-none text-white flex flex-col justify-between overflow-hidden font-sans"
    >
      {/* 1. Fundo do Menu com Soldado Tático + Fumaça Volumétrica + Música Tema */}
      <MenuBackground />

      {/* Vinheta Escura para Foco Central no Terminal */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/90 pointer-events-none z-10" />

      {/* 2. Barra Superior com Status de Conexão */}
      <header className="relative z-20 w-full px-3 sm:px-6 py-2 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-3 bg-amber-500 rounded-xs shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
          <span className="font-mono text-[9px] sm:text-xs tracking-wider uppercase text-slate-300">
            KINETIC CLOUD · FIREBASE FIRESTORE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isGoogleLinked
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="font-mono text-[9px] sm:text-xs tracking-wider uppercase text-slate-300">
            {isGoogleLinked ? 'CONTA VINCULADA' : 'AUTENTICAÇÃO TÁTICA'}
          </span>
        </div>
      </header>

      {/* 3. Card Central: Logotipo Compacto KINETIC + Terminal de Login */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-3 py-1 overflow-y-auto">
        <div className="w-full max-w-sm sm:max-w-md bg-[#0a0e16]/95 border border-amber-500/40 rounded-xl p-3.5 sm:p-5 shadow-[0_16px_60px_rgba(0,0,0,0.95)] backdrop-blur-xl max-h-[88vh] overflow-y-auto">
          {/* Apresentação KINETIC Compacta e Tática */}
          <div className="text-center border-b border-white/10 pb-2.5 mb-2.5">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400/25 via-amber-600/15 to-transparent border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)] mb-1.5">
              <svg viewBox="0 0 40 40" className="w-5 h-5 text-amber-400" fill="none">
                <path
                  d="M20 4L34 11V22C34 29.5 28 35.5 20 38C12 35.5 6 29.5 6 22V11L20 4Z"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 18L18.5 22.5L26 15"
                  stroke="#fbbf24"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-[0.14em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-400 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
              KINETIC
            </h1>
            <div className="text-[9px] font-mono tracking-[0.24em] uppercase text-amber-300 font-bold">
              TACTICAL STRIKE · ONLINE FPS
            </div>
            <p className="font-mono text-[9.5px] text-slate-400 mt-1 max-w-xs mx-auto leading-tight">
              Faça login com a Conta Google para salvar seu nome único, patente, saldo inicial de 3.000 e arsenal na nuvem.
            </p>
          </div>

          {isGoogleLinked ? (
            /* Estado Conectado: Resumo do Operador com Badge de ID Único */
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.04] border border-emerald-500/40">
                <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-amber-400 bg-slate-800 shrink-0 flex items-center justify-center shadow-md">
                  {profile.avatarDataUrl ? (
                    <img
                      src={profile.avatarDataUrl}
                      alt={profile.callsign}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="font-display font-black text-base text-amber-300">
                      {profile.callsign.slice(0, 2)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-black text-sm text-white truncate">
                      {profile.callsign}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 font-mono text-[8px] font-bold text-emerald-300 uppercase">
                      ID SALVO
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <WarfaceRankIcon
                        level={profile.rankLevel}
                        className="w-3.5 h-3.5"
                      />
                      <span className="font-mono text-[9px] font-bold text-amber-300">
                        NÍV. {profile.rankLevel} · {profile.rankTitle}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] font-bold text-emerald-300">
                      ${totalCash.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid Resumo Compacto */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-white/[0.03] border border-white/10 rounded-md py-1.5 px-1">
                  <div className="font-display font-black text-xs text-amber-300">
                    {profile.unlockedWeapons.length} / 9
                  </div>
                  <div className="font-mono text-[8px] text-slate-400 uppercase">
                    ARMAS
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-md py-1.5 px-1">
                  <div className="font-display font-black text-xs text-sky-300">
                    {profile.totalKills}
                  </div>
                  <div className="font-mono text-[8px] text-slate-400 uppercase">
                    ABATES
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-md py-1.5 px-1">
                  <div className="font-display font-black text-xs text-emerald-300">
                    {profile.unlockedAchievements.length} / 12
                  </div>
                  <div className="font-mono text-[8px] text-slate-400 uppercase">
                    MEDALHAS
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEnterCommand}
                className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:brightness-110 text-slate-950 font-display font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_18px_rgba(245,158,11,0.5)] active:scale-[0.99] transition-all cursor-pointer"
              >
                ENTRAR NO MENU PRINCIPAL ▶
              </button>

              <button
                type="button"
                onClick={handleSwitchAccount}
                className="w-full py-0.5 text-center font-mono text-[9px] text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                TROCAR DE CONTA GOOGLE
              </button>
            </div>
          ) : (
            /* Estado Não Conectado: Botão Google + Opção Convidado */
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5 text-left">
                {[
                  { icon: '🆔', title: 'ID de Nome Único', desc: 'Nome exclusivo na rede' },
                  { icon: '💰', title: '$3.000 Inicial', desc: 'Saldo tático para armas' },
                  { icon: '🎖️', title: 'Patente & XP', desc: 'Salvo em partidas oficiais' },
                  { icon: '📸', title: 'Dossiê Tático', desc: 'Foto e medalhas salvas' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-1.5 p-1.5 rounded-md bg-white/[0.03] border border-white/10"
                  >
                    <span className="text-xs">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-[9.5px] text-white uppercase truncate">
                        {item.title}
                      </div>
                      <div className="font-mono text-[8px] text-slate-400 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {syncError && (
                <div className="p-2 rounded-md bg-red-500/15 border border-red-500/40 font-mono text-[10px] text-red-200 text-center">
                  {syncError}
                </div>
              )}

              <button
                type="button"
                disabled={signingIn || isSyncing}
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-display font-black text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center gap-2.5 shadow-[0_0_18px_rgba(255,255,255,0.25)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.4 7.4 23 12 23z"
                  />
                </svg>
                <span>
                  {signingIn || isSyncing
                    ? 'CONECTANDO...'
                    : 'ENTRAR COM GOOGLE'}
                </span>
              </button>

              <div className="py-1 px-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-center font-mono text-[8.5px] font-bold text-amber-300 uppercase tracking-wider">
                🔒 ACESSO EXCLUSIVO COM CONTA GOOGLE REAL
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. Rodapé */}
      <footer className="relative z-20 w-full px-6 py-2 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase border-t border-white/10 bg-black/40">
        <span>KINETIC CLOUD SYNC · FIREBASE AUTHENTICATION</span>
        <span>MÚSICA TEMA ATIVA · V0.0.9</span>
      </footer>
    </div>
  );
};
