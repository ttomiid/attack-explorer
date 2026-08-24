import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll horizontal tipo carrusel para un contenedor con overflow-x-auto:
 * expone si se puede seguir scrolleando a cada lado (para deshabilitar flechas)
 * y una función para paginar con un click. También traduce la rueda del
 * mouse/trackpad (deltaY) a scroll horizontal como ayuda extra.
 */
export function useHorizontalScroll() {
  const ref = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    updateScrollState();

    const onWheel = (e) => {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      const isMostlyVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      if (hasOverflow && isMostlyVertical) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const scrollByPage = useCallback((direction) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.max(240, el.clientWidth * 0.85) * direction;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  return { ref, canScrollLeft, canScrollRight, scrollByPage };
}
