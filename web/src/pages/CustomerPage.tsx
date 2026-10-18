import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { CustomerDetail, Note, NoteKind, Project, Reminder, SuggestedReminder } from '../../../src/shared/types';
import {
  addMatch,
  addNote,
  addReminder,
  deleteMatch,
  deleteNote,
  getCustomer,
  listProjects,
  planFollowups,
  researchCompany,
  suggestMatches,
  updateCustomer,
  updateMatch,
  updateReminder,
} from '../api';
import { OriginBadge, REMINDERS_CHANGED, StatusPill, Transcript, WhatsAppBadge } from '../components/crm';
import { CustomerForm } from '../components/CustomerForm';
import { FamilyTab } from '../components/family';
import { AfterSalesTab } from '../components/services';
import { ProjectBadges } from '../components/ProjectCard';
import { ProjectPicker, type ProjectChoice } from '../components/ProjectPicker';
import { ErrorNote, Icon, RiskBadge, Spinner } from '../components/ui';
import {
  addDaysISO,
  daysLeftLabel,
  dueLabel,
  formatBudget,
  formatDate,
  formatDateShort,
  formatMonth,
  formatSGD,
  noteKindLabel,
  purposeLabel,
  relativeDay,
  residencyLabel,
  todayISO,
} from '../format';
import { Segmented } from './NewBooking';

type Tab = 'overview' | 'notes' | 'reminders' | 'projects' | 'deals' | 'family' | 'aftersales';
const MAIN_TABS: Tab[] = ['overview', 'notes', 'reminders', 'projects', 'deals'];

