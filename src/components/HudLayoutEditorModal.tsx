import React, { useRef, useState } from 'react';
import {
  ControlSettings,
  CustomHudLayout,
  HUD_BUTTON_LABELS,
  HudButtonId,
  HudLayoutPresetId,
  getPresetHudLayout,
} from '../controls/hudLayoutSettings';

interface HudLayoutEditorModalProps {
  controlSettings: ControlSettings;
  onSaveControlSettings: (next: ControlSettings) => void;
  onClose: () => void;
}

const BUTTON_SHORT_ICONS: Record<HudButtonId, { label: string; sizePx: number; isPrimary?: boolean }> = {
  joystick: { label: 'MOVER', sizePx: 112 },
  fire: { label: 'ATIRAR', sizePx: 80, isPrimary: true },
  leftFire: { label: 'TIRO ESQ', sizePx: 68, isPrimary: true },
  ads: { label: 'MIRA', sizePx: 52 },
  jump: { label: 'PULAR', sizePx: 52 },
  crouch: { label: 'AGACHAR', sizePx: 52 },
  reload: { label: 'RECARGA', sizePx: 48 },
  contextual: { label: 'ZOOM/FÔLEGO', sizePx: 46 },
};

export const HudLayoutEditorModal: React.FC<HudLayoutEditorModalProps> = ({
  controlSettings,
  onSaveControlSettings,
  onClose,
}) => {
  const [draftLayout, setDraftLayout] = useState<CustomHudLayout>(() => ({
    ...controlSettings.hudLayout,
  }));
  const [draftPreset, setDraftPreset] = useState<HudLayoutPresetId | 'CUSTOM'>(
    controlSettings.layoutPreset
  );
  const [leftFireEnabled, setLeftFireEnabled] = useState<boolean>(
    controlSettings.leftFireButtonEnabled
  );
  const [selectedId, setSelectedId] = useState<HudButtonId>('fire');
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{
    id: HudButtonId;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const selectedPlacement = draftLayout[selectedId];

  const updateSelected = (patch: Partial<{ scale: number; opacity: number }>) => {
    setDraftPreset('CUSTOM');
    setDraftLayout((prev) => ({
      ...prev,
      [selectedId]: {
        ...prev[selectedId],
        ...patch,
      },
    }));
  };

  const handleApplyPreset = (preset: HudLayoutPresetId) => {
    setDraftPreset(preset);
    setDraftLayout(getPresetHudLayout(preset));
  };

  const handlePointerDownItem = (
    id: HudButtonId,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(id);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const item = draftLayout[id];
    const itemPxX = (item.xPercent / 100) * rect.width;
    const itemPxY = (item.yPercent / 100) * rect.height;

    draggingRef.current = {
      id,
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left - itemPxX,
      offsetY: e.clientY - rect.top - itemPxY,
    };
  };

  const handlePointerMoveItem = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const newX = ((e.clientX - rect.left - drag.offsetX) / rect.width) * 100;
    const newY = ((e.clientY - rect.top - drag.offsetY) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, Math.round(newX * 10) / 10));
    const clampedY = Math.max(7, Math.min(93, Math.round(newY * 10) / 10));

    setDraftPreset('CUSTOM');
    setDraftLayout((prev) => ({
      ...prev,
      [drag.id]: {
        ...prev[drag.id],
        xPercent: clampedX,
        yPercent: clampedY,
      },
    }));
  };

  const handlePointerUpItem = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current?.pointerId === e.pointerId) {
      draggingRef.current = null;
    }
  };

  const handleSaveAndExit = () => {
    onSaveControlSettings({
      ...controlSettings,
      leftFireButtonEnabled: leftFireEnabled,
      layoutPreset: draftPreset,
      hudLayout: draftLayout,
    });
    onClose();
  };

  const allIds: HudButtonId[] = [
    'joystick',
    'fire',
    ...(leftFireEnabled ? (['leftFire'] as HudButtonId[]) : []),
    'ads',
    'jump',
    'crouch',
    'reload',
    'contextual',
  ];

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: 'none' }}
      className="fixed inset-0 z-[80] bg-[#060911]/95 select-none overflow-hidden font-sans pointer-events-auto"
    >
      {/* Tactical Blueprint Alignment Grid & Crosshair */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(245,158,11,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.14) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-amber-400/20 pointer-events-none" />
      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-amber-400/20 pointer-events-none" />
      <div className="absolute inset-3 border border-dashed border-white/15 rounded-xl pointer-events-none" />

      {/* Center Reticle Reference */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border border-white/25 flex items-center justify-center pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
      </div>

      {/* Floating Inspector Toolbar (Call of Duty Mobile / PUBG Style) */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-[540px] bg-[#0b1019]/95 border border-amber-500/45 rounded-xl px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-3.5 bg-amber-500 rounded-xs" />
            <span className="text-[11px] font-display font-black tracking-wider text-amber-400 uppercase">
              EDITOR DE HUD · {HUD_BUTTON_LABELS[selectedId]}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPanelCollapsed((p) => !p)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 text-[10px] font-mono text-slate-300 cursor-pointer"
            >
              {panelCollapsed ? 'Expandir ▼' : 'Minimizar ▲'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('TWO_THUMBS')}
              className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-[10px] font-mono font-bold text-red-300 cursor-pointer"
            >
              Resetar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/15 text-[10px] font-mono text-slate-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAndExit}
              className="px-3 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-[10px] font-display font-black text-slate-950 uppercase tracking-wider cursor-pointer shadow-sm"
            >
              Salvar HUD
            </button>
          </div>
        </div>

        {!panelCollapsed && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
            {/* Presets Row + 2nd Fire Button Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                {(
                  [
                    ['TWO_THUMBS', '2 Dedos'],
                    ['THREE_FINGER_CLAW', '3 Dedos Claw'],
                    ['FOUR_FINGER_CLAW', '4 Dedos Pro'],
                  ] as [HudLayoutPresetId, string][]
                ).map(([presetId, label]) => (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => handleApplyPreset(presetId)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      draftPreset === presetId
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-900 text-slate-300 border-white/15 hover:border-amber-400/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setLeftFireEnabled((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border cursor-pointer ${
                  leftFireEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                2º Botão de Tiro: {leftFireEnabled ? 'ATIVO' : 'OCULTO'}
              </button>
            </div>

            {/* Scale & Opacity Sliders for Selected Button */}
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div className="bg-black/45 border border-white/10 rounded-lg px-2.5 py-1.5">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>TAMANHO DO BOTÃO</span>
                  <span className="text-amber-400 font-bold tabular-nums">
                    {Math.round(selectedPlacement.scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.05}
                  value={selectedPlacement.scale}
                  onChange={(e) =>
                    updateSelected({ scale: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-black/45 border border-white/10 rounded-lg px-2.5 py-1.5">
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>TRANSPARÊNCIA</span>
                  <span className="text-amber-400 font-bold tabular-nums">
                    {Math.round(selectedPlacement.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={selectedPlacement.opacity}
                  onChange={(e) =>
                    updateSelected({ opacity: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Draggable HUD Buttons */}
      {allIds.map((id) => {
        const placement = draftLayout[id];
        const meta = BUTTON_SHORT_ICONS[id];
        const isSelected = selectedId === id;

        return (
          <div
            key={id}
            onPointerDown={(e) => handlePointerDownItem(id, e)}
            onPointerMove={handlePointerMoveItem}
            onPointerUp={handlePointerUpItem}
            onPointerCancel={handlePointerUpItem}
            style={{
              left: `${placement.xPercent}%`,
              top: `${placement.yPercent}%`,
              width: `${meta.sizePx}px`,
              height: `${meta.sizePx}px`,
              transform: `translate(-50%, -50%) scale(${placement.scale})`,
              opacity: placement.opacity,
              touchAction: 'none',
            }}
            className={`absolute rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none transition-shadow ${
              isSelected
                ? 'border-2 border-amber-400 bg-amber-500/25 shadow-[0_0_24px_rgba(245,158,11,0.75)] z-40'
                : meta.isPrimary
                  ? 'border-2 border-orange-400/70 bg-orange-500/20 z-30'
                  : 'border border-white/45 bg-black/55 z-30'
            }`}
          >
            {/* Selection Corner Ring */}
            {isSelected && (
              <div className="absolute -inset-1.5 border border-dashed border-amber-300 rounded-full pointer-events-none" />
            )}
            <span className="text-[9px] font-mono font-black tracking-tighter text-white text-center leading-tight px-1 drop-shadow">
              {meta.label}
            </span>
            <span className="text-[8px] font-mono text-amber-300 tabular-nums">
              {Math.round(placement.scale * 100)}%
            </span>
          </div>
        );
      })}

      {/* Bottom Helper Hint */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] font-mono text-slate-400 bg-black/70 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap">
        Arraste qualquer botão para posicionar · Toque nele para ajustar tamanho e transparência
      </div>
    </div>
  );
};
