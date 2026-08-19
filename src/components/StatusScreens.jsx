export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <div className="text-center">
        <div className="font-mono text-signal-cyan text-sm animate-pulse">
          cargando dataset de MITRE ATT&amp;CK…
        </div>
        <div className="w-48 h-1 bg-ink-800 rounded-full mt-4 overflow-hidden mx-auto">
          <div className="h-full w-1/2 bg-gradient-to-r from-tactic-0 to-tactic-13 animate-[loading_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

export function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-6">
      <div className="text-center max-w-md">
        <p className="text-signal-red font-mono text-sm">⚠ no se pudo cargar el dataset</p>
        <p className="text-ink-500 font-mono text-xs mt-2">{message}</p>
        <p className="text-ink-600 font-mono text-xs mt-4">
          verificá que <code className="text-ink-400">/public/data/attack-data.json</code> exista y que el proyecto
          se esté sirviendo desde un servidor (no abriendo el archivo directamente).
        </p>
      </div>
    </div>
  );
}
