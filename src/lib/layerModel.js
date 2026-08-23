// Modelo interno de "capa" de modelado de amenazas, inspirado en el
// Layer Format de ATT&CK Navigator (https://github.com/mitre-attack/attack-navigator).
// Cada técnica anotada guarda: color manual, score numérico, comentario y estado enabled/disabled.

let uidCounter = 0;
export function uid(prefix = "l") {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

export const DEFAULT_GRADIENT = {
  colors: ["#4fd3c4", "#e8a23d", "#e0533d"], // bajo -> medio -> alto
  minValue: 0,
  maxValue: 100,
};

export function createEmptyLayer(name = "Nueva capa") {
  return {
    id: uid("layer"),
    name,
    description: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    colorMode: "manual", // "manual" | "gradient"
    gradient: { ...DEFAULT_GRADIENT },
    // Map techniqueID -> { color, score, comment, enabled }
    annotations: {},
  };
}

export function cloneLayer(layer, newName) {
  return {
    ...layer,
    id: uid("layer"),
    name: newName || `${layer.name} (copia)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    gradient: { ...layer.gradient, colors: [...layer.gradient.colors] },
    annotations: Object.fromEntries(
      Object.entries(layer.annotations).map(([k, v]) => [k, { ...v }])
    ),
  };
}

export function getAnnotation(layer, techniqueId) {
  return (
    layer.annotations[techniqueId] || {
      color: null,
      score: null,
      comment: "",
      enabled: true,
    }
  );
}

export function setAnnotation(layer, techniqueId, patch) {
  const prev = getAnnotation(layer, techniqueId);
  const next = { ...prev, ...patch };
  const isBlank =
    !next.color && (next.score === null || next.score === undefined) && !next.comment && next.enabled;
  const annotations = { ...layer.annotations };
  if (isBlank) {
    delete annotations[techniqueId];
  } else {
    annotations[techniqueId] = next;
  }
  return { ...layer, annotations, updatedAt: new Date().toISOString() };
}

export function clearAnnotation(layer, techniqueId) {
  const annotations = { ...layer.annotations };
  delete annotations[techniqueId];
  return { ...layer, annotations, updatedAt: new Date().toISOString() };
}

export function annotatedCount(layer) {
  return Object.keys(layer.annotations).length;
}
