import React from 'react';
import {
  DirectChatMessage,
  FriendEntry,
  removeFriend,
} from '../firebase/friendsSocialService';
import { PlayerCloudProfile } from '../firebase/playerCloudSync';
import { getRankForXp } from '../progression/ranks';
import { WarfaceRankIcon } from './WarfaceRankIcon';
import { WeaponVisualCard } from './WeaponVisualCard';

interface FriendChatAndProfilePanelProps {
  myUid: string;
  selectedFriend: FriendEntry | null;
  rightPanelMode: 'CHAT' | 'PROFILE';
  onSetRightPanelMode: (mode: 'CHAT' | 'PROFILE') => void;
  onInspectProfile: (friend: FriendEntry) => void;
  chatMessages: DirectChatMessage[];
  chatInput: string;
  onChangeChatInput: (val: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  inspectedProfile: PlayerCloudProfile | null;
  loadingProfile: boolean;
}

export const FriendChatAndProfilePanel: React.FC<FriendChatAndProfilePanelProps> = ({
  myUid,
  selectedFriend,
  rightPanelMode,
  onSetRightPanelMode,
  onInspectProfile,
  chatMessages,
  chatInput,
  onChangeChatInput,
  onSendChat,
  inspectedProfile,
  loadingProfile,
}) => {
  if (!selectedFriend) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <div className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
          SELECIONE UM AMIGO NA LISTA
        </div>
        <p className="text-xs max-w-xs">
          Clique em <b>💬 CHAT</b> para enviar mensagens em tempo real, <b>PERFIL</b> para inspecionar estatísticas e armas desbloqueadas, ou <b>CONVIDAR</b> para jogar 5v5.
        </p>
      </div>
    );
  }

  if (rightPanelMode === 'CHAT') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 bg-black/50 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-white">
              CHAT DIRETO: {selectedFriend.callsign}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onInspectProfile(selectedFriend)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase text-amber-300 cursor-pointer"
            >
              👁️ VER PERFIL DE {selectedFriend.callsign}
            </button>
            <button
              type="button"
              onClick={() => void removeFriend(selectedFriend.uid)}
              className="px-2 py-0.5 rounded bg-red-500/15 hover:bg-red-500/30 text-[10px] text-red-300 cursor-pointer"
            >
              REMOVER
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatMessages.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 italic">
              Nenhuma mensagem ainda. Envie um &quot;Bora partida 5v5!&quot; abaixo.
            </div>
          ) : (
            chatMessages.map((m) => {
              const isMe = m.senderUid === myUid;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-1.5 rounded-lg text-xs ${
                      isMe
                        ? 'bg-amber-500/25 border border-amber-400/50 text-white'
                        : 'bg-slate-800/90 border border-white/10 text-slate-100'
                    }`}
                  >
                    <div className="text-[9px] font-mono text-amber-300/90 mb-0.5">
                      {m.senderCallsign}
                    </div>
                    <div>{m.text}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={onSendChat}
          className="p-2.5 bg-black/60 border-t border-white/10 flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChangeChatInput(e.target.value)}
            placeholder={`Mensagem para ${selectedFriend.callsign}...`}
            className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold uppercase tracking-wider cursor-pointer"
          >
            ENVIAR
          </button>
        </form>
      </div>
    );
  }

  const inspectedKd = inspectedProfile
    ? (inspectedProfile.totalKills / Math.max(1, inspectedProfile.totalDeaths)).toFixed(2)
    : '1.00';
  const inspectedWinRate = inspectedProfile
    ? Math.round((inspectedProfile.matchesWon / Math.max(1, inspectedProfile.matchesPlayed)) * 100)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2.5">
          <WarfaceRankIcon
            level={inspectedProfile?.rankLevel || selectedFriend.rankLevel || 1}
            className="w-8 h-8"
          />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
              DOSSIÊ DE {inspectedProfile?.callsign || selectedFriend.callsign}
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              {inspectedProfile
                ? getRankForXp(inspectedProfile.playerXp).title
                : `NÍVEL ${selectedFriend.rankLevel}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSetRightPanelMode('CHAT')}
          className="px-2.5 py-1 rounded bg-sky-500/20 border border-sky-400/50 text-[10px] font-bold text-sky-200 uppercase cursor-pointer"
        >
          💬 VOLTAR AO CHAT
        </button>
      </div>

      {loadingProfile ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Carregando dossiê completo do operador...
        </div>
      ) : !inspectedProfile ? (
        <div className="py-10 text-center text-xs text-slate-400">
          Perfil detalhado indisponível no momento.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 rounded bg-black/50 border border-white/10">
              <div className="text-[9px] text-slate-400 uppercase">RATIO K/D</div>
              <div className="text-sm font-extrabold text-amber-300 font-mono">{inspectedKd}</div>
            </div>
            <div className="p-2 rounded bg-black/50 border border-white/10">
              <div className="text-[9px] text-slate-400 uppercase">WIN %</div>
              <div className="text-sm font-extrabold text-emerald-300 font-mono">
                {inspectedWinRate}%
              </div>
            </div>
            <div className="p-2 rounded bg-black/50 border border-white/10">
              <div className="text-[9px] text-slate-400 uppercase">ABATES</div>
              <div className="text-sm font-extrabold text-white font-mono">
                {inspectedProfile.totalKills}
              </div>
            </div>
            <div className="p-2 rounded bg-black/50 border border-white/10">
              <div className="text-[9px] text-slate-400 uppercase">HEADSHOTS</div>
              <div className="text-sm font-extrabold text-sky-300 font-mono">
                {inspectedProfile.totalHeadshots}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">
              COLEÇÃO DE ARMAS DE {inspectedProfile.callsign}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  'M4_CARBINE',
                  'SMG_45',
                  'AK47_RIFLE',
                  'CARBINE_AR',
                  'SNIPER_TACTICAL',
                  'L49_LMG',
                ] as const
              ).map((wId) => {
                const isUnlocked = Boolean(inspectedProfile.unlockedWeapons?.includes(wId));
                return (
                  <WeaponVisualCard
                    key={wId}
                    weaponId={wId}
                    unlocked={isUnlocked}
                    isEquipped={inspectedProfile.activeWeapon === wId}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
