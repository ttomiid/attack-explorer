import { useMemo, useState } from "react";
import { buildLayerSummaryContext, DEFAULT_MAX_TECHNIQUES } from "../../lib/layerAISummary";
import { loadAISettings, isAIConfigured, generateLayerSummary, estimateTokens } from "../../lib/localAI";
import AISettingsModal from "../AISettingsModal";

function sizeHint(tokens) {
  if (tokens < 1500) return { label: "rápido", tone: "text-signal-teal" };
  if (tokens < 4000) return { label: "puede tardar unos segundos extra", tone: "text-signal-amber" };
  return { label: "capa grande — puede tardar bastante, sobre todo en modo navegador", tone: "text-signal-red" };
}

export default function LayerAISummaryPanel({ layer, data, onSetLayerDescription }) {
  const [settings, setSettings] = useState(loadAISettings);
  const [maxTechniques, setMaxTechniques] = useState(DEFAULT_MAX_TECHNIQUES);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [copied, setCopied] = useState(false);

  const configured = isAIConfigured(settings);

  const ctx = useMemo(
    () => buildLayerSummaryContext(layer, data, { maxTechniques }),
    [layer, data, maxTechniques]
  );
  const tokens = useMemo(() => estimateTokens(ctx.promptBody), [ctx.promptBody]);
  const hint = sizeHint(tokens);

  const generate = async () => {
    setState("loading");
    setError("");
    setProgress("");
    setInserted(false);
    try {
      const result = await generateLayerSummary({
        promptBody: ctx.promptBody,
        settings,
        onProgress: (p) => setProgress(p?.text || ""),
      });
      setText(result);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  };

  if (ctx.totalAnnotated === 0) {
    return (
      <div className="border border-dashed border-ink-700 rounded-lg py-14 text-center">
        <p className="font-mono text-sm text-ink-500">
          — anotá al menos una técnica en "Anotar capa" para poder generar un resumen —
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="border border-ink-800 rounded-lg bg-ink-900/40 p-4 mb-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
            Resumen ejecutivo de la capa con IA local
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="font-mono text-[11px] text-ink-500 hover:text-ink-200"
          >
            configurar
          </button>
        </div>

        <p className="text-xs text-ink-400 leading-relaxed mt-2">
          Analiza las <strong className="text-ink-200">{ctx.totalAnnotated}</strong> técnicas anotadas y
          habilitadas de "{layer.name}" ({ctx.totalWithD3fend} con contramedidas D3FEND mapeadas) y calcula
          en el momento la cobertura por táctica y qué contramedidas se repiten más — esa parte es cálculo
          exacto en el navegador, no algo que "adivina" el modelo. El modelo solo redacta la síntesis sobre
          esos datos ya resueltos.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="font-mono text-[10px] uppercase tracking-wide text-ink-500">
            Máx. técnicas en el detalle
          </label>
          <input
            type="number"
            min={5}
            max={300}
            value={maxTechniques}
            onChange={(e) => setMaxTechniques(Math.max(5, Number(e.target.value) || DEFAULT_MAX_TECHNIQUES))}
            className="w-20 bg-ink-950 border border-ink-700 focus:border-signal-cyan/60 rounded-md px-2 py-1 font-mono text-xs text-ink-100 outline-none"
          />
          <span className="text-[11px] font-mono text-ink-500">
            {ctx.includedCount} incluidas
            {ctx.excludedCount > 0 && `, ${ctx.excludedCount} afuera del detalle por espacio`} · ~{tokens} tokens
            de prompt · <span className={hint.tone}>{hint.label}</span>
          </span>
        </div>

        {!configured ? (
          <p className="text-xs text-ink-500 mt-4">
            No configuraste ninguna IA local todavía.{" "}
            <button onClick={() => setShowSettings(true)} className="text-signal-cyan hover:underline">
              Configurar ahora
            </button>
          </p>
        ) : (
          <>
            {state !== "loading" && (
              <button
                onClick={generate}
                className="mt-4 px-3 py-1.5 rounded-md border border-ink-700 hover:border-signal-cyan/60 text-ink-200 font-mono text-[11px] transition-colors"
              >
                {state === "done" ? "regenerar" : "generar resumen de la capa"}
              </button>
            )}
            {state === "loading" && (
              <p className="text-xs text-ink-400 mt-4 font-mono">generando{progress ? ` — ${progress}` : "…"}</p>
            )}
            {state === "error" && <p className="text-xs text-signal-red mt-4 leading-relaxed">{error}</p>}
          </>
        )}
      </div>

      {state === "done" && (
        <div className="border border-ink-800 rounded-lg bg-ink-900/40 p-4">
          <p className="text-sm text-ink-200 leading-relaxed whitespace-pre-line">{text}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {onSetLayerDescription && (
              <button
                onClick={() => {
                  onSetLayerDescription(text);
                  setInserted(true);
                }}
                className="px-3 py-1.5 rounded-md bg-signal-cyan/90 hover:bg-signal-cyan text-ink-950 font-mono text-[11px] font-semibold transition-colors"
              >
                {inserted ? "guardado en la descripción de la capa ✓" : "guardar como descripción de la capa"}
              </button>
            )}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="px-3 py-1.5 rounded-md border border-ink-700 hover:border-ink-500 text-ink-300 font-mono text-[11px] transition-colors"
            >
              {copied ? "copiado ✓" : "copiar"}
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <AISettingsModal
          onClose={() => {
            setShowSettings(false);
            setSettings(loadAISettings());
          }}
        />
      )}
    </div>
  );
}