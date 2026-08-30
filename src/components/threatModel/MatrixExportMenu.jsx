import { useEffect, useRef, useState } from "react";
import { exportMatrixImage } from "../../lib/exportImage";

const FORMATS = [
  { value: "png", label: ".png", hint: "recomendado" },
  { value: "svg", label: ".svg", hint: "vectorial" },
  { value: "jpg", label: ".jpg", hint: "" },
];

export default function MatrixExportMenu({ targetRef, layerName }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleExport = async (format) => {
    setOpen(false);
    setError("");
    setBusy(true);
    try {
      await exportMatrixImage(targetRef.current, format, layerName);
    } catch (err) {
      console.error("Error exportando la matriz:", err);
      setError("No se pudo generar la imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title="Guardar la matriz actual como imagen"
        className="px-2.5 py-1.5 rounded-md border border-ink-700 font-mono text-[11px] text-ink-300 hover:border-ink-500 hover:text-ink-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {busy ? "generando…" : "exportar imagen ↓"}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-36 rounded-md border border-ink-700 bg-ink-900 shadow-panel overflow-hidden">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleExport(f.value)}
              className="flex items-center justify-between w-full text-left px-3 py-2 font-mono text-[11px] text-ink-300 hover:bg-ink-800 hover:text-ink-100 transition-colors"
            >
              <span>{f.label}</span>
              {f.hint && <span className="text-[9px] text-ink-500">{f.hint}</span>}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="absolute right-0 mt-1 text-signal-red font-mono text-[10px] whitespace-nowrap">{error}</p>
      )}
    </div>
  );
}
