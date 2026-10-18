import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AfterSalesService, ServiceType } from '../../../src/shared/types';
import { listServices } from '../api';
import { keyDetail, SERVICE_META } from '../components/services';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import { daysBetween, serviceStatusLabel, serviceTypeLabel, todayISO } from '../format';

type Row = AfterSalesService & { customerName: string };
const ORDER: ServiceType[] = ['TENANCY', 'RENTAL', 'FURNISHING', 'TAX', 'DEFECTS', 'REFINANCING', 'OTHER'];

function urgent(s: Row): boolean {
  const end = s.type === 'TENANCY' && typeof s.details.leaseEnd === 'string' ? s.details.leaseEnd : null;
  return !!end && daysBetween(todayISO(), end) <= 90;
}

export function AfterSales() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ServiceType | 'ALL'>('ALL');

  const load = useCallback(() => {
    setError(null);
    listServices()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const groups = useMemo(
    () =>
      ORDER.map((t) => [t, (rows ?? []).filter((r) => r.type === t && (type === 'ALL' || type === t))] as const).filter(([, l]) => l.length),
    [rows, type],
  );
  const present = ORDER.filter((t) => (rows ?? []).some((r) => r.type === t));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>After-sales</h1>
          <p className="page-sub">Open services across your customers: tenants, tenancies, furnishing and tax.</p>
        </div>
      </header>

      {present.length > 1 && (
        <div className="seg-chips" role="group" aria-label="Service type">
          <button className={`seg-chip${type === 'ALL' ? ' on' : ''}`} aria-pressed={type === 'ALL'} onClick={() => setType('ALL')}>
            All <span className="seg-count">{rows?.length ?? 0}</span>
          </button>
          {present.map((t) => (
            <button key={t} className={`seg-chip${type === t ? ' on' : ''}`} aria-pressed={type === t} onClick={() => setType(t)}>
              {serviceTypeLabel[t]} <span className="seg-count">{(rows ?? []).filter((r) => r.type === t).length}</span>
            </button>
          ))}
        </div>
      )}

      {error && <ErrorNote message={`Couldn't load services: ${error}`} onRetry={load} />}

      {!rows && !error ? (
        <div className="loading-block">
          <Spinner /> Loading services…
        </div>
      ) : groups.length === 0 ? (
        <div className="card empty">
          <p>No open after-sales services. Add one from a customer's After-sales tab.</p>
        </div>
      ) : (
        groups.map(([t, list]) => (
          <section key={t} className="card">
            <div className="card-head">
              <h2 className="svc-group-head">
                <span className={`svc-icon small svc-${t.toLowerCase()}`}>
                  <Icon name={SERVICE_META[t].icon} size={14} />
                </span>
                {serviceTypeLabel[t]} <span className="group-count">{list.length}</span>
              </h2>
            </div>
            <ul className="as-list">
              {list.map((s) => (
                <li key={s.id}>
                  <a href={`#/customers/${s.customerId}?tab=aftersales`}>
                    <span className="as-main">
                      <strong>{s.title}</strong>
                      <span className="cell-sub">
                        {s.customerName}
                        {s.property ? `, ${s.property}` : ''}
                      </span>
                    </span>
                    <span className="as-side">
                      {keyDetail(s) && <span className={`as-key${urgent(s) ? ' soon' : ''}`}>{keyDetail(s)}</span>}
                      <span className={`status-pill st-${s.status.toLowerCase()}`}>{serviceStatusLabel[s.status]}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
