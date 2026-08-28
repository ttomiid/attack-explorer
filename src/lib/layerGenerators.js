import { createEmptyLayer } from "./layerModel";

/**
 * Crea una capa donde cada técnica usada por la entidad (grupo o software)
 * queda habilitada, con score=1 y el comentario siendo la cita de uso real
 * (si el dataset la tiene). Pensada como punto de partida rápido para
 * un modelado de amenazas: "¿qué TTPs tengo que cubrir si me preocupa este actor?".
 */
export function layerFromEntityUsage({ entity, entityType, usageList, domain = "enterprise" }) {
  const label = entityType === "group" ? "Grupo" : "Software";
  const layer = createEmptyLayer(`${entity.name} — TTPs conocidos`, domain);
  layer.description = `Generada automáticamente a partir de las técnicas asociadas a ${label.toLowerCase()} "${entity.name}" (${entity.id}) en el dataset de MITRE ATT&CK.`;
  layer.colorMode = "manual";

  const annotations = {};
  for (const u of usageList) {
    annotations[u.techniqueId] = {
      color: "#e0533d",
      score: 1,
      comment: u.usage || "",
      enabled: true,
    };
  }
  layer.annotations = annotations;
  return layer;
}

/**
 * Combina varias listas de uso (ej. varios grupos seleccionados) sumando
 * el score por técnica, para priorizar las técnicas compartidas entre actores.
 */
export function layerFromMultipleEntities(entities, colorMode = "gradient", domain = "enterprise") {
  const layer = createEmptyLayer(
    `Perfil combinado — ${entities.map((e) => e.entity.name).join(", ")}`,
    domain
  );
  layer.description = `Agrega las técnicas de ${entities.length} entidades; el score indica cuántas de ellas comparten esa técnica.`;
  layer.colorMode = colorMode;

  const annotations = {};
  for (const { entity, usageList } of entities) {
    for (const u of usageList) {
      const prev = annotations[u.techniqueId];
      const comment = prev?.comment ? `${prev.comment}\n— ${entity.name}: ${u.usage || "sin detalle"}` : `— ${entity.name}: ${u.usage || "sin detalle"}`;
      annotations[u.techniqueId] = {
        color: null,
        score: (prev?.score || 0) + 1,
        comment,
        enabled: true,
      };
    }
  }
  layer.annotations = annotations;
  const maxScore = Math.max(1, ...Object.values(annotations).map((a) => a.score));
  layer.gradient = { ...layer.gradient, minValue: 0, maxValue: maxScore };
  return layer;
}