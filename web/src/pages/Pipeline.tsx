import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DealSummary, StageKey } from '../../../src/shared/types';
import { listDeals } from '../api';
import { daysLeftLabel, formatDateShort, formatSGD } from '../format';
import { ErrorNote, Icon, RiskBadge, Spinner } from '../components/ui';
import { navigate } from '../router';

export const STAGE_ORDER: StageKey[] = ['BOOKING', 'CDD', 'SPA_DELIVERED', 'SPA_EXERCISED', 'STAMP_DUTY', 'DOWNPAYMENT_15', 'KEYS'];

type Filter = 'all' | 'overdue' | 'week' | 'issues';

const riskRank = { OVERDUE: 0, DUE_SOON: 1, ON_TRACK: 2, DONE: 3 } as const;

export function StageMeter({ stage, done }: { stage: StageKey; done: boolean }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <span className="stage-meter" aria-hidden="true">
      {STAGE_ORDER.map((k, i) => (
        <i key={k} className={done || i < idx ? 'filled' : i === idx ? 'current' : ''} />
      ))}
    </span>
  );
}

export function Pipeline() {
  const [deals, setDeals] = useState<DealSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(() => {
    setError(null);
    listDeals()
      .then(setDeals)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const counts = useMemo(() => {
    const d = deals ?? [];
    return {
      overdue: d.filter((x) => x.risk === 'OVERDUE').length,
      week: d.filter((x) => x.risk !== 'DONE' && x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= 7).length,
      issues: d.reduce((n, x) => n + x.openIssues, 0),
      issueDeals: d.filter((x) => x.openIssues > 0).length,
      active: d.filter((x) => x.risk !== 'DONE').length,
    };
  }, [deals]);

  const rows = useMemo(() => {
    const d = (deals ?? []).filter((x) =>
      filter === 'overdue'
        ? x.risk === 'OVERDUE'
        : filter === 'week'
          ? x.risk !== 'DONE' && x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= 7
          : filter === 'issues'
            ? x.openIssues > 0
            : true,
    );
    return d.sort((a, b) => riskRank[a.risk] - riskRank[b.risk] || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  }, [deals, filter]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  const toggle = (f: Filter) => setFilter((cur) => (cur === f ? 'all' : f));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{greeting}, Rachel</h1>
          <p className="page-sub">
            {deals ? `${counts.active} active bookings between OTP and keys.` : 'Loading your bookings…'}
          </p>
        </div>
        <a className="btn btn-primary" href="#/new">
          <Icon name="plus" size={16} /> New booking
        </a>
      </header>

      <section className="today" aria-label="Today">
        <button className={`today-item tone-red${filter === 'overdue' ? ' selected' : ''}`} onClick={() => toggle('overdue')}>
          <span className="today-num">{deals ? counts.overdue : '–'}</span>
          <span className="today-label">
            Overdue
            <small>Past a legal deadline</small>
          </span>
        </button>
        <button className={`today-item tone-amber${filter === 'week' ? ' selected' : ''}`} onClick={() => toggle('week')}>
          <span className="today-num">{deals ? counts.week : '–'}</span>
          <span className="today-label">
            Due this week
            <small>Next 7 days</small>
          </span>
        </button>
        <button className={`today-item tone-ink${filter === 'issues' ? ' selected' : ''}`} onClick={() => toggle('issues')}>
          <span className="today-num">{deals ? counts.issues : '–'}</span>
          <span className="today-label">
            Document issues
            <small>
              Across {counts.issueDeals} {counts.issueDeals === 1 ? 'deal' : 'deals'}
            </small>
          </span>
        </button>
      </section>

      {error && <ErrorNote message={`Couldn't load deals: ${error}`} onRetry={load} />}

      <section className="card table-card">
        <div className="table-head-row">
          <h2>
            {filter === 'all' ? 'All bookings' : filter === 'overdue' ? 'Overdue' : filter === 'week' ? 'Due this week' : 'With document issues'}
          </h2>
          {filter !== 'all' && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter('all')}>
              Show all
            </button>
          )}
        </div>
        {!deals && !error ? (
          <div className="loading-block">
            <Spinner /> Loading pipeline…
          </div>
        ) : rows.length === 0 && deals ? (
          <div className="empty">
            {deals.length === 0 ? (
              <>
                <p>No bookings yet. Register the first one with the buyer's ID and OTP details.</p>
                <a className="btn btn-primary" href="#/new">
                  <Icon name="plus" size={16} /> New booking
                </a>
              </>
            ) : (
              <p>Nothing here. Every deal in this view is on track.</p>
            )}
          </div>
        ) : (
          <table className="deals">
            <thead>
              <tr>
                <th>Buyer</th>
                <th className="num">Price</th>
                <th>Current stage</th>
                <th>Next deadline</th>
                <th>Status</th>
                <th className="num">Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.id}
                  className={`risk-row-${d.risk.toLowerCase()}`}
                  onClick={() => navigate(`/deals/${d.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/deals/${d.id}`)}
                >
                  <td>
                    <span className="cell-strong">{d.customerName}</span>
                    <span className="cell-sub">
                      {d.project}, {d.unit}
                    </span>
                  </td>
                  <td className="num tabular">{formatSGD(d.price)}</td>
                  <td className="wrap">
                    <span className="stage-cell">
                      <StageMeter stage={d.currentStage} done={d.risk === 'DONE'} />
                      <span>{d.risk === 'DONE' ? 'Keys collected' : d.currentStageLabel}</span>
                    </span>
                  </td>
                  <td>
                    {d.risk === 'DONE' ? (
                      <span className="cell-sub">—</span>
                    ) : (
                      <>
                        <span className="tabular">{d.nextDueDate ? formatDateShort(d.nextDueDate) : 'Awaiting prior stage'}</span>
                        <span className={`cell-sub days days-${d.risk.toLowerCase()}`}>{daysLeftLabel(d.daysLeft)}</span>
                      </>
                    )}
                  </td>
                  <td>
                    <RiskBadge risk={d.risk} />
                  </td>
                  <td className="num">
                    {d.openIssues > 0 ? (
                      <span className="issue-count">
                        <Icon name="alert" size={13} />
                        {d.openIssues}
                      </span>
                    ) : (
                      <span className="cell-sub">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
