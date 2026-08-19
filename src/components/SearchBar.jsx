const PLACEHOLDERS = {
  technique: "Buscar por ID (T1566), nombre o palabra clave en la descripción…",
  group: "Buscar grupo de amenaza por nombre o alias (APT29, Kimsuky…)",
  software: "Buscar malware o herramienta por nombre (Cobalt Strike, Mimikatz…)",
  mitigation: "Buscar mitigación por nombre (M1017, User Training…)",
};

export default function SearchBar({ value, onChange, entityType }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-signal-cyan select-none">
        &gt;
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDERS[entityType]}
        className="w-full bg-ink-900 border border-ink-700 focus:border-signal-cyan/60 rounded-lg pl-9 pr-10 py-3 font-mono text-sm text-ink-100 placeholder:text-ink-500 outline-none transition-colors"
        spellCheck={false}
        autoComplete="off"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200 font-mono text-sm"
        >
          ✕
        </button>
      )}
    </div>
  );
}
