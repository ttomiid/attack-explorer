export default function Toggle({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-ink-900 border border-ink-700 rounded-lg p-0.5 font-mono text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            value === opt.value ? "bg-ink-700 text-ink-100" : "text-ink-500 hover:text-ink-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
