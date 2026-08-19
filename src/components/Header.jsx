export default function Header({ stats }) {
  return (
    <header className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-tactic-0 to-tactic-13 flex items-center justify-center font-mono font-bold text-ink-950 text-sm shrink-0">
            AE
          </div>
          <div>
            <h1 className="font-sans font-semibold text-lg leading-none tracking-tight text-ink-100">
              ATT&amp;CK Explorer
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-400 mt-1">
              MITRE ATT&amp;CK · Enterprise Matrix
            </p>
          </div>
        </div>

        {stats && (
          <dl className="flex items-center gap-5 font-mono text-xs">
            <Stat label="técnicas" value={stats.techniques} />
            <Stat label="tácticas" value={stats.tactics} />
            <Stat label="grupos" value={stats.groups} />
            <Stat label="software" value={stats.software} />
            <Stat label="mitigaciones" value={stats.mitigations} />
          </dl>
        )}
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-right">
      <dd className="mono-num font-semibold text-ink-100">{value}</dd>
      <dt className="text-ink-500 uppercase tracking-wide text-[10px]">{label}</dt>
    </div>
  );
}
