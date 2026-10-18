import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { CustomerDetail, DateKind, ImportantDate, Person, PersonInput, Relation } from '../../../src/shared/types';
import { addDate, addPerson, deleteDate, deletePerson, setConsent, updateDate, updatePerson } from '../api';
import {
  currentAge,
  dateKindLabel,
  formatDate,
  formatDayMonth,
  inDays,
  nextOccurrence,
  relationLabel,
  todayISO,
  turnsAge,
  yearOf,
} from '../format';
import { PHONE, useMedia } from '../pwa';
import { Icon, Spinner } from './ui';

type Run = (p: Promise<CustomerDetail>) => Promise<boolean>;

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className={`dialog form-dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title-row">
          <h3>{title}</h3>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const DATE_ICON: Record<DateKind, Parameters<typeof Icon>[0]['name']> = {
  BIRTHDAY: 'cake',
  ANNIVERSARY: 'rings',
  HANDOVER: 'key',
  SCHOOL: 'school',
  LEASE: 'lease',
  TAX: 'tax',
  CUSTOM: 'star',
};

const RELATIONS = Object.keys(relationLabel) as Relation[];
const GROUP: Record<Relation, 'family' | 'work' | 'other'> = {
  SPOUSE: 'family',
  CHILD: 'family',
  PARENT: 'family',
  SIBLING: 'family',
  OTHER_RELATIVE: 'family',
  COLLEAGUE: 'work',
  ADVISOR: 'work',
  TENANT: 'work',
  FRIEND: 'other',
  OTHER: 'other',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export const personRel = (p: Person) => p.relationLabel || relationLabel[p.relation];

/* ---------------- Consent ---------------- */

export function ConsentBar({ data, run }: { data: CustomerDetail; run: Run }) {
  const c = data.customer;
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(`Verbal, ${formatDate(todayISO())}`);
  const [busy, setBusy] = useState(false);
  if (c.consent.givenAt)
    return (
      <div className="consent ok">
        <Icon name="shield" size={16} />
        <span>
          Consent recorded {formatDate(c.consent.givenAt.slice(0, 10))}
          {c.consent.method ? `. ${c.consent.method}` : ''}
        </span>
        <button
          className="link-btn muted-link"
          onClick={() => window.confirm(`Withdraw ${c.fullName}'s consent? This deletes the family and contact details stored for them (and their dates). You can add them again after recording consent.`) && run(setConsent(c.id, false))}
        >
          Withdraw
        </button>
      </div>
    );
  return (
    <>
      <div className="consent need">
        <Icon name="shield" size={16} />
        <span>
          <strong>Record consent before storing family or contact details.</strong> PDPA requires {c.fullName.split(' ')[0]}'s agreement to keep
          personal data about the people around them.
        </span>
        <button className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>
          Record consent
        </button>
      </div>
      {open && (
        <Modal title="Record consent" onClose={() => setOpen(false)}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              if (await run(setConsent(c.id, true, method.trim() || undefined))) setOpen(false);
              setBusy(false);
            }}
          >
            <p className="muted">
              Confirm that {c.fullName} agreed to you keeping details about their family and contacts, for example birthdays and schools, so you can
              stay in touch.
            </p>
            <label className="field">
              <span>How did they agree?</span>
              <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. Verbal on call, 18 Oct" autoFocus />
            </label>
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />} Record consent
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ---------------- Relationship map ---------------- */

