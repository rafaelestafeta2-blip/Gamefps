import React, { useRef, useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  CloudSyncState,
  compressAvatarFileToDataUrl,
  resetPlayerAccountEntirely,
  signOutGoogleAccount,
  updatePlayerCallsignAndAvatar,
} from '../firebase/playerCloudSync';
import { PlayerProfileAchievementsRow } from './PlayerProfileAchievementsRow';
import { PlayerProfileClassificationCard } from './PlayerProfileClassificationCard';
import { PlayerProfileCombatStatsCard } from './PlayerProfileCombatStatsCard';
import { PlayerProfileHeaderCard } from './PlayerProfileHeaderCard';
import { PlayerProfileUnlockedWeaponsGrid } from './PlayerProfileUnlockedWeaponsGrid';
import { WarfaceRankIcon } from './WarfaceRankIcon';

interface PlayerProfileModalProps {
  syncState: CloudSyncState;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  syncState,
  onClose,
}) => {
  const { profile, isGoogleLinked } = syncState;
  const [activeTab, setActiveTab] = useState<'PROFILE_CARD' | 'CUSTOMIZE'>('PROFILE_CARD');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [callsignInput, setCallsignInput] = useState(profile.callsign);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarDataUrl);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resettingAccount, setResettingAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setStatusMessage('Otimizando e salvando sua foto no Firebase...');
    try {
      const compressedDataUrl = await compressAvatarFileToDataUrl(file, 160);
      setAvatarPreview(compressedDataUrl);
      await updatePlayerCallsignAndAvatar(callsignInput, compressedDataUrl);
      soundEngine.playMenuSelect();
      setStatusMessage('Foto de perfil atualizada e salva na nuvem com sucesso!');
    } catch {
      setStatusMessage('Erro ao processar imagem. Tente outro arquivo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveIdentity = async () => {
    soundEngine.playMenuSelect();
    setStatusMessage('Verificando disponibilidade do Callsign único no Firebase...');
    const res = await updatePlayerCallsignAndAvatar(callsignInput, avatarPreview);
    if (!res.success) {
      soundEngine.playImpact('TORSO');
      setStatusMessage(`❌ ${res.error || 'Erro ao registrar nome único.'}`);
      return;
    }
    soundEngine.playMenuSelect();
    setStatusMessage('✅ Callsign exclusivo registrado! Seu nome foi bloqueado permanentemente.');
  };

  const handleResetEntireAccount = async () => {
    if (!window.confirm('Atenção: Deseja zerar sua conta e começar com 3.000 K-Money e Nível 1?')) return;
    setResettingAccount(true);
    soundEngine.playMenuSelect();
    await resetPlayerAccountEntirely();
    setResettingAccount(false);
    setStatusMessage('✅ Conta zerada com sucesso! Você agora possui $3.000 K-Money e Nível 1.');
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-[#06080c]/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden text-white font-sans select-none"
    >
      {/* 1. Barra de Topo AAA: < PERFIL DO JOGADOR + Nível e Botão Fechar */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-2.5 flex items-center justify-between border-b border-white/10 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playMenuSelect();
              onClose();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <span className="font-mono text-xs">‹</span>
            <span className="font-display font-black text-xs uppercase tracking-wider">
              PERFIL DO JOGADOR
            </span>
          </button>
          <span className="hidden sm:inline-block font-mono text-[10px] text-emerald-400">
            {isGoogleLinked ? 'CLOUD PROFILE SINCRONIZADO' : 'CONTA GOOGLE REQUERIDA'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de Nível com Brasão Dourado */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
            <WarfaceRankIcon level={profile.rankLevel} className="w-4 h-4" />
            <span className="font-mono text-xs font-bold text-amber-300">
              {profile.rankLevel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playMenuSelect();
              onClose();
            }}
            className="px-3 py-1 rounded-md bg-white/10 hover:bg-red-500/25 border border-white/15 hover:border-red-400/50 font-mono text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
          >
            FECHAR ✕
          </button>
        </div>
      </header>

      {/* 2. Conteúdo Central Scrollável no Layout Exato da Imagem de Referência */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-2 overflow-y-auto space-y-3">
        {/* Subheader: Cartão de Identidade, MVP 3 Estrelas e Soldado */}
        <PlayerProfileHeaderCard
          profile={profile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenEditPhotoOrName={() => setIsEditModalOpen(true)}
        />

        {/* Grade Central de 3 Colunas: CLASSIFICAÇÃO / ESTATÍSTICAS / ARMAS DESBLOQUEADAS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          <div className="md:col-span-4 min-h-[320px]">
            <PlayerProfileClassificationCard profile={profile} />
          </div>
          <div className="md:col-span-4 min-h-[320px]">
            <PlayerProfileCombatStatsCard profile={profile} />
          </div>
          <div className="md:col-span-4 min-h-[320px]">
            <PlayerProfileUnlockedWeaponsGrid profile={profile} />
          </div>
        </div>

        {/* Seção Inferior: CONQUISTAS */}
        <PlayerProfileAchievementsRow unlockedIds={profile.unlockedAchievements} />
      </main>

      {/* 3. Rodapé Tático */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-1.5 flex items-center justify-between font-mono text-[9px] text-slate-400 border-t border-white/10 bg-black/60 shrink-0">
        <span>KINETIC TACTICAL DOSSIER · FIREBASE FIRESTORE</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playMenuSelect();
              onClose();
              void signOutGoogleAccount();
            }}
            className="text-amber-400 hover:text-amber-300 underline uppercase tracking-wider cursor-pointer"
          >
            TROCAR CONTA / SAIR
          </button>
          <button
            type="button"
            onClick={handleResetEntireAccount}
            disabled={resettingAccount}
            className="text-red-400 hover:text-red-300 underline uppercase tracking-wider cursor-pointer"
          >
            {resettingAccount ? 'ZERANDO...' : 'ZERAR CONTA ($3.000 INICIAL)'}
          </button>
        </div>
      </footer>

      {/* Modal Secundário de Customização de Foto e Nome Único */}
      {isEditModalOpen && (
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0d121c] border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-black text-base text-white tracking-wider uppercase">
                CUSTOMIZAÇÃO DO OPERADOR
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Foto de Perfil */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-400 bg-slate-900 shrink-0 flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <WarfaceRankIcon level={profile.rankLevel} className="w-10 h-10" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 font-mono text-xs font-bold text-amber-300 uppercase cursor-pointer"
                >
                  {uploadingPhoto ? 'CARREGANDO...' : 'FAZER UPLOAD DE FOTO'}
                </button>
                <p className="font-mono text-[9px] text-slate-400">
                  PNG, JPG ou WEBP (salvo no Firebase)
                </p>
              </div>
            </div>

            {/* Nome de Usuário / Callsign Único */}
            <div className="space-y-1.5">
              <label className="font-mono text-xs text-slate-300 font-bold uppercase flex justify-between">
                <span>NOME / CALLSIGN ÚNICO</span>
                {profile.callsignLocked && (
                  <span className="text-amber-400 font-mono text-[10px]">🔒 NOME BLOQUEADO</span>
                )}
              </label>
              <input
                type="text"
                value={callsignInput}
                onChange={(e) => setCallsignInput(e.target.value.toUpperCase().slice(0, 24))}
                disabled={Boolean(profile.callsignLocked)}
                placeholder="SEU NOME DE GUERRA"
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 font-mono text-sm text-white uppercase focus:border-amber-400 focus:outline-none disabled:opacity-50"
              />
              <p className="font-mono text-[9px] text-slate-400">
                Uma vez registrado, o nome torna-se exclusivo e não pode ser duplicado por outro jogador.
              </p>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-slate-200">
                {statusMessage}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveIdentity}
                disabled={Boolean(profile.callsignLocked && avatarPreview === profile.avatarDataUrl)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-display font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                SALVAR ALTERAÇÕES
              </button>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-mono text-xs uppercase cursor-pointer"
              >
                CONCLUÍDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
