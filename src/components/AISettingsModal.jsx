import { useState } from "react";
import { createPortal } from "react-dom";
import { loadAISettings, saveAISettings, WEBLLM_MODELS } from "../lib/localAI";

export default function AISettingsModal({ onClose }) {
  const [settings, setSettings] = useState(loadAISettings);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAISettings(next);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-900 border border-ink-700 rounded-xl max-w-lg w-full p-5 shadow-panel max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-sans text-base font-semibold text-ink-100">IA local para resúmenes de mitigación</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-200 font-mono text-xs" aria-label="Cerrar">
            ✕
          </button>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed mt-1">
          Esta app es un sitio estático (GitHub Pages), sin backend — no hay forma segura de usar una API
          en la nube sin exponer una clave. En cambio, generá los resúmenes con un modelo que corre{" "}
          <strong className="text-ink-300">en tu propia máquina</strong>: nada de lo que ves acá sale a
          internet.
        </p>

        <div className="mt-4 flex bg-ink-950 border border-ink-700 rounded-lg p-0.5 font-mono text-xs w-fit">
          {[
            { v: "off", l: "desactivada" },
            { v: "ollama", l: "Ollama" },
            { v: "webllm", l: "en el navegador" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => update({ provider: opt.v })}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                settings.provider === opt.v ? "bg-ink-700 text-ink-100" : "text-ink-500 hover:text-ink-300"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>

        {settings.provider === "ollama" && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-ink-400 leading-relaxed">
              Requiere{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="text-signal-cyan hover:underline"
              >
                Ollama
              </a>{" "}
              instalado y corriendo. Como esta página se sirve desde otro origen, hay que habilitarle CORS
              al arrancarlo:
            </p>
            <pre className="text-[11px] font-mono bg-ink-950 border border-ink-800 rounded-md p-2 text-ink-300 overflow-x-auto">
{`OLLAMA_ORIGINS="${typeof window !== "undefined" ? window.location.origin : "https://tu-usuario.github.io"}" ollama serve`}
            </pre>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-ink-500 mb-1">
                URL del servidor
              </label>
              <input
                value={settings.ollamaBaseUrl}
                onChange={(e) => update({ ollamaBaseUrl: e.target.value })}
                className="w-full bg-ink-950 border border-ink-700 focus:border-signal-cyan/60 rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-100 outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-ink-500 mb-1">
                Modelo (tal cual figura en <code>ollama list</code>)
              </label>
              <input
                value={settings.ollamaModel}
                onChange={(e) => update({ ollamaModel: e.target.value })}
                placeholder="llama3.2"
                className="w-full bg-ink-950 border border-ink-700 focus:border-signal-cyan/60 rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-100 outline-none"
              />
            </div>
          </div>
        )}

        {settings.provider === "webllm" && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-ink-400 leading-relaxed">
              No requiere instalar nada aparte del navegador, pero necesita soporte WebGPU (Chrome/Edge
              recientes; Safari todavía es limitado) y descarga el modelo la primera vez que lo usás — queda
              cacheado para las siguientes.
            </p>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wide text-ink-500 mb-1">
                Modelo
              </label>
              <select
                value={settings.webllmModel}
                onChange={(e) => update({ webllmModel: e.target.value })}
                className="w-full bg-ink-950 border border-ink-700 focus:border-signal-cyan/60 rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-100 outline-none"
              >
                {WEBLLM_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full bg-signal-cyan/90 hover:bg-signal-cyan text-ink-950 font-mono text-xs font-semibold rounded-md py-2 transition-colors"
        >
          listo
        </button>
      </div>
    </div>,
    document.body
  );
}
