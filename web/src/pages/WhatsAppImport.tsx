import { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer, SuggestedReminder, WhatsAppAnalysis } from '../../../src/shared/types';
import { analyzeWhatsApp, commitWhatsApp, getCustomer } from '../api';
import { Transcript } from '../components/crm';
import { AiProgress, ErrorNote, Icon, Spinner } from '../components/ui';
import { addDaysISO, formatBudget, formatDate, purposeLabel, residencyLabel, todayISO } from '../format';
import { navigate } from '../router';

const MAX = 5;
const STEPS = ['Uploading screenshots…', 'Reading screenshots with Gemini…', 'Working out who this is…', 'Pulling out facts and follow-ups…'];

type FactKey = keyof WhatsAppAnalysis['facts'];

function factRows(f: WhatsAppAnalysis['facts']): { key: FactKey; label: string; value: string }[] {
  const rows: { key: FactKey; label: string; value: string }[] = [];
  if (f.residency) rows.push({ key: 'residency', label: 'Residency', value: residencyLabel[f.residency] });
  if (f.purpose) rows.push({ key: 'purpose', label: 'Purpose', value: purposeLabel[f.purpose] });
  if (f.propertiesOwned !== null) rows.push({ key: 'propertiesOwned', label: 'Properties owned', value: String(f.propertiesOwned) });
  if (f.household) rows.push({ key: 'household', label: 'Household', value: f.household });
  if (f.budgetMinSgd !== null) rows.push({ key: 'budgetMinSgd', label: 'Budget from', value: formatBudget(f.budgetMinSgd, null).replace('From ', '') });
  if (f.budgetMaxSgd !== null) rows.push({ key: 'budgetMaxSgd', label: 'Budget up to', value: formatBudget(null, f.budgetMaxSgd).replace('Up to ', '') });
  if (f.areas.length) rows.push({ key: 'areas', label: 'Areas', value: f.areas.join(', ') });
  if (f.bedrooms.length) rows.push({ key: 'bedrooms', label: 'Bedrooms', value: f.bedrooms.join(', ') });
  if (f.segments.length) rows.push({ key: 'segments', label: 'Segments', value: f.segments.join(', ') });
  if (f.executiveCondo !== null) rows.push({ key: 'executiveCondo', label: 'Executive condo', value: f.executiveCondo ? 'Yes' : 'No' });
  if (f.timeline) rows.push({ key: 'timeline', label: 'Timeline', value: f.timeline });
  return rows;
}

function clearFact(f: WhatsAppAnalysis['facts'], k: FactKey): WhatsAppAnalysis['facts'] {
  const empty = Array.isArray(f[k]) ? [] : null;
  return { ...f, [k]: empty };
}

