import { useEffect, useState } from "react";

const D3FEND_URL = "/../public/data/d3fend-mappings.json";

/**
 * Carga public/data/d3fend-mappings.json: contramedidas D3FEND sugeridas por técnica
 * ATT&CK. Este archivo se genera con scripts/update-d3fend-data.sh (o el workflow de
 * GitHub Actions); si todavía no corrió nunca, el fetch da 404 y la app sigue
 * funcionando normal, solo sin esta sección — no es un error bloqueante.
 */
export function useD3fendMappings() {
  const [mappings, setMappings] = useState(null); // Map<techniqueId, entry[]>
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable

  useEffect(() => {
    let cancelled = false;
    fetch(D3FEND_URL)
      .then((res) => {
        if (!res.ok) throw new Error("d3fend-mappings.json no encontrado");
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
  }, []);

  return { mappings, status };
}
