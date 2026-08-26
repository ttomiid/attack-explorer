# ATT&CK Explorer

<div align="center">
  <img width="248" height="248" alt="overview" src="https://github.com/user-attachments/assets/943565b2-c8df-47f1-8b5a-9709e84247f9" />
</div>


Buscador y explorador con **máximo nivel de detalle** del framework [MITRE ATT&CK® Enterprise](https://attack.mitre.org/): tácticas, técnicas, sub-técnicas, mitigaciones, estrategias de detección/analíticas, grupos de amenaza (APTs) y software (malware/herramientas), con todas sus relaciones cruzadas.

## Qué incluye

- **Vista Matriz**: réplica del layout oficial de ATT&CK Navigator, columnas por táctica con un gradiente de color que representa la progresión de la kill chain (Reconnaissance → Impact).
- **Vista Lista**: resultados de búsqueda en formato de lista compacta.
- **Búsqueda** por ID, nombre o texto libre en la descripción, con ranking de relevancia.
- **Filtros**: por táctica y por plataforma (Windows, Linux, macOS, cloud, identity provider, etc.), con opción de incluir/excluir sub-técnicas.
- **4 tipos de entidad navegables**: Técnicas, Grupos, Software, Mitigaciones — cada una con su propio buscador y panel de detalle.
- **Panel de detalle exhaustivo** por técnica: descripción completa, plataformas, permisos requeridos, defensas evadidas, sub-técnicas, mitigaciones asociadas (con el texto exacto de cómo mitigan), grupos que la usan (con cita de uso real), software que la implementa, estrategias de detección con sus analíticas y fuentes de log, y referencias externas con enlaces.
- Navegación cruzada: desde una técnica podés saltar a un grupo, de un grupo a las técnicas que usa, de una técnica a sus mitigaciones, etc.

## Modelado de amenazas (estilo ATT&CK Navigator)

Además del explorador, el proyecto incluye un módulo de **modelado de amenazas por capas**, inspirado en el [ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/) oficial de MITRE:

- **Capas (layers)**: creá, renombrá, duplicá y borrá tantas capas como quieras. Cada capa guarda, por técnica: color, score numérico, comentario y estado habilitada/deshabilitada.
- **Dos modos de color**: manual (paleta fija) o gradiente por score (configurable: colores y rango min/max), igual que el "color setup" del Navigator.
- **Selección múltiple**: activá "selección múltiple", elegí varias técnicas en la matriz y aplicales una anotación en lote (por ejemplo, marcar en rojo todas las técnicas sin detección).
- **Import/export de layer JSON 100% compatible con el Navigator oficial** (schema v4.5): podés exportar una capa hecha acá y abrirla en `mitre-attack.github.io/attack-navigator`, o importar una capa real descargada de la página de un grupo en `attack.mitre.org` (ej. el layer de TTPs de APT29) y verla en esta app.
- **Generación automática de capas**: desde el detalle de cualquier Grupo o Software en el explorador, el botón "Generar capa de amenaza" crea una capa nueva con todas sus técnicas conocidas ya anotadas — el punto de partida típico de un ejercicio de threat-informed defense ("¿qué TTPs tengo que cubrir si me preocupa este actor?").
- **Comparar capas (superposición)**: elegí 2 o más capas y combiná su score por técnica (suma, promedio, máximo, mínimo o cantidad de capas donde aparece) en una vista previa sobre la matriz — para ver de un vistazo qué técnicas se repiten entre, por ejemplo, tu capa de detecciones y la de un grupo, o entre varios grupos candidatos. El resultado se puede guardar como una capa nueva.
- **Atribución ("¿qué grupo puede ser?")**: tomando las técnicas anotadas y habilitadas de la capa activa como "TTPs observadas", rankea todos los grupos del dataset por similitud de coseno sobre vectores ponderados por IDF (las técnicas raras — usadas por pocos grupos — pesan más que las genéricas como "PowerShell"). Cada resultado muestra el score, las técnicas que coinciden y las que no, con un botón directo para saltar a "Comparar capas" con tu capa vs. la del grupo candidato preseleccionadas. **Importante**: es un score estadístico de solapamiento, no una atribución forense — la UI lo aclara explícitamente.
- Las capas se guardan en `localStorage` del navegador (no hay backend); `src/lib/layerStore.js` es el único punto a tocar si más adelante querés persistirlas en un servidor propio.

Archivos relevantes:

```
src/lib/
  layerModel.js       # modelo de datos de una capa + anotaciones por técnica
  layerStore.js        # persistencia en localStorage
  colorScale.js         # interpolación de color para el modo gradiente
  navigatorIO.js          # export/import compatible con el layer JSON del Navigator
  layerGenerators.js       # generación de capas desde un Grupo/Software
  layerCombine.js           # combinación de N capas (suma/promedio/máx/mín/cantidad)
  attribution.js             # ranking de grupos por similitud de TTPs (coseno + IDF)
  useD3fendMappings.js         # fetch de los mapeos D3FEND (degrada con gracia si falta)
  d3fendTacticColors.js         # paleta de las 7 tácticas D3FEND
src/components/threatModel/
  ThreatModelView.jsx   # contenedor: 3 sub-vistas (Anotar / Comparar / Atribución)
  LayerToolbar.jsx        # gestión de capas (crear/renombrar/duplicar/borrar/import/export)
  AnnotatedMatrix.jsx      # matriz coloreada por capa (el "heatmap")
  AnnotationEditor.jsx      # panel de edición individual/en lote + ficha completa de la técnica
  LayerComparePanel.jsx      # selección de capas a superponer + preview combinado
  AttributionPanel.jsx        # ranking de grupos candidatos + salto a comparación
  GradientBar.jsx               # leyenda del gradiente
```

Ideas para extender: exportar la matriz como SVG/PNG (el Navigator lo hace con un botón de cámara), sumar Software al ranking de atribución (hoy solo Grupos), o exportar a Excel.

## Fuente de datos

Los datos provienen del bundle STIX 2.1 oficial que MITRE publica en [`github.com/mitre/cti`](https://github.com/mitre/cti) (dominio público / Apache 2.0). Se procesan una vez con un script de Python a un JSON compacto (`public/data/attack-data.json`, ~8 MB) que la app carga y consulta 100% en el cliente — no hay backend ni API keys.

## Cómo correrlo

```bash
npm install
npm run dev       # entorno de desarrollo
npm run build     # build de producción -> dist/
npm run preview   # sirve el build de producción
```

## Contramedidas D3FEND

Cada técnica trae además una sección **"Contramedidas D3FEND"**: las técnicas defensivas de [MITRE D3FEND](https://d3fend.mitre.org/) que actúan sobre los mismos artefactos digitales que la técnica ofensiva (ej. para *Create Process with Token* — T1134.002 — sugiere *Credential Hardening* y *Token Binding*, explicando el mecanismo concreto: "hardens Credential — la técnica copies Access Token"). Cada contramedida muestra su ID D3FEND, táctica (Model/Harden/Detect/Isolate/Deceive/Evict/Restore), definición oficial y un link directo a su página en d3fend.mitre.org.

Los datos salen del mismo tipo de fuente pública que ATT&CK: el catálogo de técnicas (`d3fend.csv`) y las relaciones inferidas D3FEND↔ATT&CK (`d3fend-full-mappings.csv`) que MITRE publica en `d3fend.mitre.org`. Se procesan a `public/data/d3fend-mappings.json` con `scripts/process-d3fend-data.py`, filtrando solo relaciones con técnicas de **ATT&CK Enterprise** (mismo alcance que el resto del proyecto).

Regenerar a mano:

```bash
./scripts/update-d3fend-data.sh
```

Si nunca corriste este script (o el workflow de GitHub Actions todavía no corrió), la sección simplemente no aparece — no rompe nada, solo muestra un aviso indicando cómo generarla.

## Actualizar el dataset

MITRE publica nuevas versiones de ATT&CK periódicamente. Hay dos formas de regenerar `public/data/attack-data.json` con la última versión:

**A mano:**

```bash
./scripts/update-data.sh
```

**Automático (GitHub Actions)**: el workflow `.github/workflows/update-attack-data.yml` corre todos los lunes (y también se puede disparar a mano desde la pestaña *Actions* → *Actualizar datasets de MITRE (ATT&CK + D3FEND)* → *Run workflow*). Descarga tanto el bundle STIX de ATT&CK como los mapeos de D3FEND, regenera ambos datasets y, **solo si algo cambió**, hace commit y push a `main`. Como el workflow de deploy ya reacciona a pushes en `main`, esto deja todo el pipeline automatizado: MITRE actualiza → se regeneran los datasets → se commitean → se redeploya el sitio, sin tocar nada manualmente.

Para que el commit automático funcione necesitás habilitarle permiso de escritura al `GITHUB_TOKEN` del repo: **Settings → Actions → General → Workflow permissions → "Read and write permissions"**. Sin ese cambio el workflow corre bien pero el paso de `git push` falla por permisos.

Ambos caminos usan `scripts/process-attack-data.py`, que solo depende de la librería estándar de Python (sin dependencias que instalar).

## Estructura del proyecto

```
public/
  data/attack-data.json     # dataset procesado (generado, no editar a mano)
scripts/
  process-attack-data.py    # STIX -> JSON compacto
  update-data.sh            # descarga + reprocesa
src/
  lib/
    useAttackData.js        # fetch + construcción de índices inversos
    search.js                # scoring y filtrado
    tacticColors.js          # gradiente de 14 tácticas
  components/
    Header.jsx
    SearchBar.jsx
    FilterPanel.jsx
    Toggle.jsx
    MatrixView.jsx           # vista tipo Navigator
    ListView.jsx              # listas de técnicas / grupos / software / mitigaciones
    DetailPanel.jsx            # panel de detalle por tipo de entidad
    StatusScreens.jsx
    Tag.jsx
  App.jsx
```

## Integrarlo en un proyecto más grande

- Todo el estado vive en `App.jsx` vía hooks locales; no depende de un router ni de contexto global, así que es fácil montarlo como una ruta/sección dentro de otra app.
- `useAttackData()` es el único punto de acceso a los datos — si más adelante querés servir el JSON desde un backend propio en vez de un archivo estático, solo hay que cambiar `DATA_URL` en `src/lib/useAttackData.js`.
- Los componentes son independientes de Tailwind más allá de las clases; si tu proyecto ya usa Tailwind, podés fusionar `tailwind.config.js` (los tokens custom están bajo `theme.extend`).

## Notas legales

ATT&CK® es una marca registrada de The MITRE Corporation. Este proyecto no está afiliado a ni respaldado por MITRE; solo consume su dataset público bajo los términos de [github.com/mitre/cti](https://github.com/mitre/cti).
