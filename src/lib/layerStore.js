import { createEmptyLayer } from "./layerModel";

const STORAGE_KEY = "attack-explorer:layers";
const ACTIVE_KEY = "attack-explorer:active-layer";

function safeParse(json, fallback) {
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
  if (Array.isArray(layers) && layers.length > 0) return layers;
  // primera vez: arrancamos con una capa vacía
  const initial = createEmptyLayer("Mi primera capa");
  saveLayers([initial]);
  setActiveLayerId(initial.id);
  return [initial];
}

export function saveLayers(layers) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layers));
}

export function getActiveLayerId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function setActiveLayerId(id) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_KEY, id);
}
