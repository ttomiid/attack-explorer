import { useMemo, useState, useCallback, useEffect } from "react";
import { useAttackData } from "./lib/useAttackData";
import { filterTechniques, filterNamedEntities } from "./lib/search";
import { loadLayers, saveLayers, getActiveLayerId, setActiveLayerId } from "./lib/layerStore";
import { createEmptyLayer, cloneLayer } from "./lib/layerModel";
import { downloadLayerJSON, readLayerFile } from "./lib/navigatorIO";
import { layerFromEntityUsage } from "./lib/layerGenerators";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import FilterPanel from "./components/FilterPanel";
import Toggle from "./components/Toggle";
import MatrixView from "./components/MatrixView";
import { TechniqueListView, NamedEntityListView } from "./components/ListView";
import DetailPanel from "./components/DetailPanel";
import ThreatModelView from "./components/threatModel/ThreatModelView";
import { LoadingScreen, ErrorScreen } from "./components/StatusScreens";

const ENTITY_OPTIONS = [
  { value: "technique", label: "Técnicas" },
  { value: "group", label: "Grupos" },
  { value: "software", label: "Software" },
  { value: "mitigation", label: "Mitigaciones" },
];

const VIEW_OPTIONS = [
  { value: "matrix", label: "Matriz" },
  { value: "list", label: "Lista" },
];

const APP_MODES = [
  { value: "explore", label: "Explorar" },
  { value: "threat-model", label: "Modelado de amenazas" },
];

