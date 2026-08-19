import { useMemo, useState, useCallback } from "react";
import { useAttackData } from "./lib/useAttackData";
import { filterTechniques, filterNamedEntities } from "./lib/search";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import FilterPanel from "./components/FilterPanel";
import Toggle from "./components/Toggle";
import MatrixView from "./components/MatrixView";
import { TechniqueListView, NamedEntityListView } from "./components/ListView";
import DetailPanel from "./components/DetailPanel";
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

export default function App() {
  const { data, status, error } = useAttackData();

  const [entityType, setEntityType] = useState("technique");
  const [view, setView] = useState("matrix");
  const [query, setQuery] = useState("");
  const [selectedTactics, setSelectedTactics] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [includeSub, setIncludeSub] = useState(true);
  const [selected, setSelected] = useState(null); // { type, entity }

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
      // en modo exploración (sin búsqueda) la matriz agrupa por técnica raíz;
      // si hay una búsqueda activa, una sub-técnica que matchea se muestra igual
      if (t.is_subtechnique && !query.trim()) continue;
      for (const tacName of t.tactics) {
        if (!map.has(tacName)) map.set(tacName, []);
        map.get(tacName).push(t);
      }
    }
    return map;
  }, [data, filteredTechniques]);

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

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
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
          <div className="sticky top-[88px] h-[calc(100vh-104px)] border border-ink-800 rounded-lg bg-ink-900/60 shadow-panel overflow-hidden">
            <DetailPanel
              entityType={selected?.type}
              entity={selected?.entity}
              data={data}
              onClose={() => setSelected(null)}
              onNavigate={handleNavigate}
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
              />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-ink-800 py-4">
        <p className="max-w-[1400px] mx-auto px-4 sm:px-6 font-mono text-[11px] text-ink-600">
          Datos: MITRE ATT&amp;CK® Enterprise (
          <a href="https://github.com/mitre/cti" target="_blank" rel="noreferrer" className="hover:text-signal-cyan">
            github.com/mitre/cti
          </a>
          ). ATT&amp;CK® es una marca registrada de The MITRE Corporation.
        </p>
      </footer>
    </div>
  );
}
