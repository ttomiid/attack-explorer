import { useState } from "react";
import { tacticColor } from "../lib/tacticColors";
import { d3fendTacticColor } from "../lib/d3fendTacticColors";
import { loadAISettings, isAIConfigured, generateMitigationSummary } from "../lib/localAI";
import AISettingsModal from "./AISettingsModal";
import Tag from "./Tag";

export default function DetailPanel({ entityType, entity, data, onClose, onNavigate, onGenerateLayer }) {
  if (!entity) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <div>
          <p className="font-mono text-4xl text-ink-700 mb-3">◇</p>
          <p className="font-mono text-sm text-ink-500">
            Seleccioná un elemento
            <br />
            para ver el detalle completo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-ink-900/95 backdrop-blur border-b border-ink-800 px-5 py-3 flex items-center justify-between z-10">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          {entityType === "technique" && "Técnica"}
          {entityType === "group" && "Grupo de amenaza"}
          {entityType === "software" && (entity.type === "tool" ? "Herramienta" : "Malware")}
          {entityType === "mitigation" && "Mitigación"}
        </span>
        <button onClick={onClose} className="text-ink-500 hover:text-ink-200 font-mono lg:hidden" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div className="px-5 py-5">
        {entityType === "technique" && (
          <TechniqueDetail entity={entity} data={data} onNavigate={onNavigate} />
        )}
        {entityType === "group" && (
          <GroupDetail entity={entity} data={data} onNavigate={onNavigate} onGenerateLayer={onGenerateLayer} />
        )}
        {entityType === "software" && (
          <SoftwareDetail entity={entity} data={data} onNavigate={onNavigate} onGenerateLayer={onGenerateLayer} />
        )}
        {entityType === "mitigation" && <MitigationDetail entity={entity} data={data} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

function Section({ title, children, count }) {
  return (
    <section className="mt-6">
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-ink-500 mb-2 flex items-center gap-2">
        {title}
        {count !== undefined && <span className="text-ink-600">({count})</span>}
      </h3>
      {children}
    </section>
  );
}

export function TechniqueDetail({ entity: t, data, onNavigate, onInsertToLayerComment }) {
  const parent = t.parent_id ? data.techniqueById.get(t.parent_id) : null;
  const subs = t.subtechniques.map((id) => data.techniqueById.get(id)).filter(Boolean);

  return (
    <div>
      {parent && (
        <button
          onClick={() => onNavigate("technique", parent)}
          className="text-[11px] font-mono text-signal-cyan hover:underline mb-2 block"
        >
          ← {parent.id} {parent.name}
        </button>
      )}
      <p className="font-mono text-xs text-ink-500">{t.id}</p>
      <h2 className="font-sans text-xl font-semibold text-ink-100 mt-1">{t.name}</h2>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {t.tactics.map((tacName) => {
          const tac = data.tacticByShortname.get(tacName);
          if (!tac) return null;
          return (
            <Tag key={tacName} color={tacticColor(tac.index)}>
              {tac.name}
            </Tag>
          );
        })}
      </div>

      <p className="text-sm text-ink-300 leading-relaxed mt-4 whitespace-pre-line">{t.description}</p>

      <dl className="grid grid-cols-2 gap-3 mt-5 text-xs">
        <Meta label="Plataformas" value={t.platforms.join(", ")} />
        <Meta label="Versión" value={t.version} />
        <Meta label="Creada" value={t.created} />
        <Meta label="Modificada" value={t.modified} />
        {t.permissions_required.length > 0 && (
          <Meta label="Permisos requeridos" value={t.permissions_required.join(", ")} />
        )}
        {t.defense_bypassed.length > 0 && <Meta label="Defensas evadidas" value={t.defense_bypassed.join(", ")} />}
        {t.effective_permissions.length > 0 && (
          <Meta label="Permisos efectivos" value={t.effective_permissions.join(", ")} />
        )}
        {t.system_requirements.length > 0 && (
          <Meta label="Requisitos de sistema" value={t.system_requirements.join(", ")} />
        )}
        {t.impact_type.length > 0 && <Meta label="Tipo de impacto" value={t.impact_type.join(", ")} />}
        {t.data_sources.length > 0 && <Meta label="Fuentes de datos" value={t.data_sources.join(", ")} />}
      </dl>

      {t.detection && (
        <Section title="Detección">
          <p className="text-sm text-ink-300 leading-relaxed whitespace-pre-line">{t.detection}</p>
        </Section>
      )}

      {t.detection_strategies.length > 0 && (
        <Section title="Estrategias de detección" count={t.detection_strategies.length}>
          <div className="space-y-3">
            {t.detection_strategies.map((ds, i) => (
              <div key={i} className="border border-ink-800 rounded-lg p-3 bg-ink-900/50">
                <p className="text-sm text-ink-100 font-medium">{ds.name}</p>
                {ds.description && <p className="text-xs text-ink-400 mt-1">{ds.description}</p>}
                {ds.analytics?.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {ds.analytics.map((an, j) => (
                      <li key={j} className="text-xs bg-ink-850 rounded-md p-2 border border-ink-800">
                        <p className="text-ink-200">{an.description}</p>
                        {an.log_sources?.length > 0 && (
                          <p className="mt-1 font-mono text-[10px] text-ink-500">
                            fuentes: {an.log_sources.map((ls) => ls.data_component || ls.name).join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {subs.length > 0 && (
        <Section title="Sub-técnicas" count={subs.length}>
          <div className="flex flex-col gap-1.5">
            {subs.map((s) => (
              <button
                key={s.id}
                onClick={() => onNavigate("technique", s)}
                className="text-left px-3 py-2 rounded-md border border-ink-800 hover:border-ink-600 hover:bg-ink-850 text-sm"
              >
                <span className="font-mono text-[10px] text-ink-500 mr-2">{s.id}</span>
                {s.name}
              </button>
            ))}
          </div>
        </Section>
      )}

      {t.mitigations.length > 0 && (
        <Section title="Mitigaciones" count={t.mitigations.length}>
          <div className="space-y-2">
            {t.mitigations.map((m) => {
              const full = data.mitigationById.get(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => full && onNavigate("mitigation", full)}
                  className="w-full text-left border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
                >
                  <p className="text-sm text-ink-100 font-medium">
                    <span className="font-mono text-[10px] text-ink-500 mr-1.5">{m.id}</span>
                    {m.name}
                  </p>
                  <p className="text-xs text-ink-400 mt-1">{m.description}</p>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <D3fendSection technique={t} data={data} onInsertToComment={onInsertToLayerComment} />

      {t.groups.length > 0 && (
        <Section title="Grupos que la utilizan" count={t.groups.length}>
          <div className="space-y-2">
            {t.groups.map((g) => {
              const full = data.groupById.get(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => full && onNavigate("group", full)}
                  className="w-full text-left border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
                >
                  <p className="text-sm text-ink-100 font-medium">
                    <span className="font-mono text-[10px] text-ink-500 mr-1.5">{g.id}</span>
                    {g.name}
                  </p>
                  {g.description && <p className="text-xs text-ink-400 mt-1">{g.description}</p>}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {t.software.length > 0 && (
        <Section title="Software asociado" count={t.software.length}>
          <div className="space-y-2">
            {t.software.map((s) => {
              const full = data.softwareById.get(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => full && onNavigate("software", full)}
                  className="w-full text-left border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
                >
                  <p className="text-sm text-ink-100 font-medium">
                    <span className="font-mono text-[10px] text-ink-500 mr-1.5">{s.id}</span>
                    {s.name}
                    <span className="ml-2 text-[10px] font-mono text-ink-500 uppercase">{s.type}</span>
                  </p>
                  {s.description && <p className="text-xs text-ink-400 mt-1">{s.description}</p>}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <ReferencesSection references={t.references} url={t.url} />
    </div>
  );
}

function D3fendSection({ technique, data, onInsertToComment }) {
  const status = data.d3fendStatus;
  const entries = data.d3fendMappings?.get(technique.id);

  if (status === "unavailable") {
    return (
      <Section title="Contramedidas D3FEND">
        <p className="text-xs text-ink-500 leading-relaxed border border-dashed border-ink-700 rounded-lg p-3">
          {data.domain === "mobile" ? (
            <>
              MITRE D3FEND todavía no publica mapeos oficiales para ATT&amp;CK Mobile (solo cubre
              Enterprise, ICS y SPARTA). Esta sección va a quedar vacía para este dominio hasta que
              MITRE los agregue.
            </>
          ) : (
            <>
              Todavía no se generó <code className="text-ink-400">d3fend-mappings-{data.domain}.json</code>.
              Corré <code className="text-ink-400">./scripts/update-d3fend-data.sh</code> (o esperá a que
              corra el workflow de GitHub Actions) para habilitar esta sección.
            </>
          )}
        </p>
      </Section>
    );
  }

  if (!entries || entries.length === 0) return null;

  return (
    <Section title="Contramedidas D3FEND" count={entries.length}>
      <p className="text-[11px] text-ink-500 -mt-1 mb-2">
        Técnicas defensivas de{" "}
        <a
          href="https://d3fend.mitre.org/"
          target="_blank"
          rel="noreferrer"
          className="text-signal-cyan hover:underline"
        >
          MITRE D3FEND
        </a>{" "}
        que actúan sobre los mismos artefactos que esta técnica ofensiva.
      </p>
      <div className="space-y-2">
        {entries.map((d) => (
          <a
            key={d.id || d.name}
            href={d.url || undefined}
            target={d.url ? "_blank" : undefined}
            rel={d.url ? "noreferrer" : undefined}
            className="block border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {d.tactic && <Tag color={d3fendTacticColor(d.tactic)}>{d.tactic}</Tag>}
              <p className="text-sm text-ink-100 font-medium">
                {d.id && <span className="font-mono text-[10px] text-ink-500 mr-1.5">{d.id}</span>}
                {d.name}
              </p>
            </div>
            {d.definition && <p className="text-xs text-ink-400 mt-1.5">{d.definition}</p>}
            {d.mechanisms?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {d.mechanisms.map((m, i) => (
                  <li key={i} className="text-[11px] font-mono text-ink-500">
                    {d.name} {m.defends} {m.defended_artifact} — la técnica {m.attack_rel} {m.attack_artifact}
                  </li>
                ))}
              </ul>
            )}
          </a>
        ))}
      </div>
      <AIMitigationSummary technique={technique} entries={entries} onInsertToComment={onInsertToComment} />
    </Section>
  );
}

function AIMitigationSummary({ technique, entries, onInsertToComment }) {
  const [settings, setSettings] = useState(loadAISettings);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [inserted, setInserted] = useState(false);

  const configured = isAIConfigured(settings);

  const generate = async () => {
    setState("loading");
    setError("");
    setProgress("");
    setInserted(false);
    try {
      const result = await generateMitigationSummary({
        technique,
        d3fendEntries: entries,
        settings,
        onProgress: (p) => setProgress(p?.text || ""),
      });
      setText(result);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  };

  return (
    <div className="mt-3 border border-dashed border-ink-700 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">
          Resumen de mitigación con IA local
        </p>
        <button
          onClick={() => setShowSettings(true)}
          className="font-mono text-[11px] text-ink-500 hover:text-ink-200"
        >
          configurar
        </button>
      </div>

      {!configured ? (
        <p className="text-xs text-ink-500 mt-2">
          No configuraste ninguna IA local todavía.{" "}
          <button onClick={() => setShowSettings(true)} className="text-signal-cyan hover:underline">
            Configurar ahora
          </button>
        </p>
      ) : (
        <>
          {state !== "loading" && (
            <button
              onClick={generate}
              className="mt-2 px-3 py-1.5 rounded-md border border-ink-700 hover:border-signal-cyan/60 text-ink-200 font-mono text-[11px] transition-colors"
            >
              {state === "done" ? "regenerar" : "generar resumen"}
            </button>
          )}
          {state === "loading" && (
            <p className="text-xs text-ink-400 mt-2 font-mono">
              generando{progress ? ` — ${progress}` : "…"}
            </p>
          )}
          {state === "error" && <p className="text-xs text-signal-red mt-2 leading-relaxed">{error}</p>}
          {state === "done" && (
            <div className="mt-2">
              <p className="text-sm text-ink-200 leading-relaxed whitespace-pre-line">{text}</p>
              {onInsertToComment && (
                <button
                  onClick={() => {
                    onInsertToComment(text);
                    setInserted(true);
                  }}
                  className="mt-2 px-3 py-1.5 rounded-md bg-signal-cyan/90 hover:bg-signal-cyan text-ink-950 font-mono text-[11px] font-semibold transition-colors"
                >
                  {inserted ? "insertado en el comentario ✓" : "insertar como comentario de la anotación"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {showSettings && (
        <AISettingsModal
          onClose={() => {
            setShowSettings(false);
            setSettings(loadAISettings());
          }}
        />
      )}
    </div>
  );
}

function GroupDetail({ entity: g, data, onNavigate, onGenerateLayer }) {
  const uses = data.groupTechniques.get(g.id) || [];
  return (
    <div>
      <p className="font-mono text-xs text-ink-500">{g.id}</p>
      <h2 className="font-sans text-xl font-semibold text-ink-100 mt-1">{g.name}</h2>
      {g.aliases?.length > 0 && (
        <p className="text-xs text-ink-500 mt-2 font-mono">alias: {g.aliases.join(", ")}</p>
      )}
      <p className="text-sm text-ink-300 leading-relaxed mt-4 whitespace-pre-line">{g.description}</p>

      {uses.length > 0 && onGenerateLayer && (
        <button
          onClick={() => onGenerateLayer("group", g)}
          className="mt-4 w-full text-left border border-signal-cyan/40 hover:border-signal-cyan rounded-lg px-3 py-2.5 bg-signal-cyan/10 text-xs text-ink-100 transition-colors"
        >
          <span className="font-mono text-signal-cyan">◈ Generar capa de amenaza</span>
          <br />
          Crea una capa en "Modelado de amenazas" con las {uses.length} técnicas de {g.name} ya anotadas.
        </button>
      )}

      {uses.length > 0 && (
        <Section title="Técnicas observadas" count={uses.length}>
          <div className="space-y-2">
            {uses.map((u, i) => {
              const full = data.techniqueById.get(u.techniqueId);
              return (
                <button
                  key={i}
                  onClick={() => full && onNavigate("technique", full)}
                  className="w-full text-left border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
                >
                  <p className="text-sm text-ink-100 font-medium">
                    <span className="font-mono text-[10px] text-ink-500 mr-1.5">{u.techniqueId}</span>
                    {u.techniqueName}
                  </p>
                  {u.usage && <p className="text-xs text-ink-400 mt-1">{u.usage}</p>}
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function SoftwareDetail({ entity: s, data, onNavigate, onGenerateLayer }) {
  const uses = data.softwareTechniques.get(s.id) || [];
  return (
    <div>
      <p className="font-mono text-xs text-ink-500">{s.id}</p>
      <h2 className="font-sans text-xl font-semibold text-ink-100 mt-1">{s.name}</h2>
      <Tag color="#96a7b3">{s.type === "tool" ? "herramienta" : "malware"}</Tag>
      {s.platforms?.length > 0 && (
        <p className="text-xs text-ink-500 mt-2 font-mono">plataformas: {s.platforms.join(", ")}</p>
      )}
      {s.aliases?.length > 0 && (
        <p className="text-xs text-ink-500 mt-1 font-mono">alias: {s.aliases.join(", ")}</p>
      )}
      <p className="text-sm text-ink-300 leading-relaxed mt-4 whitespace-pre-line">{s.description}</p>

      {uses.length > 0 && onGenerateLayer && (
        <button
          onClick={() => onGenerateLayer("software", s)}
          className="mt-4 w-full text-left border border-signal-cyan/40 hover:border-signal-cyan rounded-lg px-3 py-2.5 bg-signal-cyan/10 text-xs text-ink-100 transition-colors"
        >
          <span className="font-mono text-signal-cyan">◈ Generar capa de amenaza</span>
          <br />
          Crea una capa en "Modelado de amenazas" con las {uses.length} técnicas de {s.name} ya anotadas.
        </button>
      )}

      {uses.length > 0 && (
        <Section title="Técnicas implementadas" count={uses.length}>
          <div className="space-y-2">
            {uses.map((u, i) => {
              const full = data.techniqueById.get(u.techniqueId);
              return (
                <button
                  key={i}
                  onClick={() => full && onNavigate("technique", full)}
                  className="w-full text-left border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
                >
                  <p className="text-sm text-ink-100 font-medium">
                    <span className="font-mono text-[10px] text-ink-500 mr-1.5">{u.techniqueId}</span>
                    {u.techniqueName}
                  </p>
                  {u.usage && <p className="text-xs text-ink-400 mt-1">{u.usage}</p>}
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function MitigationDetail({ entity: m, data, onNavigate }) {
  const uses = data.mitigationTechniques.get(m.id) || [];
  return (
    <div>
      <p className="font-mono text-xs text-ink-500">{m.id}</p>
      <h2 className="font-sans text-xl font-semibold text-ink-100 mt-1">{m.name}</h2>
      <p className="text-sm text-ink-300 leading-relaxed mt-4 whitespace-pre-line">{m.description}</p>

      {uses.length > 0 && (
        <Section title="Mitiga estas técnicas" count={uses.length}>
          <div className="space-y-2">
            {uses.map((u, i) => {
              const full = data.techniqueById.get(u.techniqueId);
              return (
                <button
                  key={i}
                  onClick={() => full && onNavigate("technique", full)}
                  className="w-full text-left border border-ink-800 hover:border-ink-600 rounded-lg p-3 bg-ink-900/50"
                >
                  <p className="text-sm text-ink-100 font-medium">
                    <span className="font-mono text-[10px] text-ink-500 mr-1.5">{u.techniqueId}</span>
                    {u.techniqueName}
                  </p>
                  {u.usage && <p className="text-xs text-ink-400 mt-1">{u.usage}</p>}
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-ink-500 font-mono">{label}</dt>
      <dd className="text-ink-200 mt-0.5">{value}</dd>
    </div>
  );
}

function ReferencesSection({ references, url }) {
  if ((!references || references.length === 0) && !url) return null;
  return (
    <Section title="Referencias" count={references?.length}>
      <ul className="space-y-1.5">
        {url && (
          <li>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-signal-cyan hover:underline break-words"
            >
              ↗ Ver en attack.mitre.org
            </a>
          </li>
        )}
        {references?.map((r, i) => (
          <li key={i} className="text-xs">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="text-ink-400 hover:text-signal-cyan hover:underline break-words">
                {r.source || r.url}
              </a>
            ) : (
              <span className="text-ink-500">{r.source}</span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}