export default function App() {
  const { data, status, error } = useAttackData();

  const [appMode, setAppMode] = useState("explore");

  const [entityType, setEntityType] = useState("technique");
  const [view, setView] = useState("matrix");
  const [query, setQuery] = useState("");
  const [selectedTactics, setSelectedTactics] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [includeSub, setIncludeSub] = useState(true);
  const [selected, setSelected] = useState(null); // { type, entity }

  // --- Modelado de amenazas: capas ---
  const [layers, setLayers] = useState(() => loadLayers());
  const [activeLayerId, setActiveLayerIdState] = useState(() => getActiveLayerId() || loadLayers()[0]?.id);
  const [importError, setImportError] = useState("");

  useEffect(() => {
    saveLayers(layers);
  }, [layers]);

  useEffect(() => {
    if (activeLayerId) setActiveLayerId(activeLayerId);
  }, [activeLayerId]);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const updateLayer = useCallback((updated) => {
    setLayers((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const handleCreateLayer = useCallback(() => {
    const l = createEmptyLayer(`Capa ${layers.length + 1}`);
    setLayers((prev) => [...prev, l]);
    setActiveLayerIdState(l.id);
  }, [layers.length]);

  const handleRenameLayer = useCallback(
    (name) => {
      if (!activeLayer) return;
      updateLayer({ ...activeLayer, name, updatedAt: new Date().toISOString() });
    },
    [activeLayer, updateLayer]
  );

  const handleDuplicateLayer = useCallback(() => {
    if (!activeLayer) return;
    const copy = cloneLayer(activeLayer);
    setLayers((prev) => [...prev, copy]);
    setActiveLayerIdState(copy.id);
  }, [activeLayer]);

  const handleDeleteLayer = useCallback(() => {
    if (!activeLayer || layers.length <= 1) return;
    const remaining = layers.filter((l) => l.id !== activeLayer.id);
    setLayers(remaining);
    setActiveLayerIdState(remaining[0].id);
  }, [activeLayer, layers]);

  const handleImportLayer = useCallback(async (file) => {
    try {
      setImportError("");
      const imported = await readLayerFile(file);
      setLayers((prev) => [...prev, imported]);
      setActiveLayerIdState(imported.id);
    } catch (err) {
      setImportError(err.message);
    }
  }, []);

  const handleExportLayer = useCallback(() => {
    if (!activeLayer || !data) return;
    downloadLayerJSON(activeLayer, data.techniqueById);
  }, [activeLayer, data]);

  const handleGenerateLayerFromEntity = useCallback(
    (type, entity) => {
      if (!data) return;
      const usageList =
        type === "group" ? data.groupTechniques.get(entity.id) : data.softwareTechniques.get(entity.id);
      if (!usageList || usageList.length === 0) return;
      const l = layerFromEntityUsage({ entity, entityType: type, usageList });
      setLayers((prev) => [...prev, l]);
      setActiveLayerIdState(l.id);
      setAppMode("threat-model");
    },
    [data]
  );

  /** Agrega una capa ya construida a la lista y la activa. Usada al guardar el
   *  resultado de "comparar capas" como una nueva capa de trabajo. */
  const handleAddLayer = useCallback((layer) => {
    setLayers((prev) => [...prev, layer]);
    setActiveLayerIdState(layer.id);
  }, []);

  /** Agrega una capa sin activarla (no cambia la capa de trabajo actual).
   *  Usada por el panel de atribución para generar la capa de un grupo candidato
   *  sin perder el contexto de la capa que se está analizando. */
  const handleAddLayerPassive = useCallback((layer) => {
    setLayers((prev) => [...prev, layer]);
  }, []);

  // --- Exploración ---
  const toggleTactic = useCallback((sn) => {
    setSelectedTactics((prev) => (prev.includes(sn) ? prev.filter((x) => x !== sn) : [...prev, sn]));
  }, []);
  const togglePlatform = useCallback((p) => {
    setSelectedPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }, []);

  const filteredTechniques = useMemo(() => {
    if (!data || entityType !== "technique") return [];
    return filterTechniques(data.techniques, {
      query,
      tactics: selectedTactics,
      platforms: selectedPlatforms,
      includeSub: view === "matrix" ? true : includeSub,
    });
  }, [data, entityType, query, selectedTactics, selectedPlatforms, includeSub, view]);

  const techniquesByTactic = useMemo(() => {
    const map = new Map();
    if (!data) return map;
    for (const tac of data.tactics) map.set(tac.shortname, []);
    for (const t of filteredTechniques) {
      if (t.is_subtechnique && !query.trim()) continue;
      for (const tacName of t.tactics) {
        if (!map.has(tacName)) map.set(tacName, []);
        map.get(tacName).push(t);
      }
    }
    return map;
  }, [data, filteredTechniques, query]);

  const filteredGroups = useMemo(
    () => (data && entityType === "group" ? filterNamedEntities(data.groups, query) : []),
    [data, entityType, query]
  );
  const filteredSoftware = useMemo(
    () => (data && entityType === "software" ? filterNamedEntities(data.software, query) : []),
    [data, entityType, query]
  );
  const filteredMitigations = useMemo(
    () => (data && entityType === "mitigation" ? filterNamedEntities(data.mitigations, query) : []),
    [data, entityType, query]
  );

  const handleNavigate = useCallback((type, entity) => {
    setSelected({ type, entity });
    setEntityType(type);
  }, []);

  const handleNavigateToExplore = useCallback(
    (type, entity) => {
      handleNavigate(type, entity);
      setAppMode("explore");
    },
    [handleNavigate]
  );

  if (status === "loading") return <LoadingScreen />;
  if (status === "error") return <ErrorScreen message={error} />;

  const stats = {
    techniques: data.techniques.filter((t) => !t.is_subtechnique).length,
    tactics: data.tactics.length,
    groups: data.groups.length,
    software: data.software.length,
    mitigations: data.mitigations.length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header stats={stats} />

      <div className="border-b border-ink-800 bg-ink-950/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5">
          <Toggle options={APP_MODES} value={appMode} onChange={setAppMode} />
        </div>
      </div>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-5">
        {appMode === "threat-model" ? (
          <ThreatModelView
            data={data}
            layers={layers}
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayerIdState}
            onCreateLayer={handleCreateLayer}
            onRenameLayer={handleRenameLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
            onImportLayer={handleImportLayer}
            onExportLayer={handleExportLayer}
            onApplyAnnotation={updateLayer}
            onChangeColorMode={(colorMode) => updateLayer({ ...activeLayer, colorMode })}
            onChangeGradient={(gradient) => updateLayer({ ...activeLayer, gradient })}
            onNavigateToExplore={handleNavigateToExplore}
            onAddLayer={handleAddLayer}
            onAddLayerPassive={handleAddLayerPassive}
            importError={importError}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="flex-1">
                  <SearchBar value={query} onChange={setQuery} entityType={entityType} />
                </div>
                <Toggle
                  options={ENTITY_OPTIONS}
                  value={entityType}
                  onChange={(v) => {
                    setEntityType(v);
                    setQuery("");
                  }}
                />
              </div>

              {entityType === "technique" && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <FilterPanel
                      tactics={data.tactics}
                      platforms={data.platforms}
                      selectedTactics={selectedTactics}
                      selectedPlatforms={selectedPlatforms}
                      includeSub={includeSub}
                      onToggleTactic={toggleTactic}
                      onTogglePlatform={togglePlatform}
                      onToggleIncludeSub={() => setIncludeSub((v) => !v)}
                      onClear={() => {
                        setSelectedTactics([]);
                        setSelectedPlatforms([]);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-mono text-xs text-ink-500">
                      {filteredTechniques.length} resultado{filteredTechniques.length === 1 ? "" : "s"}
                    </p>
                    <Toggle options={VIEW_OPTIONS} value={view} onChange={setView} />
                  </div>

                  {view === "matrix" ? (
                    <MatrixView
                      tactics={data.tactics}
                      techniquesByTactic={techniquesByTactic}
                      onSelect={(t) => handleNavigate("technique", t)}
                      selectedId={selected?.entity?.id}
                    />
                  ) : (
                    <TechniqueListView
                      techniques={filteredTechniques}
                      tacticByShortname={data.tacticByShortname}
                      onSelect={(t) => handleNavigate("technique", t)}
                      selectedId={selected?.entity?.id}
                    />
                  )}
                </>
              )}

              {entityType === "group" && (
                <>
                  <p className="font-mono text-xs text-ink-500 mb-3">
                    {filteredGroups.length} resultado{filteredGroups.length === 1 ? "" : "s"}
                  </p>
                  <NamedEntityListView
                    entities={filteredGroups}
                    onSelect={(g) => handleNavigate("group", g)}
                    selectedId={selected?.entity?.id}
                    countLabel={(g) => {
                      const n = (data.groupTechniques.get(g.id) || []).length;
                      return `${n} técnica${n === 1 ? "" : "s"}`;
                    }}
                  />
                </>
              )}

              {entityType === "software" && (
                <>
                  <p className="font-mono text-xs text-ink-500 mb-3">
                    {filteredSoftware.length} resultado{filteredSoftware.length === 1 ? "" : "s"}
                  </p>
                  <NamedEntityListView
                    entities={filteredSoftware}
                    onSelect={(s) => handleNavigate("software", s)}
                    selectedId={selected?.entity?.id}
                    countLabel={(s) => {
                      const n = (data.softwareTechniques.get(s.id) || []).length;
                      return `${n} técnica${n === 1 ? "" : "s"}`;
                    }}
                  />
                </>
              )}

              {entityType === "mitigation" && (
                <>
                  <p className="font-mono text-xs text-ink-500 mb-3">
                    {filteredMitigations.length} resultado{filteredMitigations.length === 1 ? "" : "s"}
                  </p>
                  <NamedEntityListView
                    entities={filteredMitigations}
                    onSelect={(m) => handleNavigate("mitigation", m)}
                    selectedId={selected?.entity?.id}
                    countLabel={(m) => {
                      const n = (data.mitigationTechniques.get(m.id) || []).length;
                      return `${n} técnica${n === 1 ? "" : "s"}`;
                    }}
                  />
                </>
              )}
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-[128px] h-[calc(100vh-144px)] border border-ink-800 rounded-lg bg-ink-900/60 shadow-panel overflow-hidden">
                <DetailPanel
                  entityType={selected?.type}
                  entity={selected?.entity}
                  data={data}
                  onClose={() => setSelected(null)}
                  onNavigate={handleNavigate}
                  onGenerateLayer={handleGenerateLayerFromEntity}
                />
              </div>
            </aside>

            {selected && (
              <div className="lg:hidden fixed inset-0 z-40 bg-ink-950/95 backdrop-blur-sm">
                <div className="h-full max-w-lg mx-auto border-x border-ink-800 bg-ink-900">
                  <DetailPanel
                    entityType={selected.type}
                    entity={selected.entity}
                    data={data}
                    onClose={() => setSelected(null)}
                    onNavigate={handleNavigate}
                    onGenerateLayer={handleGenerateLayerFromEntity}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-ink-800 py-4">
        <p className="max-w-[1400px] mx-auto px-4 sm:px-6 font-mono text-[11px] text-ink-600">
          Datos: MITRE ATT&amp;CK® Enterprise (
          <a href="https://github.com/mitre/cti" target="_blank" rel="noreferrer" className="hover:text-signal-cyan">
            github.com/mitre/cti
          </a>
          ). ATT&amp;CK® es una marca registrada de The MITRE Corporation. Las capas de modelado de amenazas se
          guardan localmente en tu navegador (localStorage) y son compatibles con el formato de layer JSON del{" "}
          <a
            href="https://mitre-attack.github.io/attack-navigator/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-signal-cyan"
          >
            ATT&amp;CK Navigator
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
