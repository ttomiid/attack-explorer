// Referencia del schema: https://github.com/mitre-attack/attack-navigator/blob/master/layers/LAYERFORMATv4_5.md
// Exportamos un layer.json que abre sin cambios en el Navigator oficial, y podemos
// importar layers descargados de ahí (ej. el layer de TTPs de un grupo desde su página en attack.mitre.org).

import { createEmptyLayer, uid } from "./layerModel";

export function toNavigatorLayer(layer, { techniqueById, attackVersion = "17" } = {}) {
  const techniques = Object.entries(layer.annotations).map(([techniqueID, a]) => {
    const t = techniqueById?.get(techniqueID);
    return {
      techniqueID,
      tactic: t?.tactics?.[0],
      color: layer.colorMode === "manual" && a.color ? a.color : "",
      score: typeof a.score === "number" ? a.score : undefined,
      comment: a.comment || "",
      enabled: a.enabled !== false,
      metadata: [],
      links: [],
      showSubtechniques: false,
    };
  });

  return {
    name: layer.name,
    versions: { attack: attackVersion, navigator: "5.1.0", layer: "4.5" },
    domain: "enterprise-attack",
    description: layer.description || "",
    filters: { platforms: [] },
    sorting: 0,
    layout: {
      layout: "side",
      aggregateFunction: "average",
      showID: false,
      showName: true,
      showAggregateScores: false,
      countUnscored: false,
    },
    hideDisabled: false,
    techniques,
    gradient: {
      colors: layer.gradient.colors.map((c) => (c.length === 7 ? `${c}ff` : c)),
      minValue: layer.gradient.minValue,
      maxValue: layer.gradient.maxValue,
    },
    legendItems: [],
    metadata: [],
    links: [],
    showTacticRowBackground: false,
    tacticRowBackground: "#dddddd",
    selectTechniquesAcrossTactics: true,
    selectSubtechniquesWithParent: false,
  };
}

export function downloadLayerJSON(layer, techniqueById) {
  const nav = toNavigatorLayer(layer, { techniqueById });
  const blob = new Blob([JSON.stringify(nav, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(layer.name || "layer").replace(/[^a-z0-9-_]+/gi, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Acepta tanto un layer exportado por esta app como uno real del Navigator oficial
 * (ej. descargado de la página de un grupo/software en attack.mitre.org).
 */
export function fromNavigatorLayer(json) {
  const layer = createEmptyLayer(json.name || "Capa importada");
  layer.description = json.description || "";
  layer.colorMode = (json.techniques || []).some((t) => t.color) ? "manual" : "gradient";

  if (json.gradient?.colors?.length) {
    layer.gradient = {
      colors: json.gradient.colors.map((c) => c.slice(0, 7)),
      minValue: json.gradient.minValue ?? 0,
      maxValue: json.gradient.maxValue ?? 100,
    };
  }

  const annotations = {};
  for (const t of json.techniques || []) {
    if (!t.techniqueID) continue;
    const hasContent =
      t.color || typeof t.score === "number" || t.comment || t.enabled === false;
    if (!hasContent) continue;
    annotations[t.techniqueID] = {
      color: t.color || null,
      score: typeof t.score === "number" ? t.score : null,
      comment: t.comment || "",
      enabled: t.enabled !== false,
    };
  }
  layer.annotations = annotations;
  layer.id = uid("layer");
  return layer;
}

export function readLayerFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        resolve(fromNavigatorLayer(json));
      } catch {
        reject(new Error("El archivo no es un layer JSON válido."));
      }
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsText(file);
  });
}
