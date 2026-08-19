import { tacticColor } from "../lib/tacticColors";

export default function FilterPanel({
  tactics,
  platforms,
  selectedTactics,
  selectedPlatforms,
  includeSub,
  onToggleTactic,
  onTogglePlatform,
  onToggleIncludeSub,
  onClear,
}) {
  const hasFilters = selectedTactics.length > 0 || selectedPlatforms.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-500">
            Táctica · fase de la kill chain
          </h3>
          {hasFilters && (
            <button onClick={onClear} className="text-[11px] font-mono text-signal-cyan hover:underline">
              limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tactics.map((tac, i) => {
            const active = selectedTactics.includes(tac.shortname);
            return (
              <button
                key={tac.shortname}
                onClick={() => onToggleTactic(tac.shortname)}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors"
                style={{
                  borderColor: active ? tacticColor(i) : "rgba(255,255,255,0.12)",
                  backgroundColor: active ? `${tacticColor(i)}22` : "transparent",
                  color: active ? "#f2f5f7" : "#96a7b3",
                }}
                title={tac.name}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: tacticColor(i) }}
                />
                {tac.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-500 mb-2">Plataforma</h3>
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => {
            const active = selectedPlatforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => onTogglePlatform(p)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
                  active
                    ? "border-signal-amber/60 bg-signal-amber/15 text-ink-100"
                    : "border-ink-700 text-ink-400 hover:border-ink-600"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-[11px] font-mono text-ink-400 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={includeSub}
          onChange={onToggleIncludeSub}
          className="accent-signal-cyan w-3.5 h-3.5"
        />
        incluir sub-técnicas como filas independientes
      </label>
    </div>
  );
}
