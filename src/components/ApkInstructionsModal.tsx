import React from 'react';

interface ApkInstructionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ApkInstructionsModal: React.FC<ApkInstructionsModalProps> = ({
  visible,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 pointer-events-auto">
      <div className="bg-[#0d121a] border border-amber-500/40 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="text-xs font-mono font-semibold text-amber-400">
              COMPILAÇÃO AUTOMÁTICA DE APK NATIVO (CAPACITOR + GRADLE)
            </div>
            <h3 className="font-display text-lg font-bold text-slate-100">
              Pipeline GitHub Actions Pronto no Projeto
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-mono cursor-pointer"
          >
            FECHAR
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          O projeto já contém o empacotador nativo{' '}
          <code className="text-amber-300 font-mono">capacitor.config.json</code>{' '}
          e o workflow automatizado{' '}
          <code className="text-amber-300 font-mono">
            .github/workflows/build-android-apk.yml
          </code>{' '}
          configurado com WebGL acelerado por hardware (
          <code className="text-emerald-300 font-mono">
            android:hardwareAccelerated=&quot;true&quot;
          </code>
          ), orientação horizontal travada (
          <code className="text-emerald-300 font-mono">sensorLandscape</code>)
          e permissão de vibração tátil.
        </p>

        <div className="bg-[#070a0f] border border-white/10 rounded-xl p-3.5 font-mono text-xs text-slate-300 space-y-2">
          <div className="text-amber-400 font-semibold">
            COMO GERAR E BAIXAR O APK NO GITHUB:
          </div>
          <div>
            1. Exporte/suba este repositório para o seu GitHub (branch{' '}
            <span className="text-cyan-300">main</span>).
          </div>
          <div>
            2. No GitHub, abra a aba <span className="text-cyan-300">Actions</span>{' '}
            &rarr; workflow{' '}
            <span className="text-amber-300">
              Build Native Android APK (KINETIC FPS)
            </span>
            .
          </div>
          <div>
            3. O GitHub Actions compila o jogo com JDK 21 + Android SDK +
            Gradle e gera o arquivo instalável{' '}
            <span className="text-emerald-400 font-semibold">
              KINETIC-Tactical-FPS-Android-APK (app-debug.apk)
            </span>{' '}
            em ~3 minutos na seção <strong>Artifacts</strong>.
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs rounded-xl cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
