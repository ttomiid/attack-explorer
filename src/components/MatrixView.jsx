import { tacticColor } from "../lib/tacticColors";

export default function MatrixView({ tactics, techniquesByTactic, onSelect, selectedId }) {
  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <div className="flex gap-2 min-w-max">
        {tactics.map((tac, i) => {
          const items = techniquesByTactic.get(tac.shortname) || [];
          const color = tacticColor(i);
          return (
            <div key={tac.shortname} className="w-56 shrink-0 flex flex-col">
              <div
                className="rounded-t-md px-3 py-2 border-t-2 bg-ink-950"
                style={{ borderColor: color }}
              >
                <p className="font-sans font-medium text-xs text-ink-100 leading-tight">{tac.name}</p>
                <p className="font-mono text-[10px] text-ink-500 mt-0.5">
                  {tac.id} · {items.length} técnica{items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-1.5 border-x border-b border-ink-800 rounded-b-md min-h-[80px] bg-ink-900/40">
                {items.length === 0 && (
                  <p className="text-ink-600 text-[11px] font-mono px-3 py-3">— sin resultados —</p>
                )}
                {items.map((t) => {
                  const active = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelect(t)}
                      className={`text-left mx-1.5 px-2.5 py-2 rounded-[4px] border text-xs transition-colors ${
                        active
                          ? "bg-ink-800 border-ink-500"
                          : "bg-ink-850 border-transparent hover:border-ink-700 hover:bg-ink-800/70"
                      }`}
                      style={active ? { boxShadow: `inset 2px 0 0 0 ${color}` } : {}}
                    >
                      <p className="font-mono text-[10px] text-ink-500">{t.id}</p>
                      <p className="text-ink-100 leading-snug">{t.name}</p>
                      {t.subtechniques.length > 0 && (
                        <p className="text-[10px] font-mono text-ink-500 mt-0.5">
                          +{t.subtechniques.length} sub-técnica{t.subtechniques.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
