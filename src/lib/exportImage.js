import { toJpeg, toPng, toSvg } from "html-to-image";

// Mismo color que el fondo de la app (ink-950 en tailwind.config.js),
// así la imagen exportada no queda con fondo transparente/blanco.
const BACKGROUND = "#07090c";

function slugify(name) {
  const base = (name || "matriz")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return base || "matriz";
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function captureDataUrl(node, format) {
  // pixelRatio alto para PNG/JPG = imagen nítida al hacer zoom; en SVG no aplica (es vectorial).
  const baseOptions = {
    backgroundColor: BACKGROUND,
    cacheBust: true,
    pixelRatio: format === "svg" ? 1 : 2,
  };

  if (format === "png") return toPng(node, baseOptions);
  if (format === "svg") return toSvg(node, baseOptions);
  if (format === "jpg") return toJpeg(node, { ...baseOptions, quality: 0.95 });
  throw new Error(`Formato de exportación no soportado: ${format}`);
}

/**
 * Exporta un nodo del DOM (la matriz de técnicas ya renderizada, con sus
 * colores/anotaciones aplicados) como archivo de imagen descargable.
 * @param {HTMLElement} node - Elemento a capturar (debe incluir el ancho completo, sin recortar por scroll).
 * @param {"png"|"svg"|"jpg"} format
 * @param {string} layerName - Usado para nombrar el archivo descargado.
 */
export async function exportMatrixImage(node, format, layerName) {
  if (!node) {
    throw new Error("No se encontró la matriz para exportar.");
  }
  const dataUrl = await captureDataUrl(node, format);
  triggerDownload(dataUrl, `matriz-${slugify(layerName)}.${format}`);
}
