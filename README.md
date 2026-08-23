# ATT&CK Explorer

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
- Las capas se guardan en `localStorage` del navegador (no hay backend); `src/lib/layerStore.js` es el único punto a tocar si más adelante querés persistirlas en un servidor propio.

Archivos relevantes:

```
src/lib/
  layerModel.js       # modelo de datos de una capa + anotaciones por técnica
  layerStore.js        # persistencia en localStorage
  colorScale.js         # interpolación de color para el modo gradiente
  navigatorIO.js          # export/import compatible con el layer JSON del Navigator
  layerGenerators.js       # generación de capas desde un Grupo/Software (o combinando varios)
src/components/threatModel/
  ThreatModelView.jsx   # contenedor: capa activa, selección, búsqueda
  LayerToolbar.jsx        # gestión de capas (crear/renombrar/duplicar/borrar/import/export)
  AnnotatedMatrix.jsx      # matriz coloreada por capa (el "heatmap")
  AnnotationEditor.jsx      # panel de edición individual/en lote + config de gradiente
  GradientBar.jsx            # leyenda del gradiente
```

Ideas para extender: exportar la matriz como SVG/PNG (el Navigator lo hace con un botón de cámara), combinar dos capas con una expresión de score (`a+b`) para comparar coberturas, o exportar a Excel.

## Fuente de datos

Los datos provienen del bundle STIX 2.1 oficial que MITRE publica en [`github.com/mitre/cti`](https://github.com/mitre/cti) (dominio público / Apache 2.0). Se procesan una vez con un script de Python a un JSON compacto (`public/data/attack-data.json`, ~8 MB) que la app carga y consulta 100% en el cliente — no hay backend ni API keys.

## Cómo correrlo

```bash
npm install
npm run dev       # entorno de desarrollo
npm run build     # build de producción -> dist/
npm run preview   # sirve el build de producción
```

## Actualizar el dataset

MITRE publica nuevas versiones de ATT&CK periódicamente. Para regenerar `public/data/attack-data.json` con la última versión:

```bash
./scripts/update-data.sh
```

Esto descarga `enterprise-attack.json` desde el repo oficial de MITRE y vuelve a correr `scripts/process-attack-data.py` (solo usa la librería estándar de Python, sin dependencias).

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