export function WhatsAppImport({ customerId }: { customerId: string | null }) {
  const [files, setFiles] = useState<File[]>([]);
  const [target, setTarget] = useState<Customer | null>(null);
  const [phase, setPhase] = useState<'pick' | 'reading' | 'review'>('pick');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WhatsAppAnalysis | null>(null);

  useEffect(() => {
    if (customerId)
      getCustomer(customerId)
        .then((d) => setTarget(d.customer))
        .catch(() => undefined);
  }, [customerId]);

  const add = (list: FileList | File[] | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setFiles((cur) => [...cur, ...imgs].slice(0, MAX));
  };

  useEffect(() => {
    if (phase !== 'pick') return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.files ?? []);
      if (items.length) {
        e.preventDefault();
        add(items);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [phase]);

  async function read() {
    setPhase('reading');
    setError(null);
    try {
      setAnalysis(await analyzeWhatsApp(files));
      setPhase('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('pick');
    }
  }

  return (
    <div className="page">
      <a className="back" href={customerId ? `#/customers/${customerId}` : '#/customers'}>
        <Icon name="back" size={14} /> {target ? target.fullName : 'Customers'}
      </a>
      <header className="page-head">
        <div>
          <h1>Import WhatsApp chat</h1>
          <p className="page-sub">
            {phase === 'review'
              ? 'Check what Copilot found. Nothing is saved until you confirm.'
              : 'Add screenshots of the conversation. Copilot reads them, works out who it is, and drafts the note and follow-ups for you to check.'}
          </p>
        </div>
      </header>

      {error && <ErrorNote message={`Couldn't read the screenshots: ${error}`} />}

      {phase === 'pick' && <Picker files={files} setFiles={setFiles} add={add} target={target} onRead={read} />}
      {phase === 'reading' && (
        <div className="card extracting">
          <h2 className="serif wa-reading-title">Reading {files.length === 1 ? 'the screenshot' : `${files.length} screenshots`}</h2>
          <Thumbs files={files} />
          <AiProgress steps={STEPS} />
        </div>
      )}
      {phase === 'review' && analysis && <Review analysis={analysis} target={target} onBack={() => setPhase('pick')} />}
    </div>
  );
}

function Thumbs({ files, onRemove }: { files: File[]; onRemove?: (i: number) => void }) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <ul className="wa-thumbs">
      {urls.map((u, i) => (
        <li key={u}>
          <img src={u} alt={`Screenshot ${i + 1}`} />
          {onRemove && (
            <button type="button" onClick={() => onRemove(i)} aria-label={`Remove screenshot ${i + 1}`}>
              <Icon name="close" size={12} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Picker({
  files,
  setFiles,
  add,
  target,
  onRead,
}: {
  files: File[];
  setFiles: (f: File[]) => void;
  add: (l: FileList | File[] | null) => void;
  target: Customer | null;
  onRead: () => void;
}) {
  const lib = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const full = files.length >= MAX;
  return (
    <section className="card wa-pick">
      {target && (
        <p className="wa-target">
          <Icon name="user" size={14} /> Adding to <strong>{target.fullName}</strong>
        </p>
      )}
      <input ref={lib} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
      <div
        className={`dropzone wa-drop${over ? ' over' : ''}${full ? ' disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        onClick={() => !full && lib.current?.click()}
        role="button"
        tabIndex={0}
      >
        <span className="dropzone-icon">
          <Icon name="message" size={20} />
        </span>
        <span className="dropzone-text">
          <strong>Drop 1 to 5 chat screenshots, or paste them</strong>
          <span>Scroll the chat and take a screenshot of each part. Cmd/Ctrl+V works too.</span>
        </span>
      </div>
      <div className="pick-mobile">
        <p className="pick-hint">Screenshot the chat in WhatsApp, then pick the images here (up to 5).</p>
        <div className="pick-buttons">
          <button type="button" className="btn btn-primary btn-touch" disabled={full} onClick={() => lib.current?.click()}>
            <Icon name="upload" size={18} /> Choose screenshots
          </button>
          <button type="button" className="btn btn-secondary btn-touch" disabled={full} onClick={() => cam.current?.click()}>
            <Icon name="camera" size={18} /> Take photo
          </button>
        </div>
      </div>
      {files.length > 0 && <Thumbs files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />}
      <div className="form-actions">
        <span className="muted small wa-count">
          {files.length}/{MAX} screenshots
        </span>
        <button className="btn btn-primary" disabled={!files.length} onClick={onRead}>
          <Icon name="spark" size={15} /> Read with Copilot
        </button>
      </div>
    </section>
  );
}

function Review({ analysis, target, onBack }: { analysis: WhatsAppAnalysis; target: Customer | null; onBack: () => void }) {
  const candidates = useMemo(() => {
    const list = [...analysis.candidates].sort((a, b) => b.confidence - a.confidence);
    if (target && !list.some((c) => c.customerId === target.id))
      list.unshift({ customerId: target.id, fullName: target.fullName, phone: target.phone, confidence: -1, why: 'You opened this import from their page.' });
    return list;
  }, [analysis, target]);
  const best = target?.id ?? (candidates[0] && candidates[0].confidence >= 0.6 ? candidates[0].customerId : null);
  const [who, setWho] = useState<string | 'NEW' | null>(best ?? (candidates.length ? null : 'NEW'));
  const [newName, setNewName] = useState(analysis.contactName ?? '');
  const [summary, setSummary] = useState(analysis.summary);
  const [points, setPoints] = useState<string[]>(analysis.keyPoints);
  const [applyFacts, setApplyFacts] = useState(true);
  const facts = useMemo(() => factRows(analysis.facts), [analysis]);
  const [factOn, setFactOn] = useState<Set<FactKey>>(new Set(facts.map((f) => f.key)));
  const [rems, setRems] = useState<Array<SuggestedReminder & { keep: boolean }>>(analysis.suggestedReminders.map((r) => ({ ...r, keep: true })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whoName = who === 'NEW' ? newName.trim() || 'new customer' : candidates.find((c) => c.customerId === who)?.fullName;
  const canSave = who !== null && (who !== 'NEW' || newName.trim()) && summary.trim();

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    let f = analysis.facts;
    for (const row of facts) if (!factOn.has(row.key)) f = clearFact(f, row.key);
    try {
      const d = await commitWhatsApp({
        analysis: { ...analysis, summary: summary.trim(), keyPoints: points.map((p) => p.trim()).filter(Boolean), facts: f },
        customerId: who === 'NEW' ? null : who,
        newCustomerName: who === 'NEW' ? newName.trim() : null,
        applyFacts: applyFacts && factOn.size > 0,
        reminders: rems.filter((r) => r.keep && r.title.trim()).map(({ keep: _k, ...r }) => ({ ...r, title: r.title.trim() })),
      });
      const note = d.notes.find((n) => n.source === 'WHATSAPP_AI') ?? d.notes[0];
      navigate(`/customers/${d.customer.id}${note ? `?note=${note.id}` : ''}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className="wa-review">
      <div className="wa-col">
        <section className="card">
          <div className="card-head">
            <h2>Conversation</h2>
            <span className="card-hint">
              {analysis.transcript.length} messages{analysis.occurredAt ? `, ${formatDate(analysis.occurredAt)}` : ''}
            </span>
          </div>
          <div className="wa-header-bar">
            <span className="cust-avatar small">{(analysis.contactName ?? '?').slice(0, 1)}</span>
            <span>
              <strong>{analysis.contactName ?? 'Unknown contact'}</strong>
              {analysis.contactPhone && <span className="cell-sub">{analysis.contactPhone}</span>}
            </span>
          </div>
          <Transcript messages={analysis.transcript} />
        </section>
      </div>

      <div className="wa-col">
        <section className="card">
          <div className="card-head">
            <h2>Who is this?</h2>
            <span className="card-hint">Confirm before saving</span>
          </div>
          <ul className="who-list" role="radiogroup">
            {candidates.map((c) => (
              <li key={c.customerId}>
                <label className={`who${who === c.customerId ? ' on' : ''}`}>
                  <input type="radio" name="who" checked={who === c.customerId} onChange={() => setWho(c.customerId)} />
                  <span className="who-main">
                    <strong>{c.fullName}</strong>
                    <span className="cell-sub">
                      {c.phone ?? 'No phone'} · {c.why}
                    </span>
                  </span>
                  {c.confidence >= 0 && (
                    <span className={`conf ${c.confidence >= 0.8 ? 'hi' : c.confidence >= 0.5 ? 'mid' : 'lo'}`}>{Math.round(c.confidence * 100)}%</span>
                  )}
                </label>
              </li>
            ))}
            <li>
              <label className={`who${who === 'NEW' ? ' on' : ''}`}>
                <input type="radio" name="who" checked={who === 'NEW'} onChange={() => setWho('NEW')} />
                <span className="who-main">
                  <strong>New customer</strong>
                  {who === 'NEW' ? (
                    <input className="who-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Customer name" autoFocus />
                  ) : (
                    <span className="cell-sub">Create a new customer from this chat</span>
                  )}
                </span>
              </label>
            </li>
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Summary</h2>
            <span className="card-hint">Saved as a Discussion note</span>
          </div>
          <div className="pad stack">
            <textarea className="ta" rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} />
            <span className="sub-label">Key points</span>
            <ul className="kp-edit">
              {points.map((p, i) => (
                <li key={i}>
                  <input value={p} onChange={(e) => setPoints(points.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" className="icon-btn" onClick={() => setPoints(points.filter((_, j) => j !== i))} aria-label="Remove key point">
                    <Icon name="close" size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="link-btn" onClick={() => setPoints([...points, ''])}>
              <Icon name="plus" size={12} /> Add key point
            </button>
          </div>
        </section>

        {facts.length > 0 && (
          <section className="card">
            <div className="card-head">
              <h2>Facts found</h2>
              <label className="switch">
                <input type="checkbox" checked={applyFacts} onChange={(e) => setApplyFacts(e.target.checked)} />
                <span className="switch-track" />
                Update profile
              </label>
            </div>
            <ul className={`fact-list${applyFacts ? '' : ' off'}`}>
              {facts.map((f) => (
                <li key={f.key}>
                  <label>
                    <input
                      type="checkbox"
                      disabled={!applyFacts}
                      checked={factOn.has(f.key)}
                      onChange={(e) => {
                        const n = new Set(factOn);
                        if (e.target.checked) n.add(f.key);
                        else n.delete(f.key);
                        setFactOn(n);
                      }}
                    />
                    <span className="fact-label">{f.label}</span>
                    <span className="fact-value">{f.value}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card">
          <div className="card-head">
            <h2>Suggested follow-ups</h2>
            <span className="card-hint">Saved as reminders</span>
          </div>
          <ul className="fu-edit">
            {rems.map((r, i) => {
              const set = (p: Partial<SuggestedReminder & { keep: boolean }>) => setRems(rems.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <li key={i} className={r.keep ? '' : 'off'}>
                  <input type="checkbox" checked={r.keep} onChange={(e) => set({ keep: e.target.checked })} aria-label="Keep this follow-up" />
                  <div className="fu-edit-fields">
                    <input value={r.title} onChange={(e) => set({ title: e.target.value })} placeholder="Follow-up" />
                    <div className="fu-edit-row">
                      <input type="date" value={r.dueDate} min={todayISO()} onChange={(e) => set({ dueDate: e.target.value })} />
                      <input value={r.detail ?? ''} onChange={(e) => set({ detail: e.target.value || null })} placeholder="Detail (optional)" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="pad-x pad-b">
            <button
              type="button"
              className="link-btn"
              onClick={() => setRems([...rems, { title: '', detail: null, dueDate: addDaysISO(todayISO(), 1), keep: true }])}
            >
              <Icon name="plus" size={12} /> Add another
            </button>
          </div>
        </section>

        {error && <ErrorNote message={`Couldn't save: ${error}`} />}
        <div className="wa-save">
          <button className="btn btn-ghost" onClick={onBack} disabled={saving}>
            Back
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!canSave || saving}>
            {saving ? <Spinner size={14} /> : <Icon name="check" size={15} />}
            {who === null ? 'Choose who this is' : `Save to ${whoName}`}
          </button>
        </div>
      </div>
    </div>
  );
}
