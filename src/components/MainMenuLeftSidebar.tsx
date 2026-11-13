import React from 'react';
import { soundEngine } from '../audio/soundEngine';

export type LeftSidebarButtonId =
  | 'INICIO'
  | 'RANKED'
  | 'INVENTARIO'
  | 'ARSENAL'
  | 'PATENTES'
  | 'PASSE'
  | 'EVENTOS';

interface MainMenuLeftSidebarProps {
  activeId: LeftSidebarButtonId;
  onSelectButton: (id: LeftSidebarButtonId) => void;
  onHover: () => void;
}

const SIDEBAR_ITEMS: Array<{
  id: LeftSidebarButtonId;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'INICIO',
    label: 'INÍCIO',
    icon: <path d="M12 3L2 11.5h2.8V20h5.4v-5.5h3.6V20h5.4v-8.5H22L12 3z" />,
  },
  {
    id: 'RANKED',
    label: 'RANKED',
    icon: (
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />
    ),
  },
  {
    id: 'INVENTARIO',
    label: 'INVENTÁRIO',
    icon: (
      <path d="M17 6h-2V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v2H7c-1.66 0-3 1.34-3 3v9c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V9c0-1.66-1.34-3-3-3zm-6-2h2v2h-2V4zm6 15H7v-2h10v2zm0-4H7v-5h2v1.5h2V10h2v1.5h2V10h2v5z" />
    ),
  },
  {
    id: 'ARSENAL',
    label: 'ARSENAL 3D',
    icon: (
      <path d="M3 7h17l1 2.5-2 1.5h-5.5l-1.2 2.5H9.8l-.8 5.5H4.8l1.4-6.5L4.5 11H3V7zm11.2 4h2.6v-1.2h-2.6V11z" />
    ),
  },
  {
    id: 'PATENTES',
    label: 'PATENTES',
    icon: (
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
    ),
  },
  {
    id: 'PASSE',
    label: 'PASSE',
    icon: (
      <path d="M20 6H4c-1.1 0-1.99.9-1.99 2v2.2c1.1 0 2 .9 2 2s-.9 2-2 2V16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-1.8c-1.1 0-2-.9-2-2s.9-2 2-2V8c0-1.1-.9-2-2-2zm-8 9.2l-2.35 1.24.45-2.62-1.9-1.85 2.63-.38L12 9.2l1.17 2.39 2.63.38-1.9 1.85.45 2.62L12 15.2z" />
    ),
  },
  {
    id: 'EVENTOS',
    label: 'EVENTOS',
    icon: (
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11zm-11-8h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm4 0h2v2h-2v-2z" />
    ),
  },
];

export const MainMenuLeftSidebar: React.FC<MainMenuLeftSidebarProps> = ({
  activeId,
  onSelectButton,
  onHover,
}) => {
  return (
    <nav className="relative w-[152px] sm:w-[176px] lg:w-[222px] max-h-full my-auto flex flex-col justify-center gap-1 lg:gap-1.5 pl-2 lg:pl-3 py-0.5 shrink-0 overflow-y-auto no-scrollbar pointer-events-auto">
      {/* Linha vertical neon vermelha na borda esquerda */}
      <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-gradient-to-b from-red-500/20 via-red-500 to-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.9)] pointer-events-none" />

      {SIDEBAR_ITEMS.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onMouseEnter={onHover}
            onClick={() => {
              soundEngine.playMenuSelect();
              onSelectButton(item.id);
            }}
            style={{
              clipPath:
                'polygon(7px 0%, calc(100% - 7px) 0%, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0% calc(100% - 7px), 0% 7px)',
            }}
            className={`relative w-full flex items-center justify-between px-2.5 lg:px-4 transition-all cursor-pointer backdrop-blur-md group shrink-0 ${
              isActive
                ? 'py-1.5 lg:py-2.5 bg-gradient-to-r from-[#99141d]/95 via-[#580b11]/92 to-[#240609]/92 border-2 border-red-500 text-white shadow-[0_0_24px_rgba(239,68,68,0.65)]'
                : 'py-1 lg:py-2.5 bg-gradient-to-r from-[#13161e]/92 via-[#0d1017]/92 to-[#090b10]/92 hover:from-[#1d222e]/95 border border-white/15 hover:border-red-500/50 text-slate-200 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 lg:gap-3.5 min-w-0">
              <svg
                viewBox="0 0 24 24"
                className={`w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 ${
                  isActive ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]' : 'text-slate-300 group-hover:text-white'
                }`}
                fill="currentColor"
              >
                {item.icon}
              </svg>
              <span
                className={`font-display font-extrabold tracking-wider uppercase truncate ${
                  isActive ? 'text-[10px] lg:text-xs text-white' : 'text-[10px] lg:text-xs text-slate-200'
                }`}
              >
                {item.label}
              </span>
            </div>

            <span
              className={`font-display font-black text-xs lg:text-sm leading-none shrink-0 ${
                isActive
                  ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                  : 'text-white/15 group-hover:text-red-400/60'
              }`}
            >
              »
            </span>
          </button>
        );
      })}
    </nav>
  );
};
