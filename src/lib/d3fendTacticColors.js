// Paleta de las 7 tácticas D3FEND. Deliberadamente distinta del gradiente de
// tácticas ATT&CK (que va de frío a cálido) para que se lea de un vistazo
// "esto es defensa, no ataque": todos los tonos caen en el espectro verde-azulado.
export const D3FEND_TACTIC_COLORS = {
  Model: "#7d8a99",
  Harden: "#2dd4bf",
  Detect: "#38bdf8",
  Isolate: "#818cf8",
  Deceive: "#c084fc",
  Evict: "#34d399",
  Restore: "#a3e635",
};

export function d3fendTacticColor(tactic) {
  return D3FEND_TACTIC_COLORS[tactic] || "#96a7b3";
}