export function RelationshipMap({ data, onPick }: { data: CustomerDetail; onPick: (p: Person) => void }) {
  const phone = useMedia(PHONE);
  const W = phone ? 360 : 640;
  const H = phone ? 340 : 300;
  const RX = phone ? 125 : 230;
  const RY = phone ? 120 : 105;
  const cx = W / 2;
  const cy = H / 2;
  const order: Relation[] = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER_RELATIVE', 'TENANT', 'ADVISOR', 'COLLEAGUE', 'FRIEND', 'OTHER'];
  const ppl = [...data.people].sort((a, b) => order.indexOf(a.relation) - order.indexOf(b.relation));
  const n = ppl.length;
  const nodes = ppl.map((p, i) => {
    const a = -Math.PI / 2 + ((i + 0.5) / Math.max(n, 1)) * Math.PI * 2;
    return { p, x: cx + Math.cos(a) * RX, y: cy + Math.sin(a) * RY };
  });
  return (
    <svg className="rel-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${data.customer.fullName} and ${n} people around them`}>
      {nodes.map(({ p, x, y }) => (
        <line key={`l-${p.id}`} x1={cx} y1={cy} x2={x} y2={y} className={`rel-line g-${GROUP[p.relation]}`} />
      ))}
      <g className="rel-centre">
        <circle cx={cx} cy={cy} r={34} />
        <text x={cx} y={cy + 6} textAnchor="middle" className="rel-ini big">
          {initials(data.customer.fullName)}
        </text>
        <text x={cx} y={cy + 52} textAnchor="middle" className="rel-name">
          {data.customer.fullName}
        </text>
      </g>
      {nodes.map(({ p, x, y }) => (
        <g
          key={p.id}
          className={`rel-node g-${GROUP[p.relation]}`}
          tabIndex={0}
          role="button"
          aria-label={`${p.name}, ${personRel(p)}`}
          onClick={() => onPick(p)}
          onKeyDown={(e) => e.key === 'Enter' && onPick(p)}
        >
          <circle cx={x} cy={y} r={22} />
          <text x={x} y={y + 5} textAnchor="middle" className="rel-ini">
            {initials(p.name)}
          </text>
          <text x={x} y={y + 38} textAnchor="middle" className="rel-name">
            {p.name.split(' ')[0]}
          </text>
          <text x={x} y={y + 52} textAnchor="middle" className="rel-rel">
            {personRel(p)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---------------- People ---------------- */

function birthdayLine(b: string): string {
  const next = nextOccurrence(b, true);
  const t = turnsAge(b);
  const now = currentAge(b);
  const when = next ? formatDayMonth(next.replace(/^\d{4}/, '--')) : formatDayMonth(b);
  if (t !== null) return `${now} now, turns ${t} on ${when} (${inDays(next)})`;
  return `Birthday ${when}${next ? ` (${inDays(next)})` : ''}`;
}

export function PeopleSection({ data, run, focus }: { data: CustomerDetail; run: Run; focus: string | null }) {
  const [edit, setEdit] = useState<Person | 'new' | null>(null);
  const consent = !!data.customer.consent.givenAt;
  useEffect(() => {
    if (focus) document.getElementById(`person-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focus]);
  return (
    <section className="card">
      <div className="card-head">
        <h2>People</h2>
        <button className="btn btn-sm btn-secondary" disabled={!consent} title={consent ? undefined : 'Record consent first'} onClick={() => setEdit('new')}>
          <Icon name="plus" size={13} /> Add person
        </button>
      </div>
      {!consent && data.people.length === 0 ? (
        <p className="muted pad">Once consent is recorded you can add family, colleagues and advisors here, or pick them up from a WhatsApp import.</p>
      ) : data.people.length === 0 ? (
        <p className="muted pad">No one yet. Add family members, colleagues or their lawyer and banker.</p>
      ) : (
        <ul className="people-grid">
          {data.people.map((p) => (
            <li key={p.id} id={`person-${p.id}`} className={`person g-${GROUP[p.relation]}${focus === p.id ? ' highlight' : ''}`}>
              <div className="person-top">
                <span className="person-ini">{initials(p.name)}</span>
                <span className="person-id">
                  <strong>{p.name}</strong>
                  <span className="rel-chip">{personRel(p)}</span>
                </span>
                <button className="icon-btn" onClick={() => setEdit(p)} aria-label={`Edit ${p.name}`}>
                  <Icon name="edit" size={14} />
                </button>
              </div>
              <ul className="person-facts">
                {p.birthday && (
                  <li>
                    <Icon name="cake" size={13} /> {birthdayLine(p.birthday)}
                  </li>
                )}
                {(p.jobTitle || p.company) && (
                  <li>
                    <Icon name="building" size={13} /> {[p.jobTitle, p.company].filter(Boolean).join(', ')}
                  </li>
                )}
                {p.school && (
                  <li>
                    <Icon name="school" size={13} /> {p.school}
                  </li>
                )}
                {p.phone && (
                  <li>
                    <Icon name="phone" size={13} /> <a href={`tel:${p.phone.replace(/\s/g, '')}`}>{p.phone}</a>
                  </li>
                )}
                {p.email && (
                  <li>
                    <Icon name="mail" size={13} /> <a href={`mailto:${p.email}`}>{p.email}</a>
                  </li>
                )}
              </ul>
              {p.notes && <p className="person-notes">{p.notes}</p>}
              {p.linkedCustomerId && (
                <a className="card-link" href={`#/customers/${p.linkedCustomerId}`}>
                  Open {p.name.split(' ')[0]}'s customer file
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {edit && <PersonDialog data={data} person={edit === 'new' ? null : edit} run={run} onClose={() => setEdit(null)} />}
    </section>
  );
}

function PersonDialog({ data, person, run, onClose }: { data: CustomerDetail; person: Person | null; run: Run; onClose: () => void }) {
  const id = data.customer.id;
  const b = person?.birthday ?? '';
  const [f, setF] = useState({
    name: person?.name ?? '',
    relation: person?.relation ?? ('SPOUSE' as Relation),
    relationLabel: person?.relationLabel ?? '',
    company: person?.company ?? '',
    jobTitle: person?.jobTitle ?? '',
    school: person?.school ?? '',
    phone: person?.phone ?? '',
    email: person?.email ?? '',
    notes: person?.notes ?? '',
  });
  const [bday, setBday] = useState(b.startsWith('--') ? `2000${b.slice(1)}` : b);
  const [noYear, setNoYear] = useState(b.startsWith('--'));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const t = (s: string) => s.trim() || null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return;
    setBusy(true);
    const input: PersonInput = {
      name: f.name.trim(),
      relation: f.relation,
      relationLabel: t(f.relationLabel),
      birthday: bday ? (noYear ? `--${bday.slice(5)}` : bday) : null,
      company: t(f.company),
      jobTitle: t(f.jobTitle),
      school: t(f.school),
      phone: t(f.phone),
      email: t(f.email),
      notes: t(f.notes),
      linkedCustomerId: person?.linkedCustomerId ?? null,
    };
    const ok = await run(person ? updatePerson(id, person.id, input) : addPerson(id, input));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal title={person ? `Edit ${person.name}` : 'Add person'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input value={f.name} onChange={set('name')} autoFocus={!person} />
        </label>
        <label className="field">
          <span>Relation</span>
          <select value={f.relation} onChange={set('relation')}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {relationLabel[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Describe the relation (optional)</span>
          <input value={f.relationLabel} onChange={set('relationLabel')} placeholder="e.g. Elder son, Conveyancing lawyer" />
        </label>
        <div className="field">
          <span>Birthday</span>
          <input type="date" value={bday} onChange={(e) => setBday(e.target.value)} />
          <label className="check-inline">
            <input type="checkbox" checked={noYear} onChange={(e) => setNoYear(e.target.checked)} /> Year unknown
          </label>
        </div>
        <label className="field">
          <span>Company</span>
          <input value={f.company} onChange={set('company')} />
        </label>
        <label className="field">
          <span>Job title</span>
          <input value={f.jobTitle} onChange={set('jobTitle')} />
        </label>
        <label className="field">
          <span>School</span>
          <input value={f.school} onChange={set('school')} placeholder="For children" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input type="tel" value={f.phone} onChange={set('phone')} />
        </label>
        <label className="field span-2">
          <span>Email</span>
          <input type="email" value={f.email} onChange={set('email')} />
        </label>
        <label className="field span-2">
          <span>Notes</span>
          <textarea rows={2} value={f.notes} onChange={set('notes')} />
        </label>
        <div className="dialog-actions span-2">
          {person && (
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={async () => window.confirm(`Delete ${person.name}?`) && (await run(deletePerson(id, person.id))) && onClose()}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy || !f.name.trim()}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />} {person ? 'Save' : 'Add person'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Important dates ---------------- */

export function DatesSection({ data, run }: { data: CustomerDetail; run: Run }) {
  const [edit, setEdit] = useState<ImportantDate | 'new' | null>(null);
  const rows = useMemo(
    () =>
      data.dates
        .map((d) => ({ d, next: nextOccurrence(d.date, d.yearly) }))
        .filter((r) => r.next)
        .sort((a, b) => {
          const pa = a.next! < todayISO() ? 1 : 0;
          const pb = b.next! < todayISO() ? 1 : 0;
          return pa - pb || a.next!.localeCompare(b.next!);
        }),
    [data.dates],
  );
  const whose = (d: ImportantDate) => {
    const p = d.personId ? data.people.find((x) => x.id === d.personId) : null;
    return p ? `${p.name} (${personRel(p).toLowerCase()})` : data.customer.fullName;
  };
  return (
    <section className="card">
      <div className="card-head">
        <h2>Important dates</h2>
        <button className="btn btn-sm btn-secondary" onClick={() => setEdit('new')}>
          <Icon name="plus" size={13} /> Add date
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="muted pad">No dates yet. Birthdays added to people and key handovers show up here automatically.</p>
      ) : (
        <ul className="date-list">
          {rows.map(({ d, next }) => {
            const past = next! < todayISO();
            const age = d.kind === 'BIRTHDAY' ? turnsAge(d.date) : d.kind === 'ANNIVERSARY' && yearOf(d.date) ? Number(next!.slice(0, 4)) - yearOf(d.date)! : null;
            return (
              <li key={d.id} className={`date-row k-${d.kind.toLowerCase()}${past ? ' past' : ''}`}>
                <span className="date-icon">
                  <Icon name={DATE_ICON[d.kind]} size={16} />
                </span>
                <span className="date-main">
                  <strong>
                    {d.label}
                    {age ? (d.kind === 'BIRTHDAY' ? `, turns ${age}` : `, ${age} years`) : ''}
                  </strong>
                  <span className="cell-sub">
                    {whose(d)}
                    {d.source === 'SYSTEM' ? ', from profile' : ''}
                  </span>
                  <span className="date-tags">
                    {d.yearly && <span className="tag">Yearly</span>}
                    <span className="cell-sub">Remind {d.remindDaysBefore}d before</span>
                  </span>
                </span>
                <span className="date-when">
                  <strong>{past ? 'Passed' : inDays(next)}</strong>
                  <span className="cell-sub">{formatDayMonth(d.yearly ? next! : d.date)}</span>
                </span>
                {d.source === 'SYSTEM' ? (
                  <span className="icon-btn placeholder" title="Edit it on the person or deal" />
                ) : (
                  <button className="icon-btn" onClick={() => setEdit(d)} aria-label={`Edit ${d.label}`}>
                    <Icon name="edit" size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {edit && <DateDialog data={data} date={edit === 'new' ? null : edit} run={run} onClose={() => setEdit(null)} />}
    </section>
  );
}

export function DateDialog({
  data,
  date,
  run,
  onClose,
  preset,
}: {
  data: CustomerDetail;
  date: ImportantDate | null;
  run: Run;
  onClose: () => void;
  preset?: Partial<ImportantDate>;
}) {
  const id = data.customer.id;
  const init = { ...preset, ...date };
  const raw = init.date ?? '';
  const [label, setLabel] = useState(init.label ?? '');
  const [kind, setKind] = useState<DateKind>(init.kind ?? 'CUSTOM');
  const [personId, setPersonId] = useState(init.personId ?? '');
  const [serviceId, setServiceId] = useState(init.serviceId ?? '');
  const [value, setValue] = useState(raw.startsWith('--') ? `2000${raw.slice(1)}` : raw);
  const [noYear, setNoYear] = useState(raw.startsWith('--'));
  const [yearly, setYearly] = useState(init.yearly ?? true);
  const [remind, setRemind] = useState(String(init.remindDaysBefore ?? 7));
  const [busy, setBusy] = useState(false);
  const consent = !!data.customer.consent.givenAt;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !value) return;
    setBusy(true);
    const input = {
      label: label.trim(),
      kind,
      personId: personId || null,
      serviceId: serviceId || null,
      date: noYear && yearly ? `--${value.slice(5)}` : value,
      yearly,
      remindDaysBefore: Math.max(0, Number(remind) || 0),
    };
    const ok = await run(date ? updateDate(id, date.id, input) : addDate(id, input));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal title={date ? 'Edit date' : 'Add important date'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <label className="field span-2">
          <span>What is it?</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Wedding anniversary, Lease ends" autoFocus={!date} />
        </label>
        <label className="field">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as DateKind;
              setKind(k);
              if (k === 'BIRTHDAY' || k === 'ANNIVERSARY' || k === 'HANDOVER') setYearly(true);
              if (k === 'LEASE' || k === 'TAX' || k === 'SCHOOL') setYearly(false);
            }}
          >
            {(Object.keys(dateKindLabel) as DateKind[]).map((k) => (
              <option key={k} value={k}>
                {dateKindLabel[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Whose date</span>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} disabled={!consent && !personId}>
            <option value="">{data.customer.fullName}</option>
            {data.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({personRel(p).toLowerCase()})
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Date</span>
          <input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
          {yearly && (
            <label className="check-inline">
              <input type="checkbox" checked={noYear} onChange={(e) => setNoYear(e.target.checked)} /> Year unknown
            </label>
          )}
        </div>
        <div className="field">
          <span>Repeat</span>
          <label className="check-inline tall">
            <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} /> Every year
          </label>
        </div>
        <label className="field">
          <span>Remind me (days before)</span>
          <input type="number" inputMode="numeric" min={0} max={365} value={remind} onChange={(e) => setRemind(e.target.value)} />
        </label>
        {data.services.length > 0 && (
          <label className="field">
            <span>Belongs to service</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">None</option>
              {data.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="dialog-actions span-2">
          {date && (
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={async () => window.confirm('Delete this date?') && (await run(deleteDate(id, date.id))) && onClose()}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy || !label.trim() || !value}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function FamilyTab({ data, run }: { data: CustomerDetail; run: Run }) {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <div className="family-tab">
      <ConsentBar data={data} run={run} />
      <div className="family-grid">
        <div className="col">
          {data.people.length > 0 && (
            <section className="card map-card">
              <div className="card-head">
                <h2>Circle</h2>
                <span className="card-hint">Tap someone to see their details</span>
              </div>
              <RelationshipMap data={data} onPick={(p) => setFocus(p.id)} />
            </section>
          )}
          <PeopleSection data={data} run={run} focus={focus} />
        </div>
        <div className="col">
          <DatesSection data={data} run={run} />
        </div>
      </div>
    </div>
  );
}

