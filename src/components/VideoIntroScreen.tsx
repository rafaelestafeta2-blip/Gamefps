import React, { useEffect, useRef, useState } from 'react';

interface VideoIntroScreenProps {
  onComplete: () => void;
}

const TRAILER_VIDEO_URL =
  'https://github.com/rafaelestafeta2-blip/Gamesfps/releases/download/V2/Warface.-.Trailer.-.Dublado.1080p.1.mp4';

/**
  * Video Intro Screen que reproduz o trailer oficial dublado após a splash screen
  * e antes do carregamento do jogo. Possui botão discreto para pular e suporte a teclado.
  */
export const VideoIntroScreen: React.FC<VideoIntroScreenProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const completedRef = useRef(false);

  const finishIntro = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    onComplete();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Tentar tocar com som primeiro; se a política do navegador bloquear, tocar mudo
    video.play().catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {
        // Se ainda assim falhar (ex: rede offline), avançar normalmente
        finishIntro();
      });
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        finishIntro();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div
      onClick={() => {
        // Toque na tela em dispositivos móveis ativa o som se estiver mudo
        if (videoRef.current && videoRef.current.muted) {
          videoRef.current.muted = false;
          setIsMuted(false);
        }
      }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* Vídeo do Trailer em tela cheia com proporção preservada */}
      <video
        ref={videoRef}
        src={TRAILER_VIDEO_URL}
        className="w-full h-full object-cover sm:object-contain bg-black"
        playsInline
        autoPlay
        preload="auto"
        onPlay={() => setHasStarted(true)}
        onEnded={finishIntro}
        onError={() => {
          console.warn('Erro ao carregar trailer de vídeo. Pulando para o jogo...');
          finishIntro();
        }}
      />

      {/* Indicador sutil de áudio mudo se o navegador tiver bloqueado som automático */}
      {isMuted && hasStarted && (
        <button
          type="button"
          onClick={toggleSound}
          aria-label="Ativar som do trailer"
          className="absolute top-4 left-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-amber-400/30 text-amber-300 font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-lg"
        >
          <span className="inline-block animate-pulse">🔊</span>
          <span>Toque para ativar som</span>
        </button>
      )}

      {/* Botão Discreto no Canto Superior/Inferior Direito para Pular o Vídeo */}
      <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finishIntro();
          }}
          aria-label="Pular trailer"
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/55 hover:bg-black/85 active:scale-95 backdrop-blur-md border border-white/20 hover:border-amber-400/60 text-slate-300 hover:text-white font-mono text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
        >
          <span>Pular Vídeo</span>
          <span className="hidden sm:inline text-slate-500 group-hover:text-amber-400 text-[10px]">
            [Espaço]
          </span>
          <svg
            className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
