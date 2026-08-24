import { useMemo, useState } from "react";
import { computeGroupAttribution } from "../../lib/attribution";

export default function AttributionPanel({ data, activeLayer, onNavigateToExplore, onCompareWithCandidate }) {
  const [expandedId, setExpandedId] = useState(null);

  const observedIds = useMemo(
    () =>
      Object.entries(activeLayer.annotations)
        .filter(([, a]) => a.enabled !== false)
        .map(([id]) => id),
    [activeLayer]
  );

  const results = useMemo(
    () => computeGroupAttribution(observedIds, data, { limit: 12 }),
    [observedIds, data]
  );

  if (observedIds.length === 0) {
    return (
      <div className="border border-dashed border-ink-700 rounded-lg py-14 text-center max-w-xl">
        <p className="font-mono text-sm text-ink-500">
          Anotá al menos una técnica en la capa activa ("{activeLayer.name}") para calcular una atribución.
        </p>
        <p className="font-mono text-[11px] text-ink-600 mt-2">
          Típicamente: marcá las TTPs que observaste en un incidente o hallazgo forense, y esta vista las compara
          contra el perfil conocido de cada grupo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-signal-amber/30 bg-signal-amber/5 rounded-lg px-4 py-3 mb-5 max-w-3xl">
        <p className="text-xs text-ink-300 leading-relaxed">
          <span className="text-signal-amber font-mono">⚠ score estadístico, no una atribución forense.</span>{" "}
          Compara el solapamiento de TTPs de la capa activa contra el perfil histórico de cada grupo, ponderando más
          las técnicas raras (usadas por pocos grupos) que las genéricas. Muchos actores comparten herramientas y
          técnicas públicas — un score alto es una hipótesis para investigar, no una prueba de autoría.
        </p>
      </div>

      <p className="font-mono text-xs text-ink-500 mb-3">
        Analizando {observedIds.length} técnica{observedIds.length === 1 ? "" : "s"} habilitada
        {observedIds.length === 1 ? "" : "s"} de la capa <span className="text-ink-300">"{activeLayer.name}"</span>{" "}
        contra {data.groups.length} grupos conocidos.
      </p>

      <div className="space-y-2 max-w-3xl">
        {results.map((r, i) => (
          <ResultRow
            key={r.group.id}
            rank={i + 1}
            result={r}
            data={data}
            expanded={expandedId === r.group.id}
            onToggleExpand={() => setExpandedId(expandedId === r.group.id ? null : r.group.id)}
            onNavigateToExplore={onNavigateToExplore}
            onCompareWithCandidate={onCompareWithCandidate}
          />
        ))}
        {results.length === 0 && (
          <p className="font-mono text-sm text-ink-500">
            Ninguno de los grupos conocidos comparte técnicas con lo anotado en esta capa.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultRow({ rank, result, data, expanded, onToggleExpand, onNavigateToExplore, onCompareWithCandidate }) {
  const { group, score, matchedTechniqueIds, missingTechniqueIds, groupTotal, observedTotal } = result;
  const pct = Math.round(score * 100);

  return (
    <div className="border border-ink-800 rounded-lg bg-ink-900/40 overflow-hidden">
      <button onClick={onToggleExpand} className="w-full text-left px-4 py-3 flex items-center gap-4">
        <span className="font-mono text-ink-600 text-xs w-5 shrink-0">#{rank}</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-ink-100 font-medium truncate">
            <span className="font-mono text-[10px] text-ink-500 mr-1.5">{group.id}</span>
            {group.name}
          </p>
          <p className="text-[11px] font-mono text-ink-500 mt-0.5">
            {matchedTechniqueIds.length}/{observedTotal} de tus TTPs coinciden · cubre {matchedTechniqueIds.length}/
            {groupTotal} de las suyas
          </p>
        </div>

        <div className="w-28 shrink-0 text-right">
          <p className="font-mono text-sm font-semibold text-ink-100">{pct}%</p>
          <div className="h-1.5 bg-ink-800 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-signal-cyan to-signal-amber"
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-ink-800 pt-3">
          {group.aliases?.length > 0 && (
            <p className="text-[11px] font-mono text-ink-500 mb-2">alias: {group.aliases.join(", ")}</p>
          )}
          <p className="text-xs text-ink-400 leading-relaxed line-clamp-3">{group.description}</p>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="font-mono text-[10px] uppercase text-ink-500 mb-1">TTPs que coinciden</p>
              <TechniqueChips ids={matchedTechniqueIds} data={data} tone="cyan" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase text-ink-500 mb-1">TTPs del grupo que no viste</p>
              <TechniqueChips ids={missingTechniqueIds.slice(0, 12)} data={data} tone="neutral" />
              {missingTechniqueIds.length > 12 && (
                <p className="text-[10px] font-mono text-ink-600 mt-1">+{missingTechniqueIds.length - 12} más</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onNavigateToExplore("group", group)}
              className="text-[11px] font-mono px-2.5 py-1.5 rounded-md border border-ink-700 hover:border-ink-500 text-ink-300"
            >
              ver ficha del grupo →
            </button>
            <button
              onClick={() => onCompareWithCandidate("group", group)}
              className="text-[11px] font-mono px-2.5 py-1.5 rounded-md border border-signal-cyan/40 hover:border-signal-cyan text-ink-200"
            >
              comparar capas: mi capa vs. {group.name} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TechniqueChips({ ids, data, tone }) {
  if (ids.length === 0) return <p className="text-[11px] text-ink-600">— ninguna —</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const t = data.techniqueById.get(id);
        return (
          <span
            key={id}
            title={t?.name}
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
              tone === "cyan" ? "bg-signal-cyan/15 text-signal-cyan" : "bg-ink-800 text-ink-400"
            }`}
          >
            {id}
          </span>
        );
      })}
    </div>
  );
}
