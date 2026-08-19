function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Puntúa una técnica contra una query: coincidencia exacta de ID > nombre > descripción.
 * Devuelve null si no matchea.
 */
export function scoreTechnique(t, q) {
  if (!q) return 1;
  const nq = norm(q);
  const id = norm(t.id);
  const name = norm(t.name);
  const desc = norm(t.description);

  if (id === nq) return 100;
  if (id.startsWith(nq)) return 90;
  if (name === nq) return 85;
  if (name.startsWith(nq)) return 70;
  if (name.includes(nq)) return 50;
  if (desc.includes(nq)) return 20;
  return null;
}

export function scoreNamedEntity(entity, q) {
  if (!q) return 1;
  const nq = norm(q);
  const id = norm(entity.id);
  const name = norm(entity.name);
  const desc = norm(entity.description);
  const aliases = (entity.aliases || []).map(norm);

  if (id === nq) return 100;
  if (name === nq) return 90;
  if (name.startsWith(nq)) return 70;
  if (aliases.some((a) => a.includes(nq))) return 60;
  if (name.includes(nq)) return 45;
  if (desc.includes(nq)) return 15;
  return null;
}

export function filterTechniques(techniques, { query, tactics, platforms, includeSub }) {
  return techniques
    .filter((t) => (includeSub ? true : !t.is_subtechnique))
    .filter((t) => (tactics.length === 0 ? true : t.tactics.some((tac) => tactics.includes(tac))))
    .filter((t) => (platforms.length === 0 ? true : t.platforms.some((p) => platforms.includes(p))))
    .map((t) => ({ t, score: scoreTechnique(t, query) }))
    .filter((r) => r.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.t);
}

export function filterNamedEntities(entities, query) {
  return entities
    .map((e) => ({ e, score: scoreNamedEntity(e, query) }))
    .filter((r) => r.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.e);
}
