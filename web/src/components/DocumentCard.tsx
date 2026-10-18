import { useState } from 'react';
import type { DealDocument } from '../../../src/shared/types';
import { docTypeLabel, formatDateTime, formatValue, humanizeField, stageShort } from '../format';
import { Icon } from './ui';

export function DocumentCard({ doc, fresh }: { doc: DealDocument; fresh?: boolean }) {
  const replaced = Boolean(doc.supersededBy);
  const issues = replaced ? [] : doc.checks.filter((c) => c.status !== 'OK');
  const mismatches = replaced ? [] : doc.checks.filter((c) => c.status === 'MISMATCH');
  const [open, setOpen] = useState(Boolean(fresh) || issues.length > 0);
  const fields = Object.entries(doc.extracted);
  const tone = replaced ? 'replaced' : mismatches.length ? 'bad' : issues.length ? 'warn' : 'ok';

  return (
    <article className={`doc doc-${tone}${fresh ? ' fresh' : ''}`} id={`doc-${doc.id}`}>
      <button className="doc-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="doc-icon">
          <Icon name="file" size={18} />
        </span>
        <span className="doc-title">
          <strong>{docTypeLabel[doc.type]}</strong>
          <span className="cell-sub">
            {doc.fileName} · {formatDateTime(doc.uploadedAt)}
          </span>
        </span>
        <span className={`doc-status doc-status-${tone}`}>
          {replaced ? (
            <>Replaced by a corrected version</>
          ) : mismatches.length ? (
            <>
              <Icon name="alert" size={13} /> {mismatches.length} mismatch{mismatches.length > 1 ? 'es' : ''}
            </>
          ) : issues.length ? (
            <>
              <Icon name="clock" size={13} /> {issues.length} to follow up
            </>
          ) : (
            <>
              <Icon name="check" size={13} /> All checks passed
            </>
          )}
        </span>
        <span className={`chev${open ? ' open' : ''}`}>
          <Icon name="chevron" size={14} />
        </span>
      </button>

      {mismatches.map((c, i) => (
        <div key={i} className="mismatch" role="alert">
          <span className="mismatch-icon">
            <Icon name="alert" size={18} />
          </span>
          <div>
            <strong>{humanizeField(c.field)} doesn't match</strong>
            <p>{c.message}</p>
          </div>
        </div>
      ))}

      {open && (
        <div className="doc-body">
          {doc.summary && <p className="doc-summary">{doc.summary}</p>}
          {fields.length > 0 && (
            <dl className="fields">
              {fields.map(([k, v]) => {
                const flagged = issues.some((c) => c.field === k);
                return (
                  <div key={k} className={flagged ? 'flagged' : ''}>
                    <dt>{humanizeField(k)}</dt>
                    <dd>{formatValue(k, v)}</dd>
                  </div>
                );
              })}
            </dl>
          )}
          {doc.checks.filter((c) => c.status !== 'MISMATCH').length > 0 && (
            <ul className="checks">
              {doc.checks
                .filter((c) => c.status !== 'MISMATCH')
                .map((c, i) => (
                  <li key={i} className={`check check-${c.status.toLowerCase()}`}>
                    <Icon name={c.status === 'OK' ? 'check' : 'clock'} size={14} />
                    <span>{c.message}</span>
                  </li>
                ))}
            </ul>
          )}
          {doc.suggestedStage && <p className="doc-evidence">Evidence for: {stageShort[doc.suggestedStage]}</p>}
        </div>
      )}
    </article>
  );
}
