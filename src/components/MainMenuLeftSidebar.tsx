import React from 'react';
import { soundEngine } from '../audio/soundEngine';

export type LeftSidebarButtonId =
  | 'INICIO'
  | 'RANKED'
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
    icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  },
  {
    id: 'RANKED',
    label: 'RANKED',
    icon: <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />,
  },
  {
    id: 'ARSENAL',
    label: 'ARSENAL',
    icon: <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />,
  },
  {
    id: 'PATENTES',
    label: 'PATENTES',
    icon: <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />,
  },
  {
    id: 'PASSE',
    label: 'PASSE',
    icon: <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6z" />,
  },
  {
    id: 'EVENTOS',
    label: 'EVENTOS',
    icon: <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11z" />,
  },
];

export const MainMenuLeftSidebar: React.FC<MainMenuLeftSidebarProps> = ({
  activeId,
  onSelectButton,
  onHover,
}) => {
  return (
    <nav className="w-[128px] sm:w-[148px] my-auto flex flex-col gap-1.5 shrink-0 pointer-events-auto">
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
            className={`w-full py-2.5 sm:py-3 px-3 rounded-md border flex items-center gap-2.5 text-left transition-all cursor-pointer backdrop-blur-md ${
              isActive
                ? 'bg-gradient-to-r from-red-600/85 via-red-700/65 to-red-950/90 border-red-400 text-white shadow-[0_0_18px_rgba(239,68,68,0.55)]'
                : 'bg-[#0c0f16]/88 hover:bg-[#171c28]/95 border-white/15 hover:border-red-500/45 text-slate-200 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
              {item.icon}
            </svg>
            <span className="font-display font-extrabold text-[10px] sm:text-xs tracking-wider uppercase truncate">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
