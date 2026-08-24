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

/** score efectivo de una anotación: usa `score` si está definido, si no 1 (presencia) */
function effectiveScore(annotation) {
  if (!annotation || annotation.enabled === false) return null;
  return typeof annotation.score === "number" ? annotation.score : 1;
}

export function combineLayers(layerList, mode = "sum") {
  const techniqueIds = new Set();
  layerList.forEach((l) => Object.keys(l.annotations).forEach((id) => techniqueIds.add(id)));

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

  const maxScore = Math.max(1, ...Object.values(annotations).map((a) => a.score));
  const layer = createEmptyLayer(`Comparación (${AGGREGATION_LABELS[mode]}) · ${layerList.map((l) => l.name).join(" + ")}`);
  layer.description = `Combina ${layerList.length} capas (${layerList
    .map((l) => l.name)
    .join(", ")}) usando ${AGGREGATION_LABELS[mode]}.`;
  layer.colorMode = "gradient";
  layer.gradient = { ...layer.gradient, minValue: 0, maxValue: maxScore };
  layer.annotations = annotations;
  return layer;
}
