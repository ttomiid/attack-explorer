// Arma el contexto compacto que se le manda al modelo para el resumen IA de la capa
// completa, en dos modos posibles:
//
//   - "executive": panorama y prioridades para alguien que no va a implementar nada
//     él mismo (líder de equipo, gerencia técnica) -- qué priorizar y por qué, sin
//     detalle de implementación.
//   - "technical": para quien SÍ va a implementar las contramedidas -- agrega, por
//     técnica, plataformas, el mecanismo concreto de cada contramedida D3FEND
//     (qué artefacto endurece/bloquea/detecta y sobre qué artefacto de la técnica
//     actúa) y las mitigaciones propias de ATT&CK, no solo D3FEND.
//
// En los dos casos, a propósito NO se manda el JSON crudo de la capa ni las
// descripciones enteras de cada técnica -- eso infla el prompt con texto que el
// modelo no necesita y, en capas grandes, puede superar la ventana de contexto
// disponible (ver localAI.js). En cambio:
//
//   1. Por técnica anotada (habilitada) mandamos solo lo esencial, con más o menos
//      detalle según el modo (ver arriba).
//   2. La frecuencia de cada contramedida D3FEND entre las técnicas de la capa se
//      calcula ACÁ, en JS determinístico -- el modelo no tiene que inferir ni
//      contar nada, solo redactar la síntesis sobre una tabla que ya le damos resuelta.
//   3. Si la capa tiene más técnicas anotadas que el límite, se recorta priorizando
//      por score (de mayor a menor) y se le avisa al modelo (y al usuario en la UI)
//      cuántas quedaron afuera, para que no asuma que vio el 100% de la capa.

import { getMemberIds, getAnnotation } from "./layerModel";

export const DEFAULT_MAX_TECHNIQUES = 60;
export const SUMMARY_MODES = [
  { value: "executive", label: "Ejecutivo" },
  { value: "technical", label: "Técnico" },
];

function buildRow(mode, { id, t, a, d3fend }) {
  const tactic = t.tactics?.[0] || "?";
  const scorePart = typeof a.score === "number" ? ` score:${a.score}` : "";
  const commentPart = a.comment ? ` — nota del analista: "${a.comment.slice(0, 140)}"` : "";

  if (mode !== "technical") {
    const d3fendNames = d3fend.map((d) => d.name).join(", ");
    return `- ${id} ${t.name} [${tactic}]${scorePart}${commentPart} — D3FEND: ${d3fendNames}`;
  }

  const platforms = t.platforms?.length ? ` (${t.platforms.join("/")})` : "";
  const header = `- ${id} ${t.name} [${tactic}]${platforms}${scorePart}${commentPart}`;

  const d3fendLines = d3fend.map((d) => {
    const mech = (d.mechanisms || [])
      .slice(0, 2)
      .map((m) => `${m.defends} ${m.defended_artifact} — la técnica ${m.attack_rel} ${m.attack_artifact}`)
      .join("; ");
    return `    D3FEND · ${d.name}${d.tactic ? ` (${d.tactic})` : ""}${mech ? `: ${mech}` : ""}`;
  });

  const attackMitigations = (t.mitigations || []).slice(0, 3);
  const mitLine = attackMitigations.length
    ? `    Mitigación ATT&CK: ${attackMitigations.map((m) => `${m.id} ${m.name}`).join("; ")}`
    : null;

  return [header, ...d3fendLines, mitLine].filter(Boolean).join("\n");
}

/**
 * Prepara los datos para el resumen de capa. No llama a ningún modelo -- solo arma
 * estructuras livianas + el texto final del prompt, para que la UI pueda mostrar un
 * preview de tamaño ANTES de gastar cómputo generando.
 */
