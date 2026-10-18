import type { Project } from '../../../src/shared/types';
import { formatMonth, formatSGD } from '../format';
import { Icon } from './ui';

export function projectMatches(p: Project, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [p.name, p.developer, p.district, p.address, p.segment, p.type === 'EC' ? 'EC executive condo' : null]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(s));
}

/** Fictional demo project first, then the API order (newest launch first). */
export function sortProjects(list: Project[]): Project[] {
  return [...list.filter((p) => p.fictional), ...list.filter((p) => !p.fictional)];
}

export function ProjectBadges({ p }: { p: Project }) {
  return (
    <span className="proj-badges">
      {p.fictional && <span className="tag tag-demo">Demo project (fictional)</span>}
      {p.segment && <span className={`tag tag-${p.segment.toLowerCase()}`}>{p.segment}</span>}
      {p.type === 'EC' && <span className="tag tag-ec">EC</span>}
      {p.type === 'LANDED_STRATA' && <span className="tag">Strata landed</span>}
    </span>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function ProjectCard({ p, onClose }: { p: Project; onClose?: () => void }) {
  const facts: [string, string | null][] = [
    ['Developer', p.developer],
    ['Address', p.address],
    ['District', p.district],
    ['Tenure', p.tenure],
    ['Total units', p.totalUnits !== null ? p.totalUnits.toLocaleString('en-SG') : null],
    ['Launched', p.launchDate ? formatMonth(p.launchDate) : null],
    ['Expected TOP', p.expectedTop ? formatMonth(p.expectedTop) : null],
    ['Price from', p.priceFromSgd !== null ? formatSGD(p.priceFromSgd) : null],
    ['Average', p.avgPsfSgd !== null ? `${formatSGD(p.avgPsfSgd)} psf` : null],
  ];
  return (
    <section className="proj-card" aria-label={p.name}>
      <header className="proj-card-head">
        <div>
          <h3>{p.name}</h3>
          <ProjectBadges p={p} />
        </div>
        {onClose && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close project details">
            <Icon name="close" />
          </button>
        )}
      </header>
      <dl className="proj-facts">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className={k === 'Address' || k === 'Developer' ? 'wide' : ''}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {p.unitMix.length > 0 && (
        <div className="proj-mix">
          {p.unitMix.map((u) => (
            <span key={u} className="chip-static">
              {u}
            </span>
          ))}
        </div>
      )}
      {p.sources.length > 0 && (
        <p className="proj-sources">
          Sources:{' '}
          {p.sources.map((s, i) => (
            <span key={s}>
              {i > 0 && ', '}
              <a href={s} target="_blank" rel="noopener noreferrer">
                {hostOf(s)}
              </a>
            </span>
          ))}
        </p>
      )}
      {p.fictional && <p className="proj-note">Made-up project used by the demo documents. Not a real launch.</p>}
    </section>
  );
}
