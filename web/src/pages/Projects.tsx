import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project } from '../../../src/shared/types';
import { listProjects } from '../api';
import { ProjectBadges, ProjectCard, projectMatches, sortProjects } from '../components/ProjectCard';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import { formatMonth, formatSGD } from '../format';

type Seg = 'ALL' | 'CCR' | 'RCR' | 'OCR' | 'EC';
const SEGMENTS: [Seg, string][] = [
  ['ALL', 'All'],
  ['CCR', 'CCR'],
  ['RCR', 'RCR'],
  ['OCR', 'OCR'],
  ['EC', 'EC'],
];

export function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [seg, setSeg] = useState<Seg>('ALL');
  const [open, setOpen] = useState<Project | null>(null);

  const load = useCallback(() => {
    setError(null);
    listProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const rows = useMemo(
    () =>
      sortProjects(projects ?? []).filter(
        (p) => projectMatches(p, q) && (seg === 'ALL' || (seg === 'EC' ? p.type === 'EC' : p.segment === seg)),
      ),
    [projects, q, seg],
  );

  const count = (s: Seg) =>
    (projects ?? []).filter((p) => s === 'ALL' || (s === 'EC' ? p.type === 'EC' : p.segment === s)).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="page-sub">New launches you can book buyers into, with developer, tenure, TOP and pricing at a glance.</p>
        </div>
      </header>

      <div className="proj-toolbar">
        <div className="combo-search proj-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, developer or district" />
        </div>
        <div className="seg-chips" role="group" aria-label="Market segment">
          {SEGMENTS.map(([k, label]) => (
            <button key={k} className={`seg-chip${seg === k ? ' on' : ''}`} onClick={() => setSeg(k)} aria-pressed={seg === k}>
              {label}
              {projects && <span className="seg-count">{count(k)}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={`Couldn't load projects: ${error}`} onRetry={load} />}

      <section className="card table-card">
        {!projects && !error ? (
          <div className="loading-block">
            <Spinner /> Loading projects…
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <p>No projects match these filters.</p>
          </div>
        ) : (
          <>
            <table className="deals projects-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>District</th>
                  <th>Tenure</th>
                  <th className="num">Units</th>
                  <th>Launched</th>
                  <th>Expected TOP</th>
                  <th className="num">From</th>
                  <th className="num">Avg psf</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} onClick={() => setOpen(p)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(p)}>
                    <td className="wrap">
                      <span className="cell-strong">{p.name}</span>
                      <span className="cell-sub">{p.developer ?? '—'}</span>
                      <ProjectBadges p={p} />
                    </td>
                    <td>{p.district ?? '—'}</td>
                    <td className="wrap">{p.tenure ?? '—'}</td>
                    <td className="num">{p.totalUnits?.toLocaleString('en-SG') ?? '—'}</td>
                    <td>{formatMonth(p.launchDate)}</td>
                    <td>{formatMonth(p.expectedTop)}</td>
                    <td className="num">{p.priceFromSgd !== null ? formatSGD(p.priceFromSgd) : '—'}</td>
                    <td className="num">{p.avgPsfSgd !== null ? formatSGD(p.avgPsfSgd) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="deal-cards">
              {rows.map((p) => (
                <li key={p.id}>
                  <button className="deal-card proj-row-card" onClick={() => setOpen(p)}>
                    <span className="deal-card-top">
                      <span>
                        <span className="cell-strong">{p.name}</span>
                        <span className="cell-sub">{[p.developer, p.district].filter(Boolean).join(', ')}</span>
                      </span>
                    </span>
                    <ProjectBadges p={p} />
                    <span className="deal-card-foot">
                      {p.expectedTop && <span className="due-chip">TOP {formatMonth(p.expectedTop)}</span>}
                      {p.priceFromSgd !== null && <span className="cell-sub">From {formatSGD(p.priceFromSgd)}</span>}
                      {p.tenure && <span className="cell-sub">{p.tenure}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {open && (
        <div className="dialog-backdrop" onClick={() => setOpen(null)}>
          <div className="dialog proj-dialog" role="dialog" aria-modal="true" aria-label={open.name} onClick={(e) => e.stopPropagation()}>
            <ProjectCard p={open} onClose={() => setOpen(null)} />
            <div className="dialog-actions">
              <a className="btn btn-primary" href={`#/new?project=${encodeURIComponent(open.id)}`} onClick={() => setOpen(null)}>
                <Icon name="plus" size={14} /> Book a buyer into this project
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
