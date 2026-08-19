import { useEffect, useState, useMemo } from "react";

const DATA_URL = "/data/attack-data.json";

/**
 * Carga el dataset procesado de MITRE ATT&CK Enterprise y construye
 * índices inversos (grupo -> técnicas, software -> técnicas, mitigación -> técnicas)
 * para que la búsqueda y el panel de detalle sean instantáneos.
 */
export function useAttackData() {
  const [raw, setRaw] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el dataset (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setRaw(json);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const indexed = useMemo(() => {
    if (!raw) return null;

    const techniqueById = new Map(raw.techniques.map((t) => [t.id, t]));
    const groupById = new Map(raw.groups.map((g) => [g.id, g]));
    const softwareById = new Map(raw.software.map((s) => [s.id, s]));
    const mitigationById = new Map(raw.mitigations.map((m) => [m.id, m]));
    const tacticByShortname = new Map(raw.tactics.map((t, i) => [t.shortname, { ...t, index: i }]));

    // Índices inversos: entidad -> técnicas donde participa
    const groupTechniques = new Map();
    const softwareTechniques = new Map();
    const mitigationTechniques = new Map();

    for (const t of raw.techniques) {
      for (const g of t.groups) {
        if (!groupTechniques.has(g.id)) groupTechniques.set(g.id, []);
        groupTechniques.get(g.id).push({ techniqueId: t.id, techniqueName: t.name, usage: g.description });
      }
      for (const s of t.software) {
        if (!softwareTechniques.has(s.id)) softwareTechniques.set(s.id, []);
        softwareTechniques.get(s.id).push({ techniqueId: t.id, techniqueName: t.name, usage: s.description });
      }
      for (const m of t.mitigations) {
        if (!mitigationTechniques.has(m.id)) mitigationTechniques.set(m.id, []);
        mitigationTechniques.get(m.id).push({ techniqueId: t.id, techniqueName: t.name, usage: m.description });
      }
    }

    const platforms = Array.from(new Set(raw.techniques.flatMap((t) => t.platforms))).sort();

    return {
      tactics: raw.tactics,
      techniques: raw.techniques,
      groups: raw.groups,
      software: raw.software,
      mitigations: raw.mitigations,
      techniqueById,
      groupById,
      softwareById,
      mitigationById,
      tacticByShortname,
      groupTechniques,
      softwareTechniques,
      mitigationTechniques,
      platforms,
    };
  }, [raw]);

  return { data: indexed, status, error };
}
