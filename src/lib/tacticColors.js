// Gradiente de 14 pasos: azul frío (Reconnaissance) -> rojo cálido (Impact)
// Representa visualmente el avance de un adversario a lo largo de la kill chain.
export const TACTIC_GRADIENT = [
  "#499ad4",
  "#467fd4",
  "#4462d4",
  "#4145d4",
  "#573fd4",
  "#713cd4",
  "#8c3ad4",
  "#a837d5",
  "#c535d5",
  "#d532c6",
  "#d530a8",
  "#d52d88",
  "#d52b67",
  "#d62845",
];

export function tacticColor(index) {
  return TACTIC_GRADIENT[index % TACTIC_GRADIENT.length];
}
