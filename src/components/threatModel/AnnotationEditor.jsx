import { useEffect, useState } from "react";
import { getAnnotation } from "../../lib/layerModel";
import GradientBar from "./GradientBar";
import { TechniqueDetail } from "../DetailPanel";

const PALETTE = ["#e0533d", "#e8a23d", "#e8d33d", "#7fd44f", "#4fd3c4", "#4f8fd4", "#a04fd4", "#96a7b3"];

export default function AnnotationEditor({
  layer,
  data,
  techniqueById,
  targetIds,
  selectionMode,
  onApply,
  onClearTargets,
  onChangeColorMode,
  onChangeGradient,
  onExitEditing,
  onNavigateToExplore,
}) {
  const isBulk = targetIds.length > 1;
  const single = targetIds.length === 1 ? techniqueById.get(targetIds[0]) : null;
  const baseAnnotation = targetIds.length === 1 ? getAnnotation(layer, targetIds[0]) : null;
  const [tab, setTab] = useState("annotate"); // "annotate" | "detail"

  const [color, setColor] = useState(baseAnnotation?.color || "");
  const [score, setScore] = useState(baseAnnotation?.score ?? "");
  const [comment, setComment] = useState(baseAnnotation?.comment || "");
  const [enabled, setEnabled] = useState(baseAnnotation?.enabled ?? true);

  useEffect(() => {
    if (targetIds.length === 1) {
      const a = getAnnotation(layer, targetIds[0]);
      setColor(a.color || "");
      setScore(a.score ?? "");
      setComment(a.comment || "");
      setEnabled(a.enabled ?? true);
    } else {
      setColor("");
      setScore("");
      setComment("");
      setEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIds.join(",")]);

  useEffect(() => {
    if (targetIds.length !== 1) setTab("annotate");
  }, [targetIds.length]);

  if (targetIds.length === 0) {
    return (
      <div className="p-5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500 mb-3">Configuración de la capa</p>
        <LayerSettings layer={layer} onChangeColorMode={onChangeColorMode} onChangeGradient={onChangeGradient} />
        <p className="text-xs text-ink-500 mt-6 leading-relaxed">
          {selectionMode
            ? "Modo selección activo: hacé click en las técnicas de la matriz para elegirlas y después aplicá una anotación en lote."
            : "Hacé click en una técnica de la matriz para anotarla (color, score, comentario, habilitada/deshabilitada)."}
        </p>
      </div>
    );
  }

  const apply = () => {
    onApply({
      color: color || null,
      score: score === "" ? null : Number(score),
      comment,
      enabled,
    });
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          {isBulk ? `${targetIds.length} técnicas seleccionadas` : "Anotar técnica"}
        </p>
        <button onClick={onExitEditing} className="text-ink-500 hover:text-ink-200 font-mono text-xs">
          ✕
        </button>
      </div>

      {single && (
        <>
          <p className="font-mono text-xs text-ink-500 mt-2">{single.id}</p>
          <h3 className="font-sans text-base font-semibold text-ink-100">{single.name}</h3>

          <div className="flex bg-ink-900 border border-ink-700 rounded-lg p-0.5 font-mono text-[11px] w-fit mt-3">
            {[
              { v: "annotate", l: "anotar" },
              { v: "detail", l: "ficha completa" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setTab(opt.v)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  tab === opt.v ? "bg-ink-700 text-ink-100" : "text-ink-500 hover:text-ink-300"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </>
      )}

      {single && tab === "detail" ? (
        <div className="mt-4 -mx-5 px-5 border-t border-ink-800 pt-4">
          <TechniqueDetail
            entity={single}
            data={data}
            onNavigate={onNavigateToExplore}
            onInsertToLayerComment={(text) => {
              setComment((prev) => (prev ? `${prev}\n\n${text}` : text));
              setTab("annotate");
            }}
          />
        </div>
      ) : (
        <AnnotateForm
          isBulk={isBulk}
          layer={layer}
          color={color}
          setColor={setColor}
          score={score}
          setScore={setScore}
          comment={comment}
          setComment={setComment}
          enabled={enabled}
          setEnabled={setEnabled}
          apply={apply}
          onClearTargets={onClearTargets}
          onChangeColorMode={onChangeColorMode}
          onChangeGradient={onChangeGradient}
        />
      )}
    </div>
  );
}

function AnnotateForm({
  isBulk,
  layer,
  color,
  setColor,
  score,
  setScore,
  comment,
  setComment,
  enabled,
  setEnabled,
  apply,
  onClearTargets,
  onChangeColorMode,
  onChangeGradient,
}) {
  return (
    <>
      {isBulk && (
        <p className="text-xs text-ink-400 mt-2">
          Los valores que definas acá se van a aplicar a las técnicas seleccionadas.
        </p>
      )}

      {layer.colorMode === "manual" && (
        <div className="mt-4">
          <label className="block font-mono text-[10px] uppercase tracking-wide text-ink-500 mb-1.5">Color</label>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-ink-100" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              onClick={() => setColor("")}
              className={`w-6 h-6 rounded-full border border-dashed border-ink-500 text-ink-500 text-[10px] flex items-center justify-center ${
                !color ? "ring-1 ring-ink-100" : ""
              }`}
              title="Sin color"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-ink-500 mb-1.5">
          Score {layer.colorMode === "gradient" && "(controla el color vía gradiente)"}
        </label>
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="ej. 1, 50, 100…"
          className="w-full bg-ink-900 border border-ink-700 focus:border-signal-cyan/60 rounded-md px-2.5 py-1.5 font-mono text-sm text-ink-100 outline-none"
        />
      </div>

      <div className="mt-4">
        <label className="block font-mono text-[10px] uppercase tracking-wide text-ink-500 mb-1.5">Comentario</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Notas: fuente de detección, estado de mitigación, evidencia, prioridad…"
          className="w-full bg-ink-900 border border-ink-700 focus:border-signal-cyan/60 rounded-md px-2.5 py-1.5 text-sm text-ink-100 outline-none resize-none"
        />
      </div>

      <label className="flex items-center gap-2 mt-4 font-mono text-xs text-ink-300 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-signal-cyan w-3.5 h-3.5"
        />
        habilitada (desmarcá para atenuarla, útil para "ocultar" sin borrar)
      </label>

      <div className="flex gap-2 mt-5">
        <button
          onClick={apply}
          className="flex-1 bg-signal-cyan/90 hover:bg-signal-cyan text-ink-950 font-mono text-xs font-semibold rounded-md py-2 transition-colors"
        >
          aplicar
        </button>
        <button
          onClick={onClearTargets}
          className="px-3 border border-ink-700 hover:border-ink-500 text-ink-300 font-mono text-xs rounded-md transition-colors"
        >
          limpiar
        </button>
      </div>

      <div className="mt-8 pt-5 border-t border-ink-800">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500 mb-3">Configuración de la capa</p>
        <LayerSettings layer={layer} onChangeColorMode={onChangeColorMode} onChangeGradient={onChangeGradient} />
      </div>
    </>
  );
}

function LayerSettings({ layer, onChangeColorMode, onChangeGradient }) {
  return (
    <div>
      <div className="flex bg-ink-900 border border-ink-700 rounded-lg p-0.5 font-mono text-[11px] w-fit">
        {[
          { v: "manual", l: "color manual" },
          { v: "gradient", l: "gradiente por score" },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChangeColorMode(opt.v)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              layer.colorMode === opt.v ? "bg-ink-700 text-ink-100" : "text-ink-500 hover:text-ink-300"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {layer.colorMode === "gradient" && (
        <div className="mt-3 space-y-2">
          <GradientBar gradient={layer.gradient} />
          <div className="flex gap-1.5">
            {layer.gradient.colors.map((c, i) => (
              <input
                key={i}
                type="color"
                value={c}
                onChange={(e) => {
                  const colors = [...layer.gradient.colors];
                  colors[i] = e.target.value;
                  onChangeGradient({ ...layer.gradient, colors });
                }}
                className="w-8 h-8 rounded border border-ink-700 bg-transparent cursor-pointer"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={layer.gradient.minValue}
              onChange={(e) => onChangeGradient({ ...layer.gradient, minValue: Number(e.target.value) })}
              className="w-full bg-ink-900 border border-ink-700 rounded-md px-2 py-1 font-mono text-xs text-ink-100 outline-none"
            />
            <input
              type="number"
              value={layer.gradient.maxValue}
              onChange={(e) => onChangeGradient({ ...layer.gradient, maxValue: Number(e.target.value) })}
              className="w-full bg-ink-900 border border-ink-700 rounded-md px-2 py-1 font-mono text-xs text-ink-100 outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
