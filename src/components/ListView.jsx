import { tacticColor } from "../lib/tacticColors";

export function TechniqueListView({ techniques, tacticByShortname, onSelect, selectedId }) {
  if (techniques.length === 0) return <EmptyRow />;
  return (
    <ul className="divide-y divide-ink-800 border border-ink-800 rounded-lg overflow-hidden bg-ink-900/40">
      {techniques.map((t) => {
        const active = t.id === selectedId;
        return (
          <li key={t.id}>
            <button
              onClick={() => onSelect(t)}
              className={`w-full text-left px-4 py-3 flex items-start gap-4 transition-colors ${
                active ? "bg-ink-800" : "hover:bg-ink-800/60"
              }`}
            >
              <span className="font-mono text-xs text-ink-500 pt-0.5 w-20 shrink-0">
                {t.id}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-ink-100">
                  {t.is_subtechnique && <span className="text-ink-500">↳ </span>}
                  {t.name}
                </span>
                <span className="flex flex-wrap gap-1 mt-1.5">
                  {t.tactics.map((tacName) => {
                    const tac = tacticByShortname.get(tacName);
                    if (!tac) return null;
                    return (
                      <span
                        key={tacName}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          color: tacticColor(tac.index),
                          backgroundColor: `${tacticColor(tac.index)}18`,
                        }}
                      >
                        {tac.name}
                      </span>
                    );
                  })}
                </span>
              </span>
              <span className="font-mono text-[10px] text-ink-500 shrink-0 pt-1 text-right hidden sm:block">
                {t.mitigations.length > 0 && <div>{t.mitigations.length} mitig.</div>}
                {t.groups.length > 0 && <div>{t.groups.length} grupos</div>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NamedEntityListView({ entities, onSelect, selectedId, countLabel }) {
  if (entities.length === 0) return <EmptyRow />;
  return (
    <ul className="divide-y divide-ink-800 border border-ink-800 rounded-lg overflow-hidden bg-ink-900/40">
      {entities.map((e) => {
        const active = e.id === selectedId;
        return (
          <li key={e.id}>
            <button
              onClick={() => onSelect(e)}
              className={`w-full text-left px-4 py-3 flex items-start gap-4 transition-colors ${
                active ? "bg-ink-800" : "hover:bg-ink-800/60"
              }`}
            >
              <span className="font-mono text-xs text-ink-500 pt-0.5 w-16 shrink-0">{e.id}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-ink-100">{e.name}</span>
                {e.aliases?.length > 0 && (
                  <span className="block text-[11px] text-ink-500 mt-0.5 truncate">
                    alias: {e.aliases.slice(0, 4).join(", ")}
                  </span>
                )}
              </span>
              {countLabel && (
                <span className="font-mono text-[10px] text-ink-500 shrink-0 pt-1">{countLabel(e)}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyRow() {
  return (
    <div className="border border-dashed border-ink-700 rounded-lg py-10 text-center">
      <p className="font-mono text-sm text-ink-500">— sin resultados para esta búsqueda —</p>
      <p className="font-mono text-[11px] text-ink-600 mt-1">probá ajustar los filtros o el término de búsqueda</p>
    </div>
  );
}
