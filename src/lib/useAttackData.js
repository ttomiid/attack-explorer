import { useEffect, useState, useMemo } from "react";

/**
 * Carga el dataset procesado de MITRE ATT&CK para el dominio indicado
 * ('enterprise' | 'mobile' | 'ics') y construye índices inversos (grupo -> técnicas,
 * software -> técnicas, mitigación -> técnicas) para que la búsqueda y el
 * panel de detalle sean instantáneos. Se re-fetchea cada vez que cambia `domain`.
 */
export function useAttackData(domain) {
  // guardamos junto al resultado el dominio al que corresponde: mientras el
  // fetch del nuevo dominio no resolvió, `state.domain !== domain` y derivamos
  // "loading" en el render en vez de resetear el estado a mano dentro del efecto
  const [state, setState] = useState({ domain: null, raw: null, status: "loading", error: null });

  useEffect(() => {
    let cancelled = false;
    const dataUrl = `${import.meta.env.BASE_URL}data/attack-data-${domain}.json`;
    fetch(dataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el dataset (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ domain, raw: json, status: "ready", error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ domain, raw: null, status: "error", error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const resolved = state.domain === domain;
  const status = resolved ? state.status : "loading";
  const error = resolved ? state.error : null;
  const raw = resolved ? state.raw : null;

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