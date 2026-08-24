// Puntúa qué tan parecido es un conjunto de técnicas observadas al patrón de TTPs
// de cada grupo conocido, usando similitud de coseno sobre vectores ponderados
// por IDF (técnicas raras — usadas por pocos grupos — pesan más que técnicas
// genéricas como "PowerShell", que aparecen en decenas de perfiles y no distinguen
// mucho a un actor de otro). Es el mismo principio que TF-IDF en recuperación de
// información, aplicado a técnicas en vez de palabras.
//
// IMPORTANTE: esto es un score estadístico de solapamiento de técnicas conocidas,
// no una atribución forense. Muchos actores comparten herramientas, técnicas
// públicas y hasta infraestructura; un score alto es una hipótesis a investigar,
// no una prueba.

function idfWeight(techniqueId, techniqueById, totalGroups) {
  const t = techniqueById.get(techniqueId);
  const usedBy = t?.groups?.length || 0;
  // suavizado +1 para evitar log(0) y para que técnicas usadas por todos los grupos
  // no lleguen a peso 0
  return Math.log((totalGroups + 1) / (usedBy + 1)) + 1;
}

export function computeGroupAttribution(observedIds, data, { limit = 12 } = {}) {
  const totalGroups = data.groups.length;
  const observed = observedIds.filter((id) => data.techniqueById.has(id));
  if (observed.length === 0) return [];

  const observedWeights = new Map(observed.map((id) => [id, idfWeight(id, data.techniqueById, totalGroups)]));
  const observedNorm = Math.sqrt(
    Array.from(observedWeights.values()).reduce((acc, w) => acc + w * w, 0)
  );

  const results = [];
  for (const group of data.groups) {
    const usage = data.groupTechniques.get(group.id) || [];
    if (usage.length === 0) continue;

    const groupTechniqueIds = Array.from(new Set(usage.map((u) => u.techniqueId)));
    let dot = 0;
    let groupNormSq = 0;
    const matchedTechniqueIds = [];

    for (const tid of groupTechniqueIds) {
      const w = idfWeight(tid, data.techniqueById, totalGroups);
      groupNormSq += w * w;
      if (observedWeights.has(tid)) {
        dot += w * observedWeights.get(tid);
        matchedTechniqueIds.push(tid);
      }
    }

    if (matchedTechniqueIds.length === 0) continue;

    const groupNorm = Math.sqrt(groupNormSq);
    const cosine = observedNorm > 0 && groupNorm > 0 ? dot / (observedNorm * groupNorm) : 0;

    results.push({
      group,
      score: cosine, // 0..1
      matchedTechniqueIds,
      missingTechniqueIds: groupTechniqueIds.filter((id) => !observedWeights.has(id)),
      groupTotal: groupTechniqueIds.length,
      observedTotal: observed.length,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
