import { forwardRef } from "react";
import { getAnnotation } from "../../lib/layerModel";
import { scoreToColor } from "../../lib/colorScale";
import { useHorizontalScroll } from "../../lib/useHorizontalScroll";
import MatrixScrollArrows from "../MatrixScrollArrows";

const AnnotatedMatrix = forwardRef(function AnnotatedMatrix(
  {
    tactics,
    techniquesByTactic,
    layer,
    selectedIds,
    selectionMode,
    onToggleSelect,
    onOpenEditor,
  },
  exportRef
) {
  const { ref, canScrollLeft, canScrollRight, scrollByPage } = useHorizontalScroll();
  return (
    <div className="relative">
      <MatrixScrollArrows
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onScrollLeft={() => scrollByPage(-1)}
        onScrollRight={() => scrollByPage(1)}
      />
      <div ref={ref} className="overflow-x-auto pb-4 -mx-1 px-1">
        {/* exportRef apunta acá (no al div con overflow-x-auto) para que la
            captura de imagen incluya el ancho completo de la matriz, aunque
            esté parcialmente scrolleada fuera de vista. */}
        <div ref={exportRef} className="flex gap-2 min-w-max p-1.5">
          {tactics.map((tac) => {
          const items = techniquesByTactic.get(tac.shortname) || [];
          return (
            <div key={tac.shortname} className="w-56 shrink-0 flex flex-col">
              <div className="rounded-t-md px-3 py-2 border-t-2 border-ink-600 bg-ink-950">
                <p className="font-sans font-medium text-xs text-ink-100 leading-tight">{tac.name}</p>
                <p className="font-mono text-[10px] text-ink-500 mt-0.5">{tac.id}</p>
              </div>
              <div className="flex flex-col gap-1 py-1.5 border-x border-b border-ink-800 rounded-b-md min-h-[80px] bg-ink-900/40">
                {items.map((t) => {
                  const a = getAnnotation(layer, t.id);
                  const cellColor =
                    layer.colorMode === "gradient"
                      ? scoreToColor(a.score, layer.gradient)
                      : a.color;
                  const isSelected = selectedIds.has(t.id);
                  const hasContent = a.color || a.score !== null || a.comment || !a.enabled;

                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        selectionMode ? onToggleSelect(t.id) : onOpenEditor(t.id)
                      }
                      className={`relative text-left mx-1.5 px-2.5 py-2 rounded-[4px] border text-xs transition-colors cursor-pointer ${
                        isSelected ? "border-signal-cyan" : "border-transparent hover:border-ink-700"
                      } ${!a.enabled ? "opacity-35" : ""}`}
                      style={{
                        backgroundColor: cellColor ? `${cellColor}` : "rgba(255,255,255,0.03)",
                      }}
                    >
                      {selectionMode && (
                        <span
                          className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-sm border ${
                            isSelected ? "bg-signal-cyan border-signal-cyan" : "border-ink-500"
                          }`}
                        />
                      )}
                      <p
                        className="font-mono text-[10px]"
                        style={{ color: cellColor ? "rgba(7,9,12,0.65)" : "#748899" }}
                      >
                        {t.id}
                        {typeof a.score === "number" && ` · ${a.score}`}
                      </p>
                      <p
                        className="leading-snug"
                        style={{ color: cellColor ? "#07090c" : "#e6ebee" }}
                      >
                        {t.name}
                      </p>
                      {a.comment && (
                        <p
                          className="text-[10px] mt-1 line-clamp-2"
                          style={{ color: cellColor ? "rgba(7,9,12,0.7)" : "#96a7b3" }}
                        >
                          💬 {a.comment}
                        </p>
                      )}
                      {!hasContent && (
                        <span className="absolute inset-0 rounded-[4px] ring-1 ring-inset ring-transparent" />
                      )}
                    </button>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-ink-600 text-[11px] font-mono px-3 py-3">— sin técnicas —</p>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
});

export default AnnotatedMatrix;
