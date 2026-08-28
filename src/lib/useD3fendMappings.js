import { useEffect, useState } from "react";

/**
 * Carga public/data/d3fend-mappings-<domain>.json: contramedidas D3FEND sugeridas
 * por técnica ATT&CK, para el dominio indicado ('enterprise' | 'mobile' | 'ics'). Este
 * archivo se genera con scripts/update-d3fend-data.sh (o el workflow de GitHub
 * Actions); si todavía no corrió nunca, el fetch da 404 y la app sigue
 * funcionando normal, solo sin esta sección — no es un error bloqueante.
 */
export function useD3fendMappings(domain) {
  const [mappings, setMappings] = useState(null); // Map<techniqueId, entry[]>
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const url = `${import.meta.env.BASE_URL}data/d3fend-mappings-${domain}.json`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("d3fend-mappings json no encontrado");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setMappings(new Map(Object.entries(json)));
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setMappings(new Map());
        setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  return { mappings, status };
}