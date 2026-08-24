export default function MatrixScrollArrows({ canScrollLeft, canScrollRight, onScrollLeft, onScrollRight }) {
  return (
    <>
      <button
        onClick={onScrollLeft}
        disabled={!canScrollLeft}
        aria-label="Desplazar a la izquierda"
        className="absolute left-0 top-9 z-20 -translate-x-1/2 w-9 h-9 rounded-full border border-ink-700 bg-ink-900/90 backdrop-blur flex items-center justify-center text-ink-200 shadow-panel transition-opacity disabled:opacity-0 disabled:pointer-events-none hover:border-signal-cyan/60 hover:text-signal-cyan"
      >
        <ChevronLeft />
      </button>
      <button
        onClick={onScrollRight}
        disabled={!canScrollRight}
        aria-label="Desplazar a la derecha"
        className="absolute right-0 top-9 z-20 translate-x-1/2 w-9 h-9 rounded-full border border-ink-700 bg-ink-900/90 backdrop-blur flex items-center justify-center text-ink-200 shadow-panel transition-opacity disabled:opacity-0 disabled:pointer-events-none hover:border-signal-cyan/60 hover:text-signal-cyan"
      >
        <ChevronRight />
      </button>
    </>
  );
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