export function buildLayerSummaryContext(
  layer,
  data,
  { maxTechniques = DEFAULT_MAX_TECHNIQUES, mode = "executive" } = {}
) {
  const memberIds = getMemberIds(layer); // anotadas y habilitadas
  const resolved = memberIds
    .map((id) => {
      const t = data.techniqueById.get(id);
      if (!t) return null; // capa importada de otro dominio, o técnica deprecada/removida del dataset actual
      const a = getAnnotation(layer, id);
      const d3fend = data.d3fendMappings?.get(id) || [];
      return { id, t, a, d3fend };
    })
    .filter(Boolean);

  const withD3fend = resolved.filter((r) => r.d3fend.length > 0);
  const totalAnnotated = memberIds.length;
  const totalWithD3fend = withD3fend.length;

  // Cobertura por táctica, calculada sobre TODAS las técnicas anotadas (no solo las que
  // tienen D3FEND) -- si solo le pasáramos al modelo las que ya tienen contramedida, nunca
  // podría señalar qué tácticas están sin cobertura, porque nunca las vería. Esto sí es
  // barato de mandar entero (hay ~12-14 tácticas por dominio como mucho), y es igual de
  // útil para el modo técnico que para el ejecutivo.
  const tacticStats = new Map(); // shortname -> { name, annotated, withD3fend }
  for (const { t, d3fend } of resolved) {
    for (const tacName of t.tactics || []) {
      const tac = data.tacticByShortname?.get(tacName);
      const label = tac?.name || tacName;
      if (!tacticStats.has(tacName)) tacticStats.set(tacName, { name: label, annotated: 0, withD3fend: 0 });
      const s = tacticStats.get(tacName);
      s.annotated += 1;
      if (d3fend.length > 0) s.withD3fend += 1;
    }
  }
  const tacticLines = [...tacticStats.values()]
    .sort((a, b) => b.annotated - a.annotated)
    .map((s) => `- ${s.name}: ${s.annotated} técnica(s) anotada(s), ${s.withD3fend} con D3FEND`);

  // priorizamos: primero las que tienen D3FEND (son las únicas que aportan algo a la lista
  // detallada), ordenadas por score descendente (las sin score numérico van al final).
  const sorted = [...withD3fend].sort((x, y) => {
    const sx = typeof x.a.score === "number" ? x.a.score : -Infinity;
    const sy = typeof y.a.score === "number" ? y.a.score : -Infinity;
    return sy - sx;
  });

  const included = sorted.slice(0, maxTechniques);
  const excludedCount = sorted.length - included.length;

  const rows = included.map((entry) => buildRow(mode, entry));

  // frecuencia de cada contramedida D3FEND entre las técnicas INCLUIDAS (consistente con
  // lo que ve el modelo -- si recortamos técnicas, la frecuencia solo cuenta las que quedaron)
  const freqMap = new Map();
  for (const { id, d3fend } of included) {
    for (const d of d3fend) {
      const key = d.name;
      if (!freqMap.has(key)) freqMap.set(key, { name: d.name, tactic: d.tactic, techniqueIds: [] });
      freqMap.get(key).techniqueIds.push(id);
    }
  }
  const countermeasureFrequency = [...freqMap.values()]
    .map((c) => ({ ...c, count: c.techniqueIds.length }))
    .sort((a, b) => b.count - a.count);

  const freqLines = countermeasureFrequency
    .slice(0, 25)
    .map((c) => `- ${c.name} (${c.tactic || "?"}): aparece en ${c.count} técnica(s) — ${c.techniqueIds.join(", ")}`);

  const closingInstruction =
    mode === "technical"
      ? "Escribí el resumen técnico de la capa, orientado a implementación."
      : "Escribí el resumen ejecutivo de la capa.";

  const detailLabel = "Técnicas con D3FEND incluidas en el detalle";

  const promptBody =
    `Capa: "${layer.name}" (dominio ATT&CK: ${layer.domain})\n` +
    `Técnicas anotadas y habilitadas en la capa: ${totalAnnotated} totales, ${totalWithD3fend} con ` +
    `contramedidas D3FEND mapeadas${excludedCount > 0 ? ` (se muestran en detalle las ${included.length} de mayor score; ${excludedCount} quedaron afuera de la lista detallada por espacio, pero SÍ están contadas en la cobertura por táctica)` : ""}.\n\n` +
    `Cobertura D3FEND por táctica (sobre TODAS las técnicas anotadas, tengan o no D3FEND):\n${tacticLines.join("\n") || "(ninguna)"}\n\n` +
    `${detailLabel}:\n${rows.join("\n") || "(ninguna)"}\n\n` +
    `Contramedidas D3FEND más frecuentes entre esas técnicas:\n${freqLines.join("\n") || "(ninguna)"}\n\n` +
    `${closingInstruction}`;

  return {
    mode,
    totalAnnotated,
    totalWithD3fend,
    includedCount: included.length,
    excludedCount,
    countermeasureFrequency,
    promptBody,
  };
}
