import { useRef, useState } from "react";
import { annotatedCount } from "../../lib/layerModel";

export default function LayerToolbar({
  layers,
  activeLayer,
  onSelectLayer,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
  importError,
}) {
  const fileInputRef = useRef(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const startRename = () => {
    setNameDraft(activeLayer.name);
    setRenaming(true);
  };
  const commitRename = () => {
    if (nameDraft.trim()) onRename(nameDraft.trim());
    setRenaming(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={activeLayer?.id || ""}
        onChange={(e) => onSelectLayer(e.target.value)}
        className="bg-ink-900 border border-ink-700 rounded-md px-2.5 py-1.5 font-mono text-xs text-ink-200 outline-none focus:border-signal-cyan/60 max-w-[220px]"
      >
        {layers.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} ({annotatedCount(l)})
          </option>
        ))}
      </select>

      {renaming ? (
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === "Enter" && commitRename()}
          className="bg-ink-900 border border-signal-cyan/60 rounded-md px-2 py-1.5 font-mono text-xs text-ink-100 outline-none w-40"
        />
      ) : (
        <ToolbarButton onClick={startRename} title="Renombrar capa activa">
          renombrar
        </ToolbarButton>
      )}

      <ToolbarButton onClick={onCreate} title="Crear capa vacía">
        + nueva
      </ToolbarButton>
      <ToolbarButton onClick={onDuplicate} title="Duplicar capa activa">
        duplicar
      </ToolbarButton>
      <ToolbarButton
        onClick={onDelete}
        disabled={layers.length <= 1}
        title={layers.length <= 1 ? "Necesitás al menos una capa" : "Borrar capa activa"}
      >
        borrar
      </ToolbarButton>

      <span className="w-px h-5 bg-ink-700 mx-1" />

      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Importar layer.json">
        importar
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
      <ToolbarButton onClick={onExport} title="Exportar layer.json (compatible con ATT&CK Navigator)">
        exportar ↓
      </ToolbarButton>

      {importError && <span className="text-signal-red font-mono text-[11px]">{importError}</span>}
    </div>
  );
}

function ToolbarButton({ children, onClick, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-2.5 py-1.5 rounded-md border border-ink-700 font-mono text-[11px] text-ink-300 hover:border-ink-500 hover:text-ink-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}
