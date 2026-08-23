export default function GradientBar({ gradient, compact }) {
  const css = `linear-gradient(to right, ${gradient.colors.join(", ")})`;
  return (
    <div className={compact ? "w-28" : "w-full"}>
      <div className="h-2.5 rounded-full border border-ink-700" style={{ background: css }} />
      <div className="flex justify-between font-mono text-[10px] text-ink-500 mt-1">
        <span>{gradient.minValue}</span>
        <span>{gradient.maxValue}</span>
      </div>
    </div>
  );
}
