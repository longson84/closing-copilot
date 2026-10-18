import { useCallback, useEffect, useState } from 'react';
import type { FollowUp } from '../../../src/shared/types';
import { getFollowups } from '../api';
import { ErrorNote, Icon, Spinner } from './ui';

const channelIcon = { CALL: 'phone', MESSAGE: 'message', EMAIL: 'mail', MEETING: 'meeting' } as const;
const channelLabel = { CALL: 'Call', MESSAGE: 'Message', EMAIL: 'Email', MEETING: 'Meet' } as const;

function FollowUpCard({ f }: { f: FollowUp }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!f.draftMessage) return;
    try {
      await navigator.clipboard.writeText(f.draftMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <li className="fu">
      <span className="fu-channel" title={channelLabel[f.channel]}>
        <Icon name={channelIcon[f.channel]} size={15} />
      </span>
      <div className="fu-main">
        <div className="fu-top">
          <strong>{f.title}</strong>
          <span className="fu-when">{f.when}</span>
        </div>
        <p className="fu-why">{f.why}</p>
        {f.draftMessage && (
          <>
            <button className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <span className={`chev${open ? ' open' : ''}`}>
                <Icon name="chevron" size={12} />
              </span>
              {open ? 'Hide draft' : `Show draft ${channelLabel[f.channel].toLowerCase()}`}
            </button>
            {open && (
              <div className="draft">
                <p>{f.draftMessage}</p>
                <button className="btn btn-sm btn-secondary" onClick={copy}>
                  <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied' : 'Copy message'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function Followups({ dealId, refreshKey }: { dealId: string; refreshKey: number }) {
  const [items, setItems] = useState<FollowUp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setItems(null);
    setError(null);
    getFollowups(dealId)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [dealId]);
  useEffect(load, [load, refreshKey]);

  return (
    <section className="card">
      <div className="card-head">
        <h2>After-sales & follow-ups</h2>
        <span className="card-hint">Personalised to this buyer</span>
      </div>
      {error ? (
        <ErrorNote message={`Couldn't load suggestions: ${error}`} onRetry={load} />
      ) : !items ? (
        <div className="loading-block small">
          <Spinner size={14} /> Planning follow-ups with Gemini…
        </div>
      ) : items.length === 0 ? (
        <p className="muted pad">No follow-ups suggested right now.</p>
      ) : (
        <ul className="fu-list">
          {items.map((f, i) => (
            <FollowUpCard key={i} f={f} />
          ))}
        </ul>
      )}
    </section>
  );
}
