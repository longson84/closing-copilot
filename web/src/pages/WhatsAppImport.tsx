import { useEffect, useMemo, useRef, useState } from 'react';
import type { Customer, SuggestedReminder, WhatsAppAnalysis } from '../../../src/shared/types';
import { analyzeWhatsApp, commitWhatsApp, getCustomer } from '../api';
import { Transcript } from '../components/crm';
import { AiProgress, ErrorNote, Icon, Spinner } from '../components/ui';
import { addDaysISO, formatBudget, formatDate, formatDayMonth, purposeLabel, relationLabel, residencyLabel, serviceTypeLabel, todayISO } from '../format';
import { DATE_ICON } from '../components/family';
import { SERVICE_META } from '../components/services';
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
          <h1>Import from screenshots</h1>
          <p className="page-sub">
            {phase === 'review'
              ? 'Check what Copilot found. Nothing is saved until you confirm.'
              : 'Add screenshots of a WhatsApp chat or a social profile. Copilot reads them, works out who it is, and drafts the note, people, dates and follow-ups for you to check.'}
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
          <strong>Drop 1 to 5 screenshots, or paste them</strong>
          <span>A WhatsApp chat (one screenshot per scroll) or a social profile page. Cmd/Ctrl+V works too.</span>
        </span>
      </div>
      <div className="pick-mobile">
        <p className="pick-hint">Screenshot the WhatsApp chat or their profile, then pick the images here (up to 5).</p>
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

  // ----- About the customer, people, dates, services, social links -----
  const cuKeys = (['company', 'jobTitle', 'birthday'] as const).filter((k) => analysis.customerUpdates[k]);
  const [cuOn, setCuOn] = useState<Set<string>>(new Set(cuKeys));
  const [peopleOn, setPeopleOn] = useState<boolean[]>(analysis.people.map(() => true));
  const [prospects, setProspects] = useState<Set<string>>(new Set(analysis.people.filter((p) => p.isProspect).map((p) => p.name)));
  const [datesOn, setDatesOn] = useState<boolean[]>(analysis.importantDates.map(() => true));
  const [dateVals, setDateVals] = useState<string[]>(analysis.importantDates.map((d) => d.date));
  const [servicesOn, setServicesOn] = useState<boolean[]>(analysis.services.map(() => true));
  const socials = analysis.socialProfiles ?? [];
  const [socialOn, setSocialOn] = useState<boolean[]>(socials.map(() => true));
  const [consentMap, setConsentMap] = useState<Record<string, boolean>>(target ? { [target.id]: !!target.consent.givenAt } : {});
  const [consentTick, setConsentTick] = useState(false);
  const [consentMethod, setConsentMethod] = useState(`WhatsApp, ${formatDate(analysis.occurredAt ?? todayISO())}`);
  useEffect(() => {
    if (who && who !== 'NEW' && consentMap[who] === undefined)
      getCustomer(who)
        .then((d) => setConsentMap((m) => ({ ...m, [who]: !!d.customer.consent.givenAt })))
        .catch(() => undefined);
  }, [who, consentMap]);
  const existingConsent = who && who !== 'NEW' ? consentMap[who] === true : false;
  const hasConsent = existingConsent || consentTick;
  const personalFound = analysis.people.length > 0 || analysis.importantDates.some((d) => d.personName);
  const isPersonalDate = (i: number) => !!analysis.importantDates[i].personName;

  const whoName = who === 'NEW' ? newName.trim() || 'new customer' : candidates.find((c) => c.customerId === who)?.fullName;
  const canSave = who !== null && (who !== 'NEW' || newName.trim()) && summary.trim();

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    let f = analysis.facts;
    for (const row of facts) if (!factOn.has(row.key)) f = clearFact(f, row.key);
    const keptPeople = hasConsent ? analysis.people.filter((_, i) => peopleOn[i]) : [];
    const cu = analysis.customerUpdates;
    try {
      const d = await commitWhatsApp({
        analysis: {
          ...analysis,
          summary: summary.trim(),
          keyPoints: points.map((p) => p.trim()).filter(Boolean),
          facts: f,
          customerUpdates: {
            company: cuOn.has('company') ? cu.company : null,
            jobTitle: cuOn.has('jobTitle') ? cu.jobTitle : null,
            birthday: cuOn.has('birthday') ? cu.birthday : null,
          },
          people: keptPeople,
          importantDates: analysis.importantDates
            .map((d, i) => ({ ...d, date: dateVals[i] || d.date }))
            .filter((d, i) => datesOn[i] && (hasConsent || !d.personName)),
          services: analysis.services.filter((_, i) => servicesOn[i]),
          socialProfiles: socials.filter((_, i) => socialOn[i]),
        },
        consentGiven: hasConsent,
        consentMethod: consentTick ? consentMethod.trim() || null : null,
        createCustomersFor: keptPeople.filter((p) => prospects.has(p.name)).map((p) => p.name),
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

        {cuKeys.length + socials.length > 0 && (
          <section className="card">
            <div className="card-head">
              <h2>About the customer</h2>
            </div>
            <ul className="fact-list">
              {cuKeys.map((k) => (
                <li key={k}>
                  <label>
                    <input
                      type="checkbox"
                      checked={cuOn.has(k)}
                      onChange={(e) => {
                        const n = new Set(cuOn);
                        if (e.target.checked) n.add(k);
                        else n.delete(k);
                        setCuOn(n);
                      }}
                    />
                    <span className="fact-label">{k === 'company' ? 'Company' : k === 'jobTitle' ? 'Job title' : 'Birthday'}</span>
                    <span className="fact-value">{k === 'birthday' ? formatDayMonth(analysis.customerUpdates.birthday!) : analysis.customerUpdates[k]}</span>
                  </label>
                </li>
              ))}
              {socials.map((sp, i) => (
                <li key={sp.url}>
                  <label>
                    <input type="checkbox" checked={socialOn[i]} onChange={(e) => setSocialOn(socialOn.map((x, j) => (j === i ? e.target.checked : x)))} />
                    <span className="fact-label">{({ LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', OTHER: 'Link' } as const)[sp.platform]}</span>
                    <span className="fact-value link-value">{sp.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {personalFound && !existingConsent && (
          <section className={`card consent-block${consentTick ? ' ok' : ''}`}>
            <label className="consent-check">
              <input type="checkbox" checked={consentTick} onChange={(e) => setConsentTick(e.target.checked)} />
              <span>
                <strong>{whoName && who !== 'NEW' ? whoName.split(' ')[0] : 'The customer'} agreed to me keeping these family and contact details</strong>
                <span className="cell-sub">Required under PDPA before saving people or their dates. Their own details can be saved either way.</span>
              </span>
            </label>
            {consentTick && (
              <label className="field">
                <span>How they agreed</span>
                <input value={consentMethod} onChange={(e) => setConsentMethod(e.target.value)} />
              </label>
            )}
          </section>
        )}

        {analysis.people.length > 0 && (
          <section className={`card${hasConsent ? '' : ' locked'}`}>
            <div className="card-head">
              <h2>People mentioned</h2>
              {!hasConsent && <span className="card-hint">Needs consent</span>}
            </div>
            <ul className="mention-list">
              {analysis.people.map((p, i) => (
                <li key={p.name}>
                  <label className="mention">
                    <input
                      type="checkbox"
                      disabled={!hasConsent}
                      checked={hasConsent && peopleOn[i]}
                      onChange={(e) => setPeopleOn(peopleOn.map((x, j) => (j === i ? e.target.checked : x)))}
                    />
                    <span className="mention-main">
                      <span className="mention-top">
                        <strong>{p.name}</strong>
                        <span className="rel-chip">{p.relationLabel ?? relationLabel[p.relation]}</span>
                      </span>
                      <span className="cell-sub">
                        {[p.jobTitle && p.company ? `${p.jobTitle}, ${p.company}` : p.jobTitle || p.company, p.school, p.phone, p.birthday && `Birthday ${formatDayMonth(p.birthday)}`]
                          .filter(Boolean)
                          .join('. ')}
                      </span>
                      {p.notes && <span className="cell-sub">{p.notes}</span>}
                    </span>
                  </label>
                  {p.isProspect && (
                    <label className={`switch small${!hasConsent || !peopleOn[i] ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        disabled={!hasConsent || !peopleOn[i]}
                        checked={prospects.has(p.name)}
                        onChange={(e) => {
                          const n = new Set(prospects);
                          if (e.target.checked) n.add(p.name);
                          else n.delete(p.name);
                          setProspects(n);
                        }}
                      />
                      <span className="switch-track" />
                      Also create as a customer (lead)
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {analysis.importantDates.length > 0 && (
          <section className="card">
            <div className="card-head">
              <h2>Important dates</h2>
            </div>
            <ul className="mention-list">
              {analysis.importantDates.map((d, i) => {
                const locked = isPersonalDate(i) && !hasConsent;
                const v = dateVals[i];
                return (
                  <li key={i} className={locked ? 'locked' : ''}>
                    <label className="mention">
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={!locked && datesOn[i]}
                        onChange={(e) => setDatesOn(datesOn.map((x, j) => (j === i ? e.target.checked : x)))}
                      />
                      <span className="date-icon small">
                        <Icon name={DATE_ICON[d.kind]} size={14} />
                      </span>
                      <span className="mention-main">
                        <strong>{d.label}</strong>
                        <span className="cell-sub">
                          {d.personName ?? 'Customer'}
                          {d.yearly ? ', every year' : ''}
                        </span>
                      </span>
                    </label>
                    {v.startsWith('--') ? (
                      <span className="cell-sub">{formatDayMonth(v)}</span>
                    ) : (
                      <input
                        type="date"
                        className="mention-date"
                        disabled={locked}
                        value={v}
                        onChange={(e) => setDateVals(dateVals.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {analysis.services.length > 0 && (
          <section className="card">
            <div className="card-head">
              <h2>After-sales needs</h2>
            </div>
            <ul className="mention-list">
              {analysis.services.map((sv, i) => (
                <li key={i}>
                  <label className="mention">
                    <input type="checkbox" checked={servicesOn[i]} onChange={(e) => setServicesOn(servicesOn.map((x, j) => (j === i ? e.target.checked : x)))} />
                    <span className={`svc-icon small svc-${sv.type.toLowerCase()}`}>
                      <Icon name={SERVICE_META[sv.type].icon} size={14} />
                    </span>
                    <span className="mention-main">
                      <strong>{sv.title}</strong>
                      <span className="cell-sub">
                        {serviceTypeLabel[sv.type]}
                        {sv.notes ? `. ${sv.notes}` : ''}
                      </span>
                    </span>
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