export function CustomerPage({ id, highlightNote, initialTab }: { id: string; highlightNote: string | null; initialTab: string | null }) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || (highlightNote ? 'notes' : 'overview'));
  const [editing, setEditing] = useState(false);
  const [hl, setHl] = useState<string | null>(highlightNote);
  const [researching, setResearching] = useState(false);

  useEffect(() => {
    document.querySelector('.phone-tabs .on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [tab, data === null]);

  const load = useCallback(() => {
    setError(null);
    getCustomer(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  /** Run a mutation that returns the fresh CustomerDetail. */
  const run = useCallback(async (p: Promise<CustomerDetail>) => {
    setActionError(null);
    try {
      setData(await p);
      window.dispatchEvent(new Event(REMINDERS_CHANGED));
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  if (error)
    return (
      <div className="page">
        <Back />
        <ErrorNote message={`Couldn't load this customer: ${error}`} onRetry={load} />
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <Back />
        <div className="loading-block">
          <Spinner /> Loading customer…
        </div>
      </div>
    );

  const { customer: c, notes, reminders, matches, deals } = data;
  const openRem = reminders.filter((r) => r.status === 'OPEN');
  const tabs: [Tab, string, number | null][] = [
    ['overview', 'Overview', null],
    ['notes', 'Notes', notes.length],
    ['reminders', 'Reminders', openRem.length],
    ['projects', 'Projects', matches.filter((m) => m.status !== 'REJECTED').length],
    ['deals', 'Deals', deals.length],
  ];
  tabs.push(['family', 'Family', data.people.length], ['aftersales', 'After-sales', data.services.filter((x) => x.status === 'OPEN' || x.status === 'IN_PROGRESS').length]);
  const sec = (t: Tab) => `cust-sec${tab === t ? ' active' : ''}`;
  const isMain = MAIN_TABS.includes(tab);
  const desktopTabs: [Tab, string, number | null][] = [
    ['overview', 'Overview', null],
    ['family', 'Family & dates', data.people.length + data.dates.length],
    ['aftersales', 'After-sales', tabs[tabs.length - 1][2]],
  ];

  async function research() {
    setResearching(true);
    const before = new Set(data!.notes.map((n) => n.id));
    setActionError(null);
    try {
      const d = await researchCompany(id);
      setData(d);
      const fresh = d.notes.find((n) => !before.has(n.id));
      if (fresh) {
        setHl(fresh.id);
        setTab('notes');
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setResearching(false);
    }
  }

  return (
    <div className="page">
      <Back />
      <header className="cust-head">
        <div className="cust-title">
          <span className="cust-avatar">{initials(c.fullName)}</span>
          <div>
            <h1 className="serif">{c.fullName}</h1>
            <p className="deal-meta">
              <StatusPill status={c.status} />
              {c.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>}
              {c.email && <span>{c.email}</span>}
              {c.source && <span className="muted">via {c.source}</span>}
            </p>
          </div>
        </div>
        <div className="head-actions">
          <a className="btn btn-secondary" href={`#/new?customer=${encodeURIComponent(c.id)}`}>
            <Icon name="plus" size={15} /> Book this customer
          </a>
          <a className="btn btn-primary" href={`#/whatsapp?customer=${encodeURIComponent(c.id)}`}>
            <Icon name="message" size={15} /> Import screenshots
          </a>
        </div>
      </header>

      {actionError && <ErrorNote message={actionError} />}

      <nav className="cust-tabs desktop-tabs" role="tablist">
        {desktopTabs.map(([k, label, n]) => {
          const on = k === 'overview' ? isMain : tab === k;
          return (
            <button key={k} role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
              {n !== null && n > 0 && <span className="tab-count">{n}</span>}
            </button>
          );
        })}
      </nav>
      <nav className="cust-tabs phone-tabs" role="tablist">
        {tabs.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
            {n !== null && n > 0 && <span className="tab-count">{n}</span>}
          </button>
        ))}
      </nav>

      {researching && (
        <div className="research-progress" role="status">
          <Spinner size={14} /> Searching Google with Gemini for {c.company}…
        </div>
      )}
      {tab === 'family' && <FamilyTab data={data} run={run} />}
      {tab === 'aftersales' && <AfterSalesTab data={data} run={run} />}
      {isMain && (
      <div className="cust-grid">
        <div className="col">
          <div className={sec('notes')}>
            <NotesSection data={data} run={run} highlight={hl} />
          </div>
          <div className={sec('projects')}>
            <MatchesSection data={data} run={run} />
          </div>
        </div>
        <div className="col">
          <div className={sec('overview')}>
            <ProfileSection data={data} onEdit={() => setEditing(true)} onResearch={research} researching={researching} />
          </div>
          <div className={sec('reminders')}>
            <RemindersSection data={data} run={run} reload={load} />
          </div>
          <div className={sec('deals')}>
            <DealsSection data={data} />
          </div>
        </div>
      </div>
      )}

      {editing && (
        <div className="dialog-backdrop" onClick={() => setEditing(false)}>
          <div className="dialog edit-dialog" role="dialog" aria-modal="true" aria-label="Edit customer" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title-row">
              <h3>Edit {c.fullName}</h3>
              <button className="icon-btn" onClick={() => setEditing(false)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <CustomerForm
              initial={c}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSubmit={async (input) => {
                setData(await updateCustomer(c.id, input));
                setEditing(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Back() {
  return (
    <a className="back" href="#/customers">
      <Icon name="back" size={14} /> Customers
    </a>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}

type Run = (p: Promise<CustomerDetail>) => Promise<boolean>;

/* ---------------- Profile ---------------- */

const SOCIAL_ICON = { LINKEDIN: 'linkedin', INSTAGRAM: 'instagram', FACEBOOK: 'facebook', OTHER: 'globe' } as const;
const SOCIAL_LABEL = { LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', OTHER: 'Website' } as const;

function ProfileSection({
  data,
  onEdit,
  onResearch,
  researching,
}: {
  data: CustomerDetail;
  onEdit: () => void;
  onResearch: () => void;
  researching: boolean;
}) {
  const c = data.customer;
  const p = c.preferences;
  const consent = !!c.consent.givenAt;
  const rows: [string, string | null, boolean?][] = [
    ['Works at', [c.jobTitle, c.company].filter(Boolean).join(', ') || null, true],
    ['Date of birth', c.dateOfBirth ? formatDate(c.dateOfBirth) : null],
    [c.idType ?? 'ID', c.idNumberMasked],
    ['Residency', c.residency ? residencyLabel[c.residency] : null],
    ['Purpose', c.profile.purpose ? purposeLabel[c.profile.purpose] : null],
    [
      'Properties owned',
      c.profile.propertiesOwned === null ? null : c.profile.propertiesOwned === 0 ? 'None' : String(c.profile.propertiesOwned),
    ],
    ['Household', c.profile.household, true],
    ['Budget', c.budgetMinSgd !== null || c.budgetMaxSgd !== null ? formatBudget(c.budgetMinSgd, c.budgetMaxSgd) : null],
    ['Timeline', p.timeline],
    ['Executive condo', p.executiveCondo === null ? null : p.executiveCondo ? 'Yes' : 'No'],
    ['Areas', p.areas.length ? p.areas.join(', ') : null, true],
    ['Notes', p.notes, true],
  ];
  return (
    <section className="card">
      <div className="card-head">
        <h2>Profile</h2>
        <span className="head-actions small">
          {c.company && (
            <span title={consent ? `Search the web for ${c.company}` : 'Record consent on the Family tab first'}>
              <button className="btn btn-ghost btn-sm" onClick={onResearch} disabled={!consent || researching}>
                {researching ? <Spinner size={13} /> : <Icon name="globe" size={13} />} Research company
              </button>
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            Edit
          </button>
        </span>
      </div>
      {c.socialProfiles.length > 0 && (
        <div className="socials">
          {c.socialProfiles.map((sp) => (
            <a key={sp.url} href={sp.url} target="_blank" rel="noopener noreferrer" className="social" title={sp.url}>
              <Icon name={SOCIAL_ICON[sp.platform]} size={15} /> {SOCIAL_LABEL[sp.platform]}
            </a>
          ))}
        </div>
      )}
      <dl className="kv">
        {rows
          .filter(([, v]) => v)
          .map(([k, v, wide]) => (
            <div key={k} className={wide ? 'wide' : ''}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        {(p.segments.length > 0 || p.bedrooms.length > 0) && (
          <div className="wide">
            <dt>Looking for</dt>
            <dd className="chip-row">
              {p.segments.map((s) => (
                <span key={s} className={`tag tag-${s.toLowerCase()}`}>
                  {s}
                </span>
              ))}
              {p.bedrooms.map((b) => (
                <span key={b} className="chip-static">
                  {b}
                </span>
              ))}
            </dd>
          </div>
        )}
        {c.tags.length > 0 && (
          <div className="wide">
            <dt>Tags</dt>
            <dd className="chip-row">
              {c.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      {rows.every(([, v]) => !v) && p.segments.length === 0 && (
        <p className="muted pad">Nothing known yet. Edit the profile, or import a WhatsApp chat to fill it in.</p>
      )}
    </section>
  );
}

/* ---------------- Notes ---------------- */

const KIND_ICON = { DISCUSSION: 'message', THOUGHT: 'user', PLAN: 'meeting' } as const;

function NotesSection({ data, run, highlight }: { data: CustomerDetail; run: Run; highlight: string | null }) {
  const id = data.customer.id;
  const [kind, setKind] = useState<NoteKind>('DISCUSSION');
  const [text, setText] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayISO());
  const [remindOn, setRemindOn] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (highlight) setTimeout(() => document.getElementById(`note-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  }, [highlight]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const ok = await run(
      addNote(id, {
        kind,
        text: text.trim(),
        occurredAt: occurredAt || undefined,
        ...(kind === 'PLAN' && remindOn ? { remindOn } : {}),
      }),
    );
    setBusy(false);
    if (ok) {
      setText('');
      setRemindOn('');
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Notes</h2>
        <span className="card-hint">Newest first</span>
      </div>
      <form className="note-composer" onSubmit={submit}>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            ['DISCUSSION', 'Discussion'],
            ['THOUGHT', 'My thoughts'],
            ['PLAN', 'Plan'],
          ]}
        />
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === 'DISCUSSION'
              ? 'What did you talk about?'
              : kind === 'THOUGHT'
                ? 'Your private read on this customer'
                : 'What will you do next?'
          }
        />
        <div className="note-composer-row">
          <label className="field inline">
            <span>Date</span>
            <input type="date" value={occurredAt} max={todayISO()} onChange={(e) => setOccurredAt(e.target.value)} />
          </label>
          {kind === 'PLAN' && (
            <label className="field inline">
              <span>Remind me on</span>
              <input type="date" value={remindOn} min={todayISO()} onChange={(e) => setRemindOn(e.target.value)} />
            </label>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
            {busy ? <Spinner size={14} /> : <Icon name="plus" size={14} />} Add note
          </button>
        </div>
      </form>
      {data.notes.length === 0 ? (
        <p className="muted pad">No notes yet.</p>
      ) : (
        <ol className="timeline">
          {data.notes.map((n) => (
            <NoteItem key={n.id} n={n} highlight={n.id === highlight} onDelete={() => run(deleteNote(id, n.id))} />
          ))}
        </ol>
      )}
    </section>
  );
}

function NoteItem({ n, highlight, onDelete }: { n: Note; highlight: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(highlight);
  const wa = n.source === 'WHATSAPP_AI';
  const web = n.source === 'WEB_AI';
  return (
    <li className={`note note-${n.kind.toLowerCase()}${wa ? ' note-wa' : ''}${web ? ' note-web' : ''}${highlight ? ' highlight' : ''}`} id={`note-${n.id}`}>
      <span className="note-dot">
        <Icon name={wa ? 'message' : web ? 'globe' : KIND_ICON[n.kind]} size={13} />
      </span>
      <div className="note-body">
        <div className="note-meta">
          <strong>{noteKindLabel[n.kind]}</strong>
          {wa && <WhatsAppBadge />}
          {web && (
            <span className="origin origin-web">
              <Icon name="globe" size={11} /> Web research
            </span>
          )}
          <span className="muted">{n.occurredAt ? formatDate(n.occurredAt) : relativeDay(n.createdAt)}</span>
          <button
            className="icon-btn note-del"
            onClick={() => window.confirm('Delete this note?') && onDelete()}
            aria-label="Delete note"
            title="Delete note"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
        <p className="note-text">{n.text}</p>
        {n.keyPoints.length > 0 && (
          <ul className="key-points">
            {n.keyPoints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        )}
        {n.sources && n.sources.length > 0 && (
          <div className="note-sources">
            <span>Sources</span>
            <ol>
              {n.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        {n.transcript.length > 0 && (
          <>
            <button className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <span className={`chev${open ? ' open' : ''}`}>
                <Icon name="chevron" size={12} />
              </span>
              {open ? 'Hide conversation' : `Show conversation (${n.transcript.length} messages)`}
            </button>
            {open && <Transcript messages={n.transcript} />}
          </>
        )}
      </div>
    </li>
  );
}

/* ---------------- Reminders ---------------- */

export function SnoozeDone({ r, onPatch }: { r: { id: string; dueDate: string }; onPatch: (p: Partial<Reminder>) => void }) {
  const base = r.dueDate < todayISO() ? todayISO() : r.dueDate;
  return (
    <span className="rem-actions">
      <button className="btn btn-sm btn-secondary" onClick={() => onPatch({ status: 'DONE' })}>
        <Icon name="check" size={13} /> Done
      </button>
      <button className="btn btn-sm btn-ghost" onClick={() => onPatch({ dueDate: addDaysISO(base, 1) })} title="Snooze one day">
        +1d
      </button>
      <button className="btn btn-sm btn-ghost" onClick={() => onPatch({ dueDate: addDaysISO(base, 7) })} title="Snooze one week">
        +7d
      </button>
    </span>
  );
}

function RemindersSection({ data, run, reload }: { data: CustomerDetail; run: Run; reload: () => void }) {
  const id = data.customer.id;
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(addDaysISO(todayISO(), 1));
  const [plan, setPlan] = useState<SuggestedReminder[] | null>(null);
  const [planning, setPlanning] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [planError, setPlanError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const open = data.reminders.filter((r) => r.status === 'OPEN');
  const done = data.reminders.filter((r) => r.status !== 'OPEN');

  const patch = async (rid: string, p: Partial<Reminder>) => {
    try {
      await updateReminder(rid, p);
    } finally {
      reload();
      window.dispatchEvent(new Event(REMINDERS_CHANGED));
    }
  };

  async function getPlan() {
    setPlanning(true);
    setPlanError(null);
    setAdded(new Set());
    try {
      setPlan(await planFollowups(id));
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlanning(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Reminders</h2>
        <button className="btn btn-sm btn-secondary" onClick={getPlan} disabled={planning}>
          {planning ? <Spinner size={13} /> : <Icon name="spark" size={13} />} AI follow-up plan
        </button>
      </div>

      {(plan || planError) && (
        <div className="plan-box">
          {planError ? (
            <ErrorNote message={`Couldn't plan follow-ups: ${planError}`} />
          ) : (
            <>
              <p className="plan-head">
                <Icon name="spark" size={13} /> Suggested by Copilot. Add the ones you want.
              </p>
              <ul>
                {plan!.map((s, i) => (
                  <li key={i}>
                    <div>
                      <strong>{s.title}</strong>
                      {s.detail && <span className="cell-sub">{s.detail}</span>}
                      <span className="cell-sub">{formatDate(s.dueDate)}</span>
                    </div>
                    <button
                      className={`btn btn-sm ${added.has(i) ? 'btn-ghost' : 'btn-primary'}`}
                      disabled={added.has(i)}
                      onClick={async () => {
                        if (await run(addReminder(id, { ...s, origin: 'AI' }))) setAdded((a) => new Set(a).add(i));
                      }}
                    >
                      {added.has(i) ? (
                        <>
                          <Icon name="check" size={13} /> Added
                        </>
                      ) : (
                        'Add'
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <button className="link-btn" onClick={() => setPlan(null)}>
                Close suggestions
              </button>
            </>
          )}
        </div>
      )}

      {open.length === 0 ? (
        <p className="muted pad">No open reminders.</p>
      ) : (
        <ul className="rem-list">
          {open.map((r) => (
            <li key={r.id} className={r.dueDate < todayISO() ? 'is-overdue' : r.dueDate === todayISO() ? 'is-today' : ''}>
              <div className="rem-main">
                <span className="rem-title">
                  {r.title} <OriginBadge origin={r.origin} />
                </span>
                {r.detail && <span className="cell-sub">{r.detail}</span>}
                <span className="rem-due">
                  <Icon name="clock" size={12} /> {dueLabel(r.dueDate)}
                </span>
              </div>
              <SnoozeDone r={r} onPatch={(p) => patch(r.id, p)} />
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          className="rem-add"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            if (await run(addReminder(id, { title: title.trim(), detail: null, dueDate: due, origin: 'AGENT' }))) {
              setTitle('');
              setAdding(false);
            }
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need to do?" autoFocus />
          <input type="date" value={due} min={todayISO()} onChange={(e) => setDue(e.target.value)} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={!title.trim()}>
            Add
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="pad-x">
          <button className="link-btn" onClick={() => setAdding(true)}>
            <Icon name="plus" size={12} /> Add reminder
          </button>
        </div>
      )}
      {done.length > 0 && (
        <div className="pad-x done-toggle">
          <button className="link-btn muted-link" onClick={() => setShowDone((s) => !s)}>
            {showDone ? 'Hide' : 'Show'} {done.length} done
          </button>
          {showDone && (
            <ul className="rem-done">
              {done.map((r) => (
                <li key={r.id}>
                  <Icon name="check" size={12} /> {r.title} <span className="cell-sub">{r.completedAt ? formatDateShort(r.completedAt) : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------- Matched projects ---------------- */

function MatchesSection({ data, run }: { data: CustomerDetail; run: Run }) {
  const id = data.customer.id;
  const [suggesting, setSuggesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState<string | null>(null);
  const [choice, setChoice] = useState<ProjectChoice>(null);
  const [reason, setReason] = useState('');

  const startAdd = () => {
    setAdding(true);
    if (!projects.length) {
      setPLoading(true);
      listProjects()
        .then(setProjects)
        .catch((e: Error) => setPError(e.message))
        .finally(() => setPLoading(false));
    }
  };

  const order = { SHORTLISTED: 0, SUGGESTED: 1, REJECTED: 2 } as const;
  const list = [...data.matches].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Matched projects</h2>
        <span className="head-actions small">
          <button className="btn btn-sm btn-secondary" onClick={startAdd}>
            <Icon name="plus" size={13} /> Add project
          </button>
          <button
            className="btn btn-sm btn-primary"
            disabled={suggesting}
            onClick={async () => {
              setSuggesting(true);
              await run(suggestMatches(id));
              setSuggesting(false);
            }}
          >
            {suggesting ? <Spinner size={13} /> : <Icon name="spark" size={13} />} Suggest with AI
          </button>
        </span>
      </div>

      {adding && (
        <form
          className="match-add"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!choice || choice === 'other') return;
            if (await run(addMatch(id, choice.id, reason.trim() || undefined))) {
              setAdding(false);
              setChoice(null);
              setReason('');
            }
          }}
        >
          <ProjectPicker
            projects={projects.filter((p) => !data.matches.some((m) => m.projectId === p.id))}
            loading={pLoading}
            error={pError}
            value={choice === 'other' ? null : choice}
            onChange={(v) => setChoice(v === 'other' ? null : v)}
          />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why it fits (optional)" />
          <div className="match-add-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" type="submit" disabled={!choice || choice === 'other'}>
              Add to shortlist
            </button>
          </div>
        </form>
      )}

      {suggesting && (
        <div className="loading-block small">
          <Spinner size={14} /> Matching the catalog against budget and preferences…
        </div>
      )}

      {list.length === 0 && !suggesting ? (
        <p className="muted pad">No projects yet. Ask Copilot to suggest some from the catalog.</p>
      ) : (
        <ul className="match-list">
          {list.map((m) => (
            <li key={m.projectId} className={`match match-${m.status.toLowerCase()}`}>
              <div className="match-main">
                <div className="match-top">
                  <strong>{m.project.name}</strong>
                  <OriginBadge origin={m.origin} />
                  {m.status === 'SHORTLISTED' && <span className="match-status on">Shortlisted</span>}
                  {m.status === 'REJECTED' && <span className="match-status off">Rejected</span>}
                </div>
                <div className="match-facts">
                  <ProjectBadges p={m.project} />
                  {m.project.district && <span>{m.project.district}</span>}
                  {m.project.expectedTop && <span>TOP {formatMonth(m.project.expectedTop)}</span>}
                  {m.project.priceFromSgd !== null && <span>From {formatSGD(m.project.priceFromSgd)}</span>}
                </div>
                <p className="match-reason">{m.reason}</p>
              </div>
              <div className="match-actions">
                {m.status !== 'SHORTLISTED' && (
                  <button className="btn btn-sm btn-secondary" onClick={() => run(updateMatch(id, m.projectId, 'SHORTLISTED'))}>
                    <Icon name="check" size={13} /> Shortlist
                  </button>
                )}
                {m.status !== 'REJECTED' && (
                  <button className="btn btn-sm btn-ghost" onClick={() => run(updateMatch(id, m.projectId, 'REJECTED'))}>
                    Reject
                  </button>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => run(deleteMatch(id, m.projectId))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Deals ---------------- */

function DealsSection({ data }: { data: CustomerDetail }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Deals</h2>
        <a className="btn btn-sm btn-secondary" href={`#/new?customer=${encodeURIComponent(data.customer.id)}`}>
          <Icon name="plus" size={13} /> Book this customer
        </a>
      </div>
      {data.deals.length === 0 ? (
        <p className="muted pad">No bookings yet.</p>
      ) : (
        <ul className="cust-deals">
          {data.deals.map((d) => (
            <li key={d.id}>
              <a href={`#/deals/${d.id}`}>
                <span>
                  <strong>
                    {d.project}, {d.unit}
                  </strong>
                  <span className="cell-sub">
                    {d.currentStageLabel}
                    {d.nextDueDate ? `, ${daysLeftLabel(d.daysLeft)}` : ''}
                  </span>
                </span>
                <RiskBadge risk={d.risk} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
