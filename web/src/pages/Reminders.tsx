import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReminderItem } from '../../../src/shared/types';
import { listReminders, updateReminder } from '../api';
import { askCopilot, OriginBadge, REMINDERS_CHANGED } from '../components/crm';
import { DATE_ICON } from '../components/family';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import { dueLabel, formatDateShort } from '../format';
import { SnoozeDone } from './CustomerPage';

type Origin = 'ALL' | 'AI' | 'AGENT' | 'DEAL' | 'DATE';
const ORIGINS: [Origin, string][] = [
  ['ALL', 'All'],
  ['AI', 'AI'],
  ['AGENT', 'You'],
  ['DEAL', 'Deal deadlines'],
  ['DATE', 'Dates'],
];

function wishesPrompt(r: ReminderItem): string {
  const rel = r.relationLabel ?? r.title.match(/\(([^)]+)\)/)?.[1];
  if (r.dateKind === 'ANNIVERSARY') return `Draft a short anniversary message from Rachel to ${r.customerName}`;
  if (r.personName) return `Draft a short birthday message from Rachel to ${r.personName} (${rel ?? 'family'} of ${r.customerName})`;
  return `Draft a short birthday message from Rachel to ${r.customerName}`;
}

const GROUPS: [string, string, (d: number) => boolean][] = [
  ['overdue', 'Overdue', (d) => d < 0],
  ['today', 'Today', (d) => d === 0],
  ['week', 'This week', (d) => d > 0 && d <= 7],
  ['later', 'Later', (d) => d > 7],
];


export function Reminders() {
  const [items, setItems] = useState<ReminderItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>('ALL');

  const load = useCallback(() => {
    setError(null);
    listReminders()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const visible = useMemo(() => (items ?? []).filter((r) => origin === 'ALL' || r.origin === origin), [items, origin]);

  async function patch(r: ReminderItem, p: { status?: 'DONE'; dueDate?: string }) {
    // Optimistic: drop done items, move snoozed ones.
    setItems((cur) =>
      (cur ?? [])
        .filter((x) => !(p.status && x.id === r.id))
        .map((x) => (x.id === r.id && p.dueDate ? { ...x, dueDate: p.dueDate, daysLeft: x.daysLeft + daysDiff(x.dueDate, p.dueDate) } : x)),
    );
    try {
      await updateReminder(r.id, p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    load();
    window.dispatchEvent(new Event(REMINDERS_CHANGED));
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Reminders</h1>
          <p className="page-sub">Your follow-ups and every legal deadline across your deals, in one list.</p>
        </div>
      </header>

      <div className="seg-chips" role="group" aria-label="Origin">
        {ORIGINS.map(([k, label]) => (
          <button key={k} className={`seg-chip${origin === k ? ' on' : ''}`} aria-pressed={origin === k} onClick={() => setOrigin(k)}>
            {label}
            {items && <span className="seg-count">{(items ?? []).filter((r) => k === 'ALL' || r.origin === k).length}</span>}
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} onRetry={load} />}

      {!items && !error ? (
        <div className="loading-block">
          <Spinner /> Loading reminders…
        </div>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <p>Nothing to follow up. Enjoy the quiet.</p>
        </div>
      ) : (
        GROUPS.map(([key, label, test]) => {
          const rows = visible.filter((r) => test(r.daysLeft));
          if (!rows.length) return null;
          return (
            <section key={key} className={`card rem-group rem-${key}`}>
              <div className="card-head">
                <h2>
                  {label} <span className="group-count">{rows.length}</span>
                </h2>
              </div>
              <ul className="rem-list">
                {rows.map((r) => (
                  <li key={r.id} className={`${key === 'overdue' ? 'is-overdue' : key === 'today' ? 'is-today' : ''}${r.kind === 'IMPORTANT_DATE' ? ' is-date' : ''}`}>
                    {r.kind === 'IMPORTANT_DATE' && (
                      <span className={`date-icon k-${(r.dateKind ?? 'CUSTOM').toLowerCase()}`}>
                        <Icon name={DATE_ICON[r.dateKind ?? 'CUSTOM']} size={16} />
                      </span>
                    )}
                    <div className="rem-main">
                      <span className="rem-title">
                        {r.kind === 'DEAL_DEADLINE' && r.dealId ? <a href={`#/deals/${r.dealId}`}>{r.title}</a> : r.title}
                        <OriginBadge origin={r.origin} />
                      </span>
                      <a className="rem-cust" href={`#/customers/${r.customerId}${r.kind === 'IMPORTANT_DATE' ? '?tab=family' : ''}`}>
                        <Icon name="user" size={12} /> {r.customerName}
                      </a>
                      {r.detail && <span className="cell-sub">{r.detail}</span>}
                      <span className="rem-due">
                        <Icon name="clock" size={12} /> {dueLabel(r.dueDate)}
                        {key !== 'today' && key !== 'overdue' ? '' : `, ${formatDateShort(r.dueDate)}`}
                      </span>
                    </div>
                    {r.kind === 'REMINDER' ? (
                      <SnoozeDone r={r} onPatch={(p) => patch(r, p as { status?: 'DONE'; dueDate?: string })} />
                    ) : r.kind === 'IMPORTANT_DATE' ? (
                      (r.dateKind === 'BIRTHDAY' || r.dateKind === 'ANNIVERSARY') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => askCopilot(wishesPrompt(r))}>
                          <Icon name="spark" size={13} /> Send wishes
                        </button>
                      )
                    ) : (
                      r.dealId && (
                        <a className="btn btn-sm btn-secondary" href={`#/deals/${r.dealId}`}>
                          Open deal
                        </a>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function daysDiff(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);
}

/** Overdue + today count for the nav badge. */
export function useReminderBadge(routeKey: string): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const load = () =>
      listReminders()
        .then((items) => setN(items.filter((r) => r.daysLeft <= 0).length))
        .catch(() => undefined);
    load();
    window.addEventListener(REMINDERS_CHANGED, load);
    return () => window.removeEventListener(REMINDERS_CHANGED, load);
  }, [routeKey]);
  return n;
}
