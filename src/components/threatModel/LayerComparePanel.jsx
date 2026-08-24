import { useEffect, useMemo, useState } from "react";
import { combineLayers, AGGREGATION_LABELS } from "../../lib/layerCombine";
import AnnotatedMatrix from "./AnnotatedMatrix";
import { annotatedCount } from "../../lib/layerModel";

export default function LayerComparePanel({ data, layers, onSaveAsLayer, initialCheckedIds }) {
  const [checkedIds, setCheckedIds] = useState(() => new Set(initialCheckedIds || []));
  const [mode, setMode] = useState("sum");

  // si venimos del panel de Atribución con una preselección (capa observada + candidato),
  // la aplicamos — así el usuario cae directo en la comparación sin tener que reelegir.
  useEffect(() => {
    if (initialCheckedIds) setCheckedIds(new Set(initialCheckedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCheckedIds?.join(",")]);

  const selectedLayers = layers.filter((l) => checkedIds.has(l.id));

  const preview = useMemo(() => {
    if (selectedLayers.length < 2) return null;
    return combineLayers(selectedLayers, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds, mode, layers]);

  const toggle = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const techniquesByTactic = useMemo(() => {
    const map = new Map();
    for (const tac of data.tactics) map.set(tac.shortname, []);
    for (const t of data.techniques) {
      if (t.is_subtechnique) continue;
      for (const tacName of t.tactics) {
        if (!map.has(tacName)) map.set(tacName, []);
        map.get(tacName).push(t);
      }
    }
    return map;
  }, [data]);

  return (
    <div>
      <div className="border border-ink-800 rounded-lg bg-ink-900/40 p-4 mb-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500 mb-3">
          1. Elegí 2 o más capas para superponer
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {layers.map((l) => {
            const checked = checkedIds.has(l.id);
            return (
              <button
                key={l.id}
                onClick={() => toggle(l.id)}
                className={`px-3 py-1.5 rounded-full border font-mono text-xs transition-colors ${
                  checked
                    ? "border-signal-cyan bg-signal-cyan/15 text-ink-100"
                    : "border-ink-700 text-ink-400 hover:border-ink-500"
                }`}
              >
                {l.name} <span className="text-ink-500">({annotatedCount(l)})</span>
              </button>
            );
          })}
        </div>

        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500 mb-2">
          2. Cómo combinar el score por técnica
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(AGGREGATION_LABELS).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              className={`px-2.5 py-1 rounded-full border font-mono text-[11px] transition-colors ${
                mode === v
                  ? "border-signal-amber/60 bg-signal-amber/15 text-ink-100"
                  : "border-ink-700 text-ink-400 hover:border-ink-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {selectedLayers.length < 2 && (
          <p className="text-xs text-ink-500 mt-4">Seleccioná al menos 2 capas para ver la superposición.</p>
        )}

        {preview && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onSaveAsLayer(preview)}
              className="bg-signal-cyan/90 hover:bg-signal-cyan text-ink-950 font-mono text-xs font-semibold rounded-md px-4 py-2 transition-colors"
            >
              guardar como capa nueva
            </button>
            <p className="text-xs text-ink-500">
              {annotatedCount(preview)} técnicas con score combinado · rango {preview.gradient.minValue}–
              {preview.gradient.maxValue}
            </p>
          </div>
        )}
      </div>

      {preview ? (
        <AnnotatedMatrix
          tactics={data.tactics}
          techniquesByTactic={techniquesByTactic}
          layer={preview}
          selectedIds={new Set()}
          selectionMode={false}
          onToggleSelect={() => {}}
          onOpenEditor={() => {}}
        />
      ) : (
        <div className="border border-dashed border-ink-700 rounded-lg py-14 text-center">
          <p className="font-mono text-sm text-ink-500">— elegí capas arriba para ver la vista combinada —</p>
        </div>
      )}
    </div>
  );
}
