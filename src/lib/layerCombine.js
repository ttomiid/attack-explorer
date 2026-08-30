import { createEmptyLayer } from "./layerModel";

const AGGREGATIONS = {
  sum: (scores) => scores.reduce((a, b) => a + b, 0),
  avg: (scores) => scores.reduce((a, b) => a + b, 0) / scores.length,
  max: (scores) => Math.max(...scores),
  min: (scores) => Math.min(...scores),
  count: (scores) => scores.length,
};

export const AGGREGATION_LABELS = {
  sum: "suma",
  avg: "promedio",
  max: "máximo",
  min: "mínimo",
  count: "cantidad de capas donde aparece",
};

// Operaciones de conjunto entre capas (al estilo "layers" del Navigator oficial),
// distintas de las agregaciones de arriba: en vez de combinar el score de una técnica
// presente en cualquiera de las capas, deciden QUÉ técnicas quedan en el resultado según
// en cuáles capas aparecen. El score resultante para las técnicas que quedan se calcula
// con la misma agregación elegida (mode).
export const SET_OP_LABELS = {
  union: "unión (en cualquiera)",
  intersect: "intersección (en todas)",
  subtract: "resta (en la primera, no en las demás)",
};

/** score efectivo de una anotación: usa `score` si está definido, si no 1 (presencia) */
function effectiveScore(annotation) {
  if (!annotation || annotation.enabled === false) return null;
  return typeof annotation.score === "number" ? annotation.score : 1;
}

/**
 * IDs de técnica que sobreviven a la operación de conjunto elegida.
 * - union: en cualquiera de las capas (comportamiento histórico, sin filtrar nada)
 * - intersect: presente y habilitada en TODAS las capas seleccionadas
 * - subtract: presente en la primera capa seleccionada y en NINGUNA de las demás
 *   (útil para "qué hace este grupo que mi capa de detección actual no cubre")
 */
function idsForSetOp(layerList, setOp) {
  const memberSets = layerList.map(
    (l) => new Set(Object.keys(l.annotations).filter((id) => effectiveScore(l.annotations[id]) !== null))
  );

  if (setOp === "intersect") {
    const [first, ...rest] = memberSets;
    return [...(first || [])].filter((id) => rest.every((s) => s.has(id)));
  }
  if (setOp === "subtract") {
    const [first, ...rest] = memberSets;
    return [...(first || [])].filter((id) => rest.every((s) => !s.has(id)));
  }
  // union
  const all = new Set();
  memberSets.forEach((s) => s.forEach((id) => all.add(id)));
  return [...all];
}

export function combineLayers(layerList, mode = "sum", setOp = "union") {
  const techniqueIds = idsForSetOp(layerList, setOp);

  const annotations = {};
  for (const id of techniqueIds) {
    const perLayer = layerList
      .map((l) => ({ layer: l, score: effectiveScore(l.annotations[id]) }))
      .filter((x) => x.score !== null);
    if (perLayer.length === 0) continue;

    const scores = perLayer.map((x) => x.score);
    const aggregate = AGGREGATIONS[mode](scores);
    const comment = perLayer
      .map((x) => {
        const c = layerList.find((l) => l.id === x.layer.id).annotations[id]?.comment;
        return c ? `— ${x.layer.name}: ${c}` : `— ${x.layer.name}`;
      })
      .join("\n");

    annotations[id] = { color: null, score: aggregate, comment, enabled: true };
  }

  const scoreValues = Object.values(annotations).map((a) => a.score);
  const maxScore = scoreValues.length ? Math.max(1, ...scoreValues) : 1;
  const opLabel = setOp === "union" ? AGGREGATION_LABELS[mode] : `${SET_OP_LABELS[setOp]}, ${AGGREGATION_LABELS[mode]}`;
  const layer = createEmptyLayer(
    `Comparación (${opLabel}) · ${layerList.map((l) => l.name).join(" + ")}`,
    layerList[0]?.domain
  );
  layer.description = `Combina ${layerList.length} capas (${layerList
    .map((l) => l.name)
    .join(", ")}) usando ${SET_OP_LABELS[setOp]} / ${AGGREGATION_LABELS[mode]}.`;
  layer.colorMode = "gradient";
  layer.gradient = { ...layer.gradient, minValue: 0, maxValue: maxScore };
  layer.annotations = annotations;
  return layer;
}
