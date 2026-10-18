import { useState, type FormEvent, type ReactNode } from 'react';
import type { AfterSalesService, CustomerDetail, ServiceInput, ServiceType } from '../../../src/shared/types';
import { addService, deleteService, updateService } from '../api';
import { daysBetween, formatDate, formatDayMonth, formatSGD, inDays, nextOccurrence, serviceStatusLabel, serviceTypeLabel, todayISO } from '../format';
import { DATE_ICON, Modal } from './family';
import { Icon, Spinner } from './ui';

type Run = (p: Promise<CustomerDetail>) => Promise<boolean>;
type IconName = Parameters<typeof Icon>[0]['name'];
type Details = AfterSalesService['details'];

export const SERVICE_META: Record<ServiceType, { icon: IconName; hint: string }> = {
  RENTAL: { icon: 'home', hint: 'Find a tenant' },
  FURNISHING: { icon: 'sofa', hint: 'Renovation and furniture' },
  TENANCY: { icon: 'lease', hint: 'Lease, renewals, deposit' },
  TAX: { icon: 'tax', hint: 'Rental income or property tax' },
  DEFECTS: { icon: 'wrench', hint: 'Defects inspection and follow-up' },
  REFINANCING: { icon: 'bank', hint: 'Loan lock-in and repricing' },
  OTHER: { icon: 'star', hint: 'Anything else' },
};

type Field = { key: string; label: string; kind: 'text' | 'money' | 'date' | 'bool' | 'select'; options?: string[]; placeholder?: string };

/** Detail keys exactly as documented on AfterSalesService.details. */
const FIELDS: Partial<Record<ServiceType, Field[]>> = {
  RENTAL: [
    { key: 'askingRentSgd', label: 'Asking rent (S$/month)', kind: 'money' },
    { key: 'availableFrom', label: 'Available from', kind: 'date' },
    { key: 'listedOn', label: 'Listed on', kind: 'text', placeholder: 'PropertyGuru, 99.co…' },
  ],
  FURNISHING: [
    { key: 'budgetSgd', label: 'Budget (S$)', kind: 'money' },
    { key: 'vendor', label: 'Vendor', kind: 'text' },
    { key: 'scope', label: 'Scope', kind: 'text', placeholder: 'Kitchen, wardrobes, lighting…' },
  ],
  TENANCY: [
    { key: 'tenantName', label: 'Tenant', kind: 'text' },
    { key: 'tenantPhone', label: 'Tenant phone', kind: 'text' },
    { key: 'monthlyRentSgd', label: 'Rent (S$/month)', kind: 'money' },
    { key: 'depositSgd', label: 'Deposit (S$)', kind: 'money' },
    { key: 'leaseStart', label: 'Lease start', kind: 'date' },
    { key: 'leaseEnd', label: 'Lease end', kind: 'date' },
    { key: 'stampDutyPaid', label: 'Tenancy stamp duty paid', kind: 'bool' },
  ],
  TAX: [
    { key: 'taxYear', label: 'Year of assessment', kind: 'text', placeholder: 'YA2027' },
    { key: 'taxType', label: 'Type', kind: 'select', options: ['Rental income (Form B/B1)', 'Property tax'] },
    { key: 'annualRentSgd', label: 'Annual rent (S$)', kind: 'money' },
    { key: 'filedOn', label: 'Filed on', kind: 'date' },
  ],
};

export const TEMPLATES: { label: string; type: ServiceType; title: string }[] = [
  { label: 'Find a tenant', type: 'RENTAL', title: 'Find a tenant' },
  { label: 'Furnish the unit', type: 'FURNISHING', title: 'Furnish the unit' },
  { label: 'Tenancy follow-up', type: 'TENANCY', title: 'Tenancy follow-up' },
  { label: 'File rental income tax', type: 'TAX', title: 'File rental income tax' },
];

const money = (v: unknown) => (typeof v === 'number' ? formatSGD(v) : null);
const dateStr = (v: unknown) => (typeof v === 'string' && v ? formatDate(v) : null);

