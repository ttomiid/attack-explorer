import { createEmptyLayer } from "./layerModel";

const STORAGE_KEY = "attack-explorer:layers";
const ACTIVE_KEY = "attack-explorer:active-layer"; // JSON: { [domain]: layerId }

function safeParse(json, fallback) {
  if (json == null) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function loadLayers() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const layers = safeParse(raw, null);
  if (Array.isArray(layers) && layers.length > 0) {
    // compatibilidad: capas guardadas antes de que existiera "domain" (todo era Enterprise)
    return layers.map((l) => (l.domain ? l : { ...l, domain: "enterprise" }));
  }
  // primera vez: arrancamos con una capa vacía en Enterprise
  const initial = createEmptyLayer("Mi primera capa", "enterprise");
  saveLayers([initial]);
  setActiveLayerId("enterprise", initial.id);
  return [initial];
}

export function saveLayers(layers) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layers));
}

export function getActiveLayerId(domain) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACTIVE_KEY);
  const map = safeParse(raw, {});
  return map[domain] || null;
}

export function setActiveLayerId(domain, id) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(ACTIVE_KEY);
  const map = safeParse(raw, {});
  map[domain] = id;
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(map));
}