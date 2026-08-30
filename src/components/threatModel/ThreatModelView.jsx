import { useMemo, useRef, useState } from "react";
import { filterTechniques } from "../../lib/search";
import { setAnnotation } from "../../lib/layerModel";
import { layerFromEntityUsage } from "../../lib/layerGenerators";
import LayerToolbar from "./LayerToolbar";
import AnnotatedMatrix from "./AnnotatedMatrix";
import MatrixExportMenu from "./MatrixExportMenu";
import AnnotationEditor from "./AnnotationEditor";
import LayerComparePanel from "./LayerComparePanel";
import AttributionPanel from "./AttributionPanel";
import LayerAISummaryPanel from "./LayerAISummaryPanel";
import SearchBar from "../SearchBar";
import Toggle from "../Toggle";

const SUB_VIEWS = [
  { value: "edit", label: "Anotar capa" },
  { value: "compare", label: "Comparar capas" },
  { value: "attribution", label: "¿Qué grupo puede ser?" },
  { value: "ai-summary", label: "Resumen con IA" },
];

export default function ThreatModelView({
  data,
  layers,
  activeLayer,
  onSelectLayer,
  onCreateLayer,
  onRenameLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onImportLayer,
  onExportLayer,
  onApplyAnnotation,
  onChangeColorMode,
  onChangeGradient,
  onNavigateToExplore,
  onAddLayer,
  onAddLayerPassive,
  onChangeDescription,
  importError,
}) {
  const [subView, setSubView] = useState("edit");
  const [query, setQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [compareSeedIds, setCompareSeedIds] = useState(null);
  const matrixExportRef = useRef(null);

  /** Genera la capa de TTPs conocidos de un grupo/software candidato (sin activarla),
   *  y salta a "Comparar capas" con la capa observada + la del candidato preseleccionadas. */
  const handleCompareWithCandidate = (entityType, entity) => {
    const usageList =
      entityType === "group" ? data.groupTechniques.get(entity.id) : data.softwareTechniques.get(entity.id);
    if (!usageList || usageList.length === 0) return;
    const candidateLayer = layerFromEntityUsage({ entity, entityType, usageList, domain: activeLayer.domain });
    onAddLayerPassive(candidateLayer);
    setCompareSeedIds([activeLayer.id, candidateLayer.id]);
    setSubView("compare");
  };

  const filteredTechniques = useMemo(
    () => filterTechniques(data.techniques, { query, tactics: [], platforms: [], includeSub: Boolean(query.trim()) }),
    [data.techniques, query]
  );

  const techniquesByTactic = useMemo(() => {
    const map = new Map();
    for (const tac of data.tactics) map.set(tac.shortname, []);
    for (const t of filteredTechniques) {
      if (t.is_subtechnique && !query.trim()) continue;
      for (const tacName of t.tactics) {
        if (!map.has(tacName)) map.set(tacName, []);
        map.get(tacName).push(t);
      }
    }
    return map;
  }, [data.tactics, filteredTechniques, query]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const targetIds = selectionMode ? Array.from(selectedIds) : editingId ? [editingId] : [];

  const handleApply = (patch) => {
    let next = activeLayer;
    for (const id of targetIds) {
      next = setAnnotation(next, id, patch);
    }
    onApplyAnnotation(next);
    if (!selectionMode) setEditingId(null);
    else setSelectedIds(new Set());
  };

  const handleClearTargets = () => {
    let next = activeLayer;
    for (const id of targetIds) {
      next = setAnnotation(next, id, { color: null, score: null, comment: "", enabled: true });
    }
    onApplyAnnotation(next);
    if (!selectionMode) setEditingId(null);
    else setSelectedIds(new Set());
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <LayerToolbar
          layers={layers}
          activeLayer={activeLayer}
          onSelectLayer={onSelectLayer}
          onCreate={onCreateLayer}
          onRename={onRenameLayer}
          onDuplicate={onDuplicateLayer}
          onDelete={onDeleteLayer}
          onImport={onImportLayer}
          onExport={onExportLayer}
          importError={importError}
        />
        <Toggle options={SUB_VIEWS} value={subView} onChange={setSubView} />
      </div>

      {subView === "compare" && (
        <LayerComparePanel
          data={data}
          layers={layers}
          onSaveAsLayer={onAddLayer}
          initialCheckedIds={compareSeedIds}
        />
      )}

      {subView === "attribution" && (
        <AttributionPanel
          data={data}
          activeLayer={activeLayer}
          onNavigateToExplore={onNavigateToExplore}
          onCompareWithCandidate={handleCompareWithCandidate}
        />
      )}

      {subView === "ai-summary" && (
        <LayerAISummaryPanel layer={activeLayer} data={data} onSetLayerDescription={onChangeDescription} />
      )}

      {subView === "edit" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          <div className="min-w-0">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <SearchBar value={query} onChange={setQuery} entityType="technique" />
                </div>
                <Toggle
                  options={[
                    { value: false, label: "click individual" },
                    { value: true, label: "selección múltiple" },
                  ]}
                  value={selectionMode}
                  onChange={(v) => {
                    setSelectionMode(v);
                    setSelectedIds(new Set());
                    setEditingId(null);
                  }}
                />
                <MatrixExportMenu targetRef={matrixExportRef} layerName={activeLayer?.name} />
              </div>
              {selectionMode && selectedIds.size > 0 && (
                <p className="font-mono text-xs text-signal-cyan">
                  {selectedIds.size} técnica{selectedIds.size === 1 ? "" : "s"} seleccionada
                  {selectedIds.size === 1 ? "" : "s"} — definí una anotación en el panel de la derecha y tocá
                  "aplicar".
                </p>
              )}
            </div>

            <AnnotatedMatrix
              ref={matrixExportRef}
              tactics={data.tactics}
              techniquesByTactic={techniquesByTactic}
              layer={activeLayer}
              selectedIds={selectedIds}
              selectionMode={selectionMode}
              onToggleSelect={toggleSelect}
              onOpenEditor={(id) => setEditingId(id)}
            />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-[88px] h-[calc(100vh-104px)] border border-ink-800 rounded-lg bg-ink-900/60 shadow-panel overflow-y-auto">
              <AnnotationEditor
                layer={activeLayer}
                data={data}
                techniqueById={data.techniqueById}
                targetIds={targetIds}
                selectionMode={selectionMode}
                onApply={handleApply}
                onClearTargets={handleClearTargets}
                onChangeColorMode={onChangeColorMode}
                onChangeGradient={onChangeGradient}
                onNavigateToExplore={onNavigateToExplore}
                onExitEditing={() => {
                  setEditingId(null);
                  setSelectedIds(new Set());
                }}
              />
            </div>
          </aside>

          {editingId && !selectionMode && (
            <div className="lg:hidden fixed inset-0 z-40 bg-ink-950/95 backdrop-blur-sm">
              <div className="h-full max-w-lg mx-auto border-x border-ink-800 bg-ink-900 overflow-y-auto">
                <AnnotationEditor
                  layer={activeLayer}
                  data={data}
                  techniqueById={data.techniqueById}
                  targetIds={targetIds}
                  selectionMode={selectionMode}
                  onApply={handleApply}
                  onClearTargets={handleClearTargets}
                  onChangeColorMode={onChangeColorMode}
                  onChangeGradient={onChangeGradient}
                  onNavigateToExplore={onNavigateToExplore}
                  onExitEditing={() => setEditingId(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}