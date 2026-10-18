import { useCallback, useEffect, useState } from 'react';
import type { CustomerInput, CustomerStatus, CustomerSummary } from '../../../src/shared/types';
import { createCustomer, listCustomers } from '../api';
import { StatusPill } from '../components/crm';
import { CustomerForm } from '../components/CustomerForm';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import { dueLabel, formatBudget, relativeDay, statusLabel, todayISO } from '../format';
import { navigate } from '../router';

const STATUSES: Array<CustomerStatus | ''> = ['', 'LEAD', 'PROSPECT', 'BOOKED', 'AFTER_SALES', 'LOST'];

function NextReminder({ c }: { c: CustomerSummary }) {
  if (!c.nextReminderDate) return <span className="cell-sub">—</span>;
  const overdue = c.nextReminderDate < todayISO();
  return (
    <span className={`next-rem${overdue ? ' is-overdue' : c.nextReminderDate === todayISO() ? ' is-today' : ''}`}>
      <Icon name="clock" size={12} />
      {dueLabel(c.nextReminderDate)}
    </span>
  );
}

export function Customers() {
  const [rows, setRows] = useState<CustomerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');

  const load = useCallback(() => {
    setError(null);
    listCustomers(q, status)
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, [q, status]);
  useEffect(() => {
    const t = setTimeout(load, q ? 200 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="page-sub">Everyone you're working with, from first enquiry to after-sales.</p>
        </div>
        <div className="head-actions">
          <a className="btn btn-secondary" href="#/customers/new">
            <Icon name="plus" size={15} /> Add customer
          </a>
          <a className="btn btn-primary" href="#/whatsapp">
            <Icon name="message" size={15} /> Import WhatsApp chat
          </a>
        </div>
      </header>

      <div className="proj-toolbar">
        <div className="combo-search proj-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" inputMode="search" />
        </div>
        <div className="seg-chips" role="group" aria-label="Status">
          {STATUSES.map((s) => (
            <button key={s || 'all'} className={`seg-chip${status === s ? ' on' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s ? statusLabel[s] : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={`Couldn't load customers: ${error}`} onRetry={load} />}

      <section className="card table-card">
        {!rows && !error ? (
          <div className="loading-block">
            <Spinner /> Loading customers…
          </div>
        ) : rows && rows.length === 0 ? (
          <div className="empty">
            <p>{q || status ? 'No customers match.' : 'No customers yet. Add one, or import a WhatsApp chat and let Copilot fill in the details.'}</p>
          </div>
        ) : (
          <>
            <table className="deals crm-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Budget</th>
                  <th>Last contact</th>
                  <th>Next reminder</th>
                  <th className="num">Open</th>
                  <th className="num">Shortlist</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/customers/${c.id}`)}>
                    <td className="wrap">
                      <span className="cell-strong">{c.fullName}</span>
                      <span className="cell-sub">{c.phone ?? '—'}</span>
                    </td>
                    <td>
                      <StatusPill status={c.status} />
                    </td>
                    <td className="tabular">{formatBudget(c.budgetMinSgd, c.budgetMaxSgd)}</td>
                    <td className="wrap">
                      <span>{relativeDay(c.lastContactAt)}</span>
                      {c.lastNoteSnippet && <span className="cell-sub snippet">{c.lastNoteSnippet}</span>}
                    </td>
                    <td>
                      <NextReminder c={c} />
                    </td>
                    <td className="num">{c.openReminders || <span className="cell-sub">0</span>}</td>
                    <td className="num">{c.shortlisted || <span className="cell-sub">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="deal-cards">
              {(rows ?? []).map((c) => (
                <li key={c.id}>
                  <a className="deal-card" href={`#/customers/${c.id}`}>
                    <span className="deal-card-top">
                      <span>
                        <span className="cell-strong">{c.fullName}</span>
                        <span className="cell-sub">{c.phone ?? 'No phone'}</span>
                      </span>
                      <StatusPill status={c.status} />
                    </span>
                    {c.lastNoteSnippet && <span className="cell-sub snippet">{c.lastNoteSnippet}</span>}
                    <span className="deal-card-foot">
                      <NextReminder c={c} />
                      <span className="cell-sub">{formatBudget(c.budgetMinSgd, c.budgetMaxSgd)}</span>
                      {c.shortlisted > 0 && <span className="cell-sub">{c.shortlisted} shortlisted</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

export function NewCustomer() {
  return (
    <div className="page">
      <a className="back" href="#/customers">
        <Icon name="back" size={14} /> Customers
      </a>
      <header className="page-head">
        <div>
          <h1>Add customer</h1>
          <p className="page-sub">
            Only the name is required. Prefer to skip the typing? <a href="#/whatsapp">Import a WhatsApp chat</a> instead.
          </p>
        </div>
      </header>
      <CustomerForm
        submitLabel="Add customer"
        onCancel={() => navigate('/customers')}
        onSubmit={async (input: CustomerInput) => {
          const d = await createCustomer(input);
          navigate(`/customers/${d.customer.id}`);
        }}
      />
    </div>
  );
}