/** One-line summary of the most useful detail, used on lists. */
export function keyDetail(s: AfterSalesService): string | null {
  const d = s.details;
  switch (s.type) {
    case 'TENANCY': {
      const end = typeof d.leaseEnd === 'string' ? d.leaseEnd : null;
      if (end) {
        const n = daysBetween(todayISO(), end);
        return n >= 0 ? `Lease ends ${inDays(end)}` : `Lease ended ${-n} days ago`;
      }
      return money(d.monthlyRentSgd) ? `${money(d.monthlyRentSgd)}/month` : null;
    }
    case 'RENTAL':
      return [money(d.askingRentSgd) && `Asking ${money(d.askingRentSgd)}/month`, d.availableFrom && `from ${dateStr(d.availableFrom)}`].filter(Boolean).join(' ') || null;
    case 'FURNISHING':
      return [money(d.budgetSgd) && `Budget ${money(d.budgetSgd)}`, d.vendor].filter(Boolean).join(', ') || null;
    case 'TAX':
      return [d.taxYear, d.filedOn ? `filed ${dateStr(d.filedOn)}` : 'not filed yet'].filter(Boolean).join(', ') || null;
    default:
      return null;
  }
}

function DetailRows({ s }: { s: AfterSalesService }) {
  const d = s.details;
  const rows: [string, ReactNode][] = [];
  const push = (k: string, v: ReactNode) => v !== null && v !== undefined && v !== '' && rows.push([k, v]);
  if (s.type === 'TENANCY') {
    push('Tenant', [d.tenantName, d.tenantPhone].filter(Boolean).join(', ') || null);
    push('Rent', money(d.monthlyRentSgd) && `${money(d.monthlyRentSgd)}/month`);
    if (d.leaseStart || d.leaseEnd) {
      const end = typeof d.leaseEnd === 'string' ? d.leaseEnd : null;
      push(
        'Lease',
        <>
          {dateStr(d.leaseStart) ?? '?'} – {dateStr(d.leaseEnd) ?? '?'}
          {end && daysBetween(todayISO(), end) >= 0 && <span className={`ends${daysBetween(todayISO(), end) <= 90 ? ' soon' : ''}`}>ends {inDays(end)}</span>}
        </>,
      );
    }
    push('Deposit', money(d.depositSgd));
    if (d.stampDutyPaid !== undefined && d.stampDutyPaid !== null)
      push(
        'Stamp duty',
        d.stampDutyPaid ? (
          <span className="ok-mark">
            <Icon name="check" size={13} /> Paid
          </span>
        ) : (
          <span className="warn-mark">Not paid</span>
        ),
      );
  } else if (s.type === 'RENTAL') {
    push('Asking rent', money(d.askingRentSgd) && `${money(d.askingRentSgd)}/month`);
    push('Available from', dateStr(d.availableFrom));
    push('Listed on', (d.listedOn as string) || null);
  } else if (s.type === 'FURNISHING') {
    push('Budget', money(d.budgetSgd));
    push('Vendor', (d.vendor as string) || null);
    push('Scope', (d.scope as string) || null);
  } else if (s.type === 'TAX') {
    push('Tax year', (d.taxYear as string) || null);
    push('Type', (d.taxType as string) || null);
    push('Annual rent', money(d.annualRentSgd));
    push('Filed on', dateStr(d.filedOn) ?? 'Not yet');
  } else {
    for (const [k, v] of Object.entries(d)) push(k, typeof v === 'boolean' ? (v ? 'Yes' : 'No') : (v as string | number));
  }
  if (!rows.length) return null;
  return (
    <dl className="svc-details">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const STATUS_ORDER: AfterSalesService['status'][] = ['IN_PROGRESS', 'OPEN', 'DONE', 'CANCELLED'];

export function AfterSalesTab({ data, run }: { data: CustomerDetail; run: Run }) {
  const [edit, setEdit] = useState<AfterSalesService | Partial<ServiceInput> | null>(null);
  const id = data.customer.id;
  const groups = STATUS_ORDER.map((st) => [st, data.services.filter((s) => s.status === st)] as const).filter(([, l]) => l.length);
  return (
    <div className="aftersales-tab">
      <div className="as-toolbar">
        <button className="btn btn-primary" onClick={() => setEdit({})}>
          <Icon name="plus" size={14} /> New service
        </button>
        <span className="as-templates">
          {TEMPLATES.map((t) => (
            <button key={t.label} className="chip" onClick={() => setEdit({ type: t.type, title: t.title })}>
              <Icon name={SERVICE_META[t.type].icon} size={13} /> {t.label}
            </button>
          ))}
        </span>
      </div>
      {groups.length === 0 ? (
        <div className="card empty">
          <p>No after-sales services yet. Help with tenants, furnishing, tenancy renewals and tax keeps you top of mind for the next purchase.</p>
        </div>
      ) : (
        groups.map(([st, list]) => (
          <section key={st} className="svc-group">
            <h3 className="svc-group-title">
              {serviceStatusLabel[st]} <span className="group-count">{list.length}</span>
            </h3>
            <div className="svc-grid">
              {list.map((s) => {
                const related = data.dates.filter((d) => d.serviceId === s.id);
                return (
                  <article key={s.id} className={`svc svc-${s.type.toLowerCase()} st-${s.status.toLowerCase()}`}>
                    <header className="svc-head">
                      <span className="svc-icon">
                        <Icon name={SERVICE_META[s.type].icon} size={18} />
                      </span>
                      <span className="svc-title">
                        <span className="svc-type">{serviceTypeLabel[s.type]}</span>
                        <strong>{s.title}</strong>
                        {s.property && <span className="cell-sub">{s.property}</span>}
                      </span>
                      <button className="icon-btn" onClick={() => setEdit(s)} aria-label={`Edit ${s.title}`}>
                        <Icon name="edit" size={14} />
                      </button>
                    </header>
                    <label className="svc-status">
                      <span className="sr-only">Status</span>
                      <select value={s.status} onChange={(e) => run(updateService(id, s.id, { status: e.target.value as AfterSalesService['status'] }))}>
                        {STATUS_ORDER.map((x) => (
                          <option key={x} value={x}>
                            {serviceStatusLabel[x]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <DetailRows s={s} />
                    {s.notes && <p className="svc-notes">{s.notes}</p>}
                    {related.length > 0 && (
                      <ul className="svc-dates">
                        {related.map((d) => {
                          const next = nextOccurrence(d.date, d.yearly);
                          return (
                            <li key={d.id}>
                              <Icon name={DATE_ICON[d.kind]} size={13} /> {d.label}, {formatDayMonth(d.date)}
                              {next && next >= todayISO() && <span className="cell-sub"> ({inDays(next)})</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
      {edit && <ServiceDialog data={data} service={'id' in edit ? (edit as AfterSalesService) : null} preset={'id' in edit ? undefined : edit} run={run} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ServiceDialog({
  data,
  service,
  preset,
  run,
  onClose,
}: {
  data: CustomerDetail;
  service: AfterSalesService | null;
  preset?: Partial<ServiceInput>;
  run: Run;
  onClose: () => void;
}) {
  const id = data.customer.id;
  const init = service ?? preset ?? {};
  const [type, setType] = useState<ServiceType | null>(init.type ?? null);
  const [title, setTitle] = useState(init.title ?? '');
  const dealOpts = data.deals.map((d) => ({ id: d.id, label: `${d.project} ${d.unit}` }));
  const initDeal = init.dealId ?? (init.property ? '' : dealOpts[0]?.id ?? '');
  const [dealId, setDealId] = useState<string>(initDeal || (init.property ? 'other' : dealOpts.length ? dealOpts[0].id : 'other'));
  const [property, setProperty] = useState(init.dealId ? '' : init.property ?? '');
  const [status, setStatus] = useState<AfterSalesService['status']>(init.status ?? 'OPEN');
  const [details, setDetails] = useState<Details>(init.details ?? {});
  const [notes, setNotes] = useState(init.notes ?? '');
  const [busy, setBusy] = useState(false);

  if (!type)
    return (
      <Modal title="New after-sales service" onClose={onClose} wide>
        <p className="muted">What does the customer need help with?</p>
        <div className="type-picker">
          {(Object.keys(SERVICE_META) as ServiceType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`type-card svc-${t.toLowerCase()}`}
              onClick={() => {
                setType(t);
                if (!title) setTitle(TEMPLATES.find((x) => x.type === t)?.title ?? '');
              }}
            >
              <span className="svc-icon">
                <Icon name={SERVICE_META[t].icon} size={18} />
              </span>
              <strong>{serviceTypeLabel[t]}</strong>
              <span className="cell-sub">{SERVICE_META[t].hint}</span>
            </button>
          ))}
        </div>
      </Modal>
    );

  const fields = FIELDS[type] ?? [];
  const setD = (k: string, v: string | number | boolean | null) => setDetails({ ...details, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !type) return;
    setBusy(true);
    const deal = dealOpts.find((d) => d.id === dealId);
    const input: ServiceInput = {
      type,
      title: title.trim(),
      dealId: deal ? deal.id : null,
      property: deal ? deal.label : property.trim() || null,
      status,
      details,
      notes: notes.trim() || null,
    };
    const ok = await run(service ? updateService(id, service.id, input) : addService(id, input));
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal title={service ? `Edit ${service.title}` : `New ${serviceTypeLabel[type].toLowerCase()} service`} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        {!service && (
          <div className="span-2 type-chosen">
            <span className={`svc-icon svc-${type.toLowerCase()}`}>
              <Icon name={SERVICE_META[type].icon} size={16} />
            </span>
            {serviceTypeLabel[type]}
            <button type="button" className="link-btn" onClick={() => setType(null)}>
              Change
            </button>
          </div>
        )}
        <label className="field span-2">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Property</span>
          <select value={dealId} onChange={(e) => setDealId(e.target.value)}>
            {dealOpts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
            <option value="other">Other property…</option>
          </select>
        </label>
        {dealId === 'other' ? (
          <label className="field">
            <span>Property name</span>
            <input value={property} onChange={(e) => setProperty(e.target.value)} placeholder="e.g. The Tampines Trilliant #08-11" />
          </label>
        ) : (
          <span className="field-spacer" />
        )}
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as AfterSalesService['status'])}>
            {STATUS_ORDER.map((x) => (
              <option key={x} value={x}>
                {serviceStatusLabel[x]}
              </option>
            ))}
          </select>
        </label>
        <span className="field-spacer" />
        {fields.map((f) => {
          const v = details[f.key];
          if (f.kind === 'bool')
            return (
              <label key={f.key} className="check-inline tall span-2">
                <input type="checkbox" checked={v === true} onChange={(e) => setD(f.key, e.target.checked)} /> {f.label}
              </label>
            );
          if (f.kind === 'select')
            return (
              <label key={f.key} className="field">
                <span>{f.label}</span>
                <select value={(v as string) ?? ''} onChange={(e) => setD(f.key, e.target.value || null)}>
                  <option value="">Choose…</option>
                  {f.options!.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            );
          return (
            <label key={f.key} className="field">
              <span>{f.label}</span>
              <input
                type={f.kind === 'date' ? 'date' : 'text'}
                inputMode={f.kind === 'money' ? 'numeric' : undefined}
                value={f.kind === 'money' ? (typeof v === 'number' ? v.toLocaleString('en-SG') : '') : ((v as string) ?? '')}
                placeholder={f.placeholder}
                onChange={(e) => {
                  if (f.kind === 'money') {
                    const n = Number(e.target.value.replace(/[^\d]/g, ''));
                    setD(f.key, e.target.value.trim() ? n : null);
                  } else setD(f.key, e.target.value || null);
                }}
              />
            </label>
          );
        })}
        <label className="field span-2">
          <span>Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="dialog-actions span-2">
          {service && (
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={async () => window.confirm(`Delete "${service.title}"?`) && (await run(deleteService(id, service.id))) && onClose()}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy || !title.trim()}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />} {service ? 'Save' : 'Add service'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
