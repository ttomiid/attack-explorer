// IA local para resumir contramedidas D3FEND en lenguaje más asequible para el analista.
//
// Esta app se sirve 100% estática desde GitHub Pages: no hay backend, y por lo tanto no
// hay forma segura de guardar una API key de un proveedor en la nube (quedaría expuesta
// en el bundle de JS que baja cualquiera). Por eso el modelo tiene que correr en la
// máquina de quien lo usa, de dos formas posibles:
//
//   - "ollama": un servidor Ollama local (http://localhost:11434 por default) al que le
//     pegamos por fetch desde el navegador. Requiere que Ollama esté instalado y corriendo
//     con CORS habilitado para el origen de esta página (OLLAMA_ORIGINS).
//   - "webllm": el modelo corre 100% dentro de la pestaña del navegador vía WebGPU
//     (paquete @mlc-ai/web-llm). No requiere instalar nada aparte de un navegador
//     compatible, pero descarga varios cientos de MB / algunos GB la primera vez.
//
// En ambos casos, nada de lo que el analista escribe o ve sale de su máquina hacia un
// tercero -- es la definición de "IA local".

const SETTINGS_KEY = "attack-explorer:local-ai-settings";

export const WEBLLM_MODELS = [
  { value: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (~1.9 GB, rápido)" },
  { value: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 Mini (~2.3 GB)" },
  { value: "Qwen2.5-7B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 7B (~4.5 GB, más preciso)" },
];

const DEFAULTS = {
  provider: "off", // "off" | "ollama" | "webllm"
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  webllmModel: WEBLLM_MODELS[0].value,
};

export function loadAISettings() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAISettings(settings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function isAIConfigured(settings) {
  return settings.provider === "ollama" || settings.provider === "webllm";
}

const SYSTEM_PROMPT =
  "Sos un analista SOC senior explicándole a un compañero junior cómo mitigar una técnica de " +
  "ataque de MITRE ATT&CK usando contramedidas de MITRE D3FEND. Escribís en español rioplatense, " +
  "en viñetas cortas y accionables, priorizando qué implementar primero. No inventes contramedidas " +
  "que no estén en la lista que te dan -- solo reformulá y priorizá esas. Máximo 200 palabras, sin " +
  "preámbulo ni cierre, andá directo a las viñetas.";

const LAYER_EXECUTIVE_SYSTEM_PROMPT =
  "Sos un analista SOC senior armando el resumen ejecutivo de una capa de modelado de amenazas " +
  "(ATT&CK Navigator) para tu equipo. Te paso la lista de técnicas anotadas en la capa (táctica, " +
  "score/prioridad, comentario si tiene) junto con las contramedidas D3FEND que aplican a cada una, " +
  "y una tabla ya calculada de qué contramedidas se repiten más entre esas técnicas. Escribí en " +
  "español rioplatense, en esta estructura fija: (1) 3-6 viñetas con las prioridades de mitigación, " +
  "basándote en las contramedidas más frecuentes y las técnicas de mayor score -- nombralas tal cual " +
  "aparecen en la lista; (2) qué tácticas de la kill chain están mejor cubiertas por D3FEND en esta " +
  "capa y cuáles peor o directamente sin cobertura; (3) si hay algún hueco evidente, decilo. No " +
  "inventes técnicas ni contramedidas que no estén en los datos que te paso -- si la lista está " +
  "recortada por espacio, no asumas que sabés qué hay en el resto. Evitá jerga de implementación " +
  "(nombres de artefactos técnicos, configuraciones) -- esto lo lee alguien que decide prioridades, " +
  "no quien las va a implementar. Aclará al final, en una sola línea, que es una vista " +
  "estadística/heurística sobre lo que hay anotado en la capa, no un análisis forense. Máximo 350 " +
  "palabras, sin preámbulo.";

const LAYER_TECHNICAL_SYSTEM_PROMPT =
  "Sos un ingeniero de seguridad senior armando la guía técnica de implementación de una capa de " +
  "modelado de amenazas (ATT&CK Navigator) para el equipo que va a ejecutar las contramedidas. Te " +
  "paso, por técnica anotada: plataformas afectadas, la(s) contramedida(s) D3FEND con el mecanismo " +
  "concreto (qué artefacto endurece/bloquea/detecta cada una y sobre qué artefacto de la técnica " +
  "actúa) y las mitigaciones propias de ATT&CK: también una tabla ya calculada de qué contramedidas " +
  "D3FEND se repiten más. Escribí en español rioplatense, en esta estructura fija: (1) agrupá las " +
  "contramedidas por plataforma o superficie técnica común (ej. \"en endpoints Windows\", \"en el " +
  "IdP\", \"en el perímetro de red\") y para cada grupo listá qué implementar y sobre qué artefacto " +
  "concreto actúa, citando el mecanismo tal cual te lo paso; (2) marcá las contramedidas de mayor " +
  "apalancamiento -- las que cubren varias técnicas o tácticas a la vez -- como orden sugerido de " +
  "implementación; (3) si una técnica de alto score no tiene contramedida D3FEND o mitigación ATT&CK " +
  "en los datos, marcala como hueco técnico explícito. No inventes artefactos, mecanismos ni IDs que " +
  "no estén en los datos que te paso -- citá los mecanismos tal cual aparecen, sin parafrasear el " +
  "verbo (hardens/blocks/detects, etc. quedan como están). Aclará al final, en una sola línea, que es " +
  "una vista estadística/heurística sobre lo que hay anotado en la capa, no un análisis forense ni una " +
  "guía de hardening validada. Máximo 450 palabras, sin preámbulo.";


/** Estimación gruesa de tokens (no hay tokenizer exacto disponible client-side para cualquier
 *  modelo arbitrario) -- ~4 caracteres por token en español/inglés mezclado, suficiente para
 *  decidir cuánta ventana de contexto pedir y para avisarle al usuario el tamaño antes de generar. */
export function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

/** Redondea hacia arriba a un tamaño de contexto "típico" que la mayoría de los modelos/servers
 *  soportan sin configuración especial, dejando margen para el prompt de sistema + la respuesta. */
function pickContextWindow(promptTokens) {
  const needed = promptTokens + 900; // system prompt + respuesta
  const buckets = [2048, 4096, 8192, 16384, 32768];
  return buckets.find((b) => b >= needed) || buckets[buckets.length - 1];
}

function buildPrompt(technique, d3fendEntries) {
  const list = d3fendEntries.map((d) => `- ${d.name}${d.definition ? `: ${d.definition}` : ""}`).join("\n");
  return (
    `Técnica ATT&CK: ${technique.id} — ${technique.name}\n` +
    `Descripción: ${(technique.description || "").slice(0, 500) || "(sin descripción)"}\n\n` +
    `Contramedidas D3FEND asociadas:\n${list}\n\n` +
    `Escribí el resumen de mitigación accionable para un analista SOC.`
  );
}

// -------- Ollama --------

async function callOllama(systemPrompt, prompt, settings, { numCtx } = {}) {
  let res;
  try {
    res = await fetch(`${settings.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        stream: false,
        // Ollama arranca con num_ctx=2048 por default salvo que se lo pidas explícito acá --
        // con eso alcanza y sobra para un resumen de una sola técnica, pero un resumen de
        // capa completa (decenas de técnicas + contramedidas D3FEND) lo puede superar
        // fácil y Ollama trunca en silencio el prompt sin avisar. numCtx ya viene calculado
        // en base al tamaño real del prompt (ver pickContextWindow).
        ...(numCtx ? { options: { num_ctx: numCtx } } : {}),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tu-usuario.github.io";
    throw new Error(
      `No se pudo conectar a Ollama en ${settings.ollamaBaseUrl}. ¿Está corriendo? Si sí, probablemente ` +
        `falte habilitar CORS para este origen: corré "OLLAMA_ORIGINS=${origin} ollama serve" (o reiniciá ` +
        `el servicio con esa variable de entorno seteada).`
    );
  }
  if (!res.ok) {
    throw new Error(
      `Ollama respondió ${res.status}. Verificá que el modelo "${settings.ollamaModel}" esté descargado ` +
        `("ollama pull ${settings.ollamaModel}") y que el nombre esté bien escrito.`
    );
  }
  const data = await res.json();
  const text = data?.message?.content?.trim();
  if (!text) throw new Error("Ollama respondió sin texto en el mensaje.");
  return text;
}

// -------- WebLLM (corre en el navegador vía WebGPU) --------

let enginePromise = null;
let engineModel = null;
let engineContextWindow = null;

/** Descarta el engine cacheado sin intentar liberarlo "prolijo" -- si ya quedó en un
 *  estado inválido (ver isDisposedError más abajo), llamar a algo sobre él puede tirar
 *  el mismo error de nuevo. Más simple soltar la referencia y dejar que el GC del
 *  navegador se encargue; la próxima llamada crea un engine nuevo desde cero. */
function resetWebLLMEngine() {
  enginePromise = null;
  engineModel = null;
  engineContextWindow = null;
}

// Bug conocido de la librería (mlc-ai/web-llm#486, #560): reusar el mismo engine entre
// generaciones sucesivas a veces deja un estado interno (WASM) inválido y la próxima
// llamada tira "Module/Object has already been disposed" -- sin relación con el
// contenido del prompt ni con la capa que estés resumiendo.
function isDisposedError(err) {
  return /disposed/i.test(err?.message || "");
}

async function getWebLLMEngine(model, contextWindowSize, onProgress) {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    throw new Error(
      "Este navegador no expone WebGPU, necesario para correr el modelo en el navegador. Probá con una " +
        "versión reciente de Chrome o Edge, o usá el modo Ollama en su lugar."
    );
  }
  // Reusamos el engine cacheado si es el mismo modelo Y ya tiene ventana de contexto
  // suficiente. Si un resumen de capa completa pide más contexto del que el engine actual
  // tiene cargado, no hay forma de "agrandarlo" en caliente -- hay que recrearlo (lo que
  // implica volver a cargar pesos, unos segundos si ya están cacheados en el navegador).
  if (enginePromise && engineModel === model && engineContextWindow >= contextWindowSize) {
    return enginePromise;
  }
  engineModel = model;
  engineContextWindow = contextWindowSize;
  const webllm = await import("@mlc-ai/web-llm");
  enginePromise = webllm.CreateMLCEngine(model, { initProgressCallback: (p) => onProgress?.(p) }, {
    context_window_size: contextWindowSize,
  });
  return enginePromise;
}

async function runChatCompletion(engine, systemPrompt, prompt) {
  const reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });
  const text = reply.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("El modelo no devolvió texto.");
  return text;
}

async function callWebLLM(systemPrompt, prompt, settings, { numCtx, onProgress } = {}) {
  const engine = await getWebLLMEngine(settings.webllmModel, numCtx || 4096, onProgress);
  try {
    return await runChatCompletion(engine, systemPrompt, prompt);
  } catch (err) {
    if (!isDisposedError(err)) throw err;
    // Reintentamos una única vez con un engine recién creado -- si el modelo ya está
    // cacheado en el navegador (IndexedDB), esto tarda un par de segundos, no vuelve a
    // bajar los pesos. Si vuelve a fallar, ahí sí dejamos que suba el error real.
    resetWebLLMEngine();
    try {
      const freshEngine = await getWebLLMEngine(settings.webllmModel, numCtx || 4096, onProgress);
      return await runChatCompletion(freshEngine, systemPrompt, prompt);
    } catch (retryErr) {
      if (isDisposedError(retryErr)) {
        throw new Error(
          "El motor de IA en el navegador quedó en un estado inválido (bug conocido de web-llm al " +
            "reusar el motor entre generaciones) y no se pudo recuperar solo. Recargá la página e " +
            "intentá de nuevo -- si vuelve a pasar seguido, probá con Ollama en su lugar."
        );
      }
      throw retryErr;
    }
  }
}

// -------- API pública --------

/**
 * Genera un resumen de mitigación en base a las contramedidas D3FEND de una técnica,
 * usando el proveedor de IA local configurado. Funciona igual sin importar el dominio
 * ATT&CK (Enterprise, Mobile, ICS): technique/d3fendEntries ya vienen resueltos para el
 * dominio activo desde useAttackData/useD3fendMappings, así que esta función es agnóstica
 * a eso -- si no hay entries (ej. hoy en Mobile, que D3FEND no cubre) tira error antes de
 * intentar nada.
 */
export async function generateMitigationSummary({ technique, d3fendEntries, settings, onProgress }) {
  if (!d3fendEntries || d3fendEntries.length === 0) {
    throw new Error("No hay contramedidas D3FEND para esta técnica todavía, nada para resumir.");
  }
  const prompt = buildPrompt(technique, d3fendEntries);
  const numCtx = pickContextWindow(estimateTokens(SYSTEM_PROMPT + prompt));
  if (settings.provider === "ollama") return callOllama(SYSTEM_PROMPT, prompt, settings, { numCtx });
  if (settings.provider === "webllm") return callWebLLM(SYSTEM_PROMPT, prompt, settings, { numCtx, onProgress });
  throw new Error('IA local no configurada. Elegí un proveedor ("Ollama" o "en el navegador") en Configurar.');
}

/**
 * Resumen de TODA una capa de modelado de amenazas, en modo "executive" (default) o
 * "technical": recibe las filas ya armadas por src/lib/layerAISummary.js (técnicas
 * anotadas + sus D3FEND, ya recortadas/priorizadas ahí si la capa es grande, y con más
 * o menos detalle de implementación según el modo) y la tabla de frecuencia de
 * contramedidas (ya calculada en JS, no la calcula el modelo). Igual que
 * generateMitigationSummary, agnóstico al dominio.
 */
export async function generateLayerSummary({ promptBody, settings, onProgress, mode = "executive" }) {
  const systemPrompt = mode === "technical" ? LAYER_TECHNICAL_SYSTEM_PROMPT : LAYER_EXECUTIVE_SYSTEM_PROMPT;
  const numCtx = pickContextWindow(estimateTokens(systemPrompt + promptBody));
  if (settings.provider === "ollama") return callOllama(systemPrompt, promptBody, settings, { numCtx });
  if (settings.provider === "webllm") {
    return callWebLLM(systemPrompt, promptBody, settings, { numCtx, onProgress });
  }
  throw new Error('IA local no configurada. Elegí un proveedor ("Ollama" o "en el navegador") en Configurar.');
}