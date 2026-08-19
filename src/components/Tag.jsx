export default function Tag({ children, color, onClick, title }) {
  const clickable = typeof onClick === "function";
  const Comp = clickable ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
        clickable ? "hover:border-ink-500 cursor-pointer" : ""
      }`}
      style={{
        borderColor: color ? `${color}55` : "rgba(255,255,255,0.14)",
        backgroundColor: color ? `${color}18` : "rgba(255,255,255,0.03)",
        color: color || "#c3ced6",
      }}
    >
      {children}
    </Comp>
  );
}
