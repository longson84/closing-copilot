import type { Stage, StageKey } from '../../../src/shared/types';
import { daysBetween, daysLeftLabel, formatDate, stageShort, todayISO } from '../format';
import { Icon } from './ui';

export function StageRail({
  stages,
  current,
  onComplete,
}: {
  stages: Stage[];
  current: StageKey;
  onComplete: (s: Stage) => void;
}) {
  const today = todayISO();
  const allDone = stages.every((s) => s.completedAt);
  const doneCount = stages.filter((s) => s.completedAt).length;
  return (
    <ol className="rail" style={{ ['--p' as string]: String(Math.max(doneCount - 1, 0) / (stages.length - 1)) }}>
      {stages.map((s, i) => {
        const isCurrent = !allDone && s.key === current;
        const days = s.dueDate ? daysBetween(today, s.dueDate) : null;
        const state = s.completedAt ? 'done' : isCurrent ? (days !== null && days < 0 ? 'current overdue' : days !== null && days <= 7 ? 'current soon' : 'current') : 'todo';
        return (
          <li key={s.key} className={`rail-step ${state}`}>
            <span className="rail-node">{s.completedAt ? <Icon name="check" size={13} /> : i + 1}</span>
            <span className="rail-label" title={s.description}>
              {stageShort[s.key] ?? s.label}
            </span>
            {s.completedAt ? (
              <span className="rail-date">Done {formatDate(s.completedAt)}</span>
            ) : s.dueDate ? (
              <span className="rail-date">
                Due {formatDate(s.dueDate)}
                {isCurrent && <em>{daysLeftLabel(days)}</em>}
              </span>
            ) : (
              <span className="rail-date muted">Set when previous stage is done</span>
            )}
            {isCurrent && (
              <button className="btn btn-sm btn-primary rail-action" onClick={() => onComplete(s)}>
                <Icon name="check" size={13} /> Mark complete
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
