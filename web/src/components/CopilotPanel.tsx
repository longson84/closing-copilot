import { useEffect, useRef, useState } from 'react';
import { streamChat } from '../api';
import { humanizeTool } from '../format';
import { Markdown } from './Markdown';
import { Icon, Spinner } from './ui';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  tools: string[];
  error?: string;
  pending?: boolean;
}

const DEAL_SUGGESTIONS = [
  'What do I need to do today?',
  'Is this deal on track?',
  'Calculate stamp duty for this buyer',
  'Draft a reminder to the buyer',
];
const GLOBAL_SUGGESTIONS = ['What do I need to do today?', 'Which deals are at risk this week?', 'Which documents have problems?'];

export function CopilotPanel({ open, onClose, dealId }: { open: boolean; onClose: () => void; dealId?: string }) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs]);

  useEffect(() => () => abort.current?.abort(), []);

  const update = (fn: (m: Msg) => Msg) =>
    setMsgs((all) => {
      const copy = all.slice();
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setMsgs((m) => [...m, { role: 'user', text: message, tools: [] }, { role: 'assistant', text: '', tools: [], pending: true }]);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      for await (const ev of streamChat({ sessionId, message, ...(dealId ? { dealId } : {}) }, ctrl.signal)) {
        if (ev.type === 'text') update((m) => ({ ...m, text: m.text + ev.text }));
        else if (ev.type === 'tool') update((m) => ({ ...m, tools: [...m.tools, ev.name] }));
        else if (ev.type === 'error') update((m) => ({ ...m, error: ev.message }));
        else if (ev.type === 'done') break;
      }
    } catch (e) {
      if (!ctrl.signal.aborted) update((m) => ({ ...m, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      update((m) => ({ ...m, pending: false }));
      setBusy(false);
    }
  }

  return (
    <aside className={`copilot${open ? ' open' : ''}`} aria-label="Copilot" aria-hidden={!open}>
      <header className="copilot-head">
        <span className="copilot-title">
          <span className="copilot-mark">
            <Icon name="spark" size={14} />
          </span>
          Copilot
        </span>
        <span className="copilot-context">{dealId ? 'Looking at this deal' : 'All deals'}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close copilot">
          <Icon name="close" />
        </button>
      </header>

      <div className="copilot-body" ref={scroller}>
        {msgs.length === 0 && (
          <div className="copilot-empty">
            <p>
              Ask about deadlines, documents or stamp duty. I check the deal records before answering, and never guess an
              amount or a date.
            </p>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="msg msg-user">
              {m.text}
            </div>
          ) : (
            <div key={i} className="msg msg-ai">
              {m.tools.length > 0 && (
                <div className="tool-chips">
                  {m.tools.map((t, j) => {
                    const active = m.pending && j === m.tools.length - 1 && !m.text;
                    return (
                      <span key={j} className={`tool-chip${active ? ' active' : ''}`}>
                        {active ? <Spinner size={10} /> : <Icon name="check" size={12} />}
                        {humanizeTool(t)}
                        {active ? '…' : ''}
                      </span>
                    );
                  })}
                </div>
              )}
              {m.text ? (
                <Markdown text={m.text} />
              ) : (
                m.pending &&
                m.tools.length === 0 && (
                  <span className="typing">
                    <i />
                    <i />
                    <i />
                  </span>
                )
              )}
              {m.error && (
                <div className="msg-error">
                  <Icon name="alert" size={14} /> {m.error}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      <div className="copilot-foot">
        <div className="suggestions">
          {(dealId ? DEAL_SUGGESTIONS : GLOBAL_SUGGESTIONS).map((s) => (
            <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            rows={1}
            placeholder={dealId ? 'Ask about this deal…' : 'Ask about your pipeline…'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button className="send-btn" type="submit" disabled={busy || !input.trim()} aria-label="Send">
            {busy ? <Spinner size={14} /> : <Icon name="send" size={16} />}
          </button>
        </form>
      </div>
    </aside>
  );
}
