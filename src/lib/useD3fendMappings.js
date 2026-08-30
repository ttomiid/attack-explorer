import { useEffect, useState } from "react";

/**
 * Carga public/data/d3fend-mappings-<domain>.json: contramedidas D3FEND sugeridas
 * por técnica ATT&CK, para el dominio indicado ('enterprise' | 'mobile' | 'ics'). Este
 * archivo se genera con scripts/update-d3fend-data.sh (o el workflow de GitHub
 * Actions); si todavía no corrió nunca, el fetch da 404 y la app sigue
 * funcionando normal, solo sin esta sección — no es un error bloqueante.
 */
export function useD3fendMappings(domain) {
  // igual que useAttackData: guardamos el dominio junto al resultado y derivamos
  // "loading" en el render (state.domain !== domain) en vez de resetear el estado
  // a mano con un setState síncrono al inicio del efecto.
  const [state, setState] = useState({ domain: null, mappings: null, status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}data/d3fend-mappings-${domain}.json`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("d3fend-mappings json no encontrado");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setState({ domain, mappings: new Map(Object.entries(json)), status: "ready" });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ domain, mappings: new Map(), status: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const resolved = state.domain === domain;
  return {
    mappings: resolved ? state.mappings : null,
    status: resolved ? state.status : "loading",
  };
}
