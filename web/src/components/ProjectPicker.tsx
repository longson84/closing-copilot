import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Project } from '../../../src/shared/types';
import { formatMonth } from '../format';
import { PHONE, useMedia } from '../pwa';
import { ProjectBadges, projectMatches, sortProjects } from './ProjectCard';
import { Icon, Spinner } from './ui';

export type ProjectChoice = Project | 'other' | null;

function Option({ p }: { p: Project }) {
  return (
    <span className="opt">
      <span className="opt-main">
        <span className="opt-name">{p.name}</span>
        <span className="opt-sub">{[p.developer, p.district].filter(Boolean).join(', ') || '—'}</span>
        <ProjectBadges p={p} />
      </span>
      <span className="opt-dates">
        {p.launchDate && <span>Launched {formatMonth(p.launchDate)}</span>}
        {p.expectedTop && <span>TOP {formatMonth(p.expectedTop)}</span>}
      </span>
    </span>
  );
}

export function ProjectPicker({
  projects,
  loading,
  error,
  value,
  onChange,
  invalid,
}: {
  projects: Project[];
  loading: boolean;
  error: string | null;
  value: ProjectChoice;
  onChange: (v: ProjectChoice) => void;
  invalid?: boolean;
}) {
  const isPhone = useMedia(PHONE);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const items = useMemo(() => sortProjects(projects).filter((p) => projectMatches(p, q)), [projects, q]);
  const total = items.length + 1; // + "Other / not listed"

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (!open || isPhone) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, isPhone]);
  useEffect(() => {
    if (open && isPhone) {
      document.body.classList.add('sheet-open');
      setTimeout(() => input.current?.focus(), 50);
      return () => document.body.classList.remove('sheet-open');
    }
  }, [open, isPhone]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (v: ProjectChoice) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      choose(active < items.length ? items[active] : 'other');
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const label = value === 'other' ? 'Other / not listed' : value ? value.name : '';

  const listbox = (
    <ul className="combo-list" role="listbox" id="project-listbox" ref={list}>
      {loading && (
        <li className="combo-status">
          <Spinner size={14} /> Loading projects…
        </li>
      )}
      {error && <li className="combo-status">Couldn't load the project catalog. Choose "Other" to type the name.</li>}
      {!loading && !error && items.length === 0 && <li className="combo-status">No projects match "{q}".</li>}
      {items.map((p, i) => (
        <li
          key={p.id}
          data-i={i}
          role="option"
          aria-selected={value !== 'other' && value?.id === p.id}
          className={`combo-opt${i === active ? ' active' : ''}${p.fictional ? ' demo' : ''}`}
          onMouseEnter={() => setActive(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => choose(p)}
        >
          <Option p={p} />
        </li>
      ))}
      <li
        data-i={items.length}
        role="option"
        aria-selected={value === 'other'}
        className={`combo-opt combo-other${active === items.length ? ' active' : ''}`}
        onMouseEnter={() => setActive(items.length)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => choose('other')}
      >
        <Icon name="plus" size={14} /> Other / not listed
      </li>
    </ul>
  );

  if (isPhone) {
    return (
      <div className="combo" ref={wrap}>
        <button type="button" className={`combo-trigger${invalid ? ' invalid' : ''}`} onClick={() => setOpen(true)}>
          <span className={label ? '' : 'placeholder'}>{label || 'Choose a project'}</span>
          <Icon name="chevron" size={14} />
        </button>
        {open && (
          <div className="combo-sheet" role="dialog" aria-modal="true" aria-label="Choose a project">
            <div className="combo-sheet-head">
              <div className="combo-search">
                <Icon name="search" size={16} />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Search projects"
                  aria-controls="project-listbox"
                  enterKeyHint="search"
                />
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
            {listbox}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="combo" ref={wrap}>
      <div className={`combo-search combo-input${invalid ? ' invalid' : ''}${open ? ' open' : ''}`}>
        <Icon name="search" size={16} />
        <input
          ref={input}
          role="combobox"
          aria-expanded={open}
          aria-controls="project-listbox"
          aria-autocomplete="list"
          value={open ? q : label}
          placeholder={label || 'Search by project, developer or district'}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKey}
        />
        {value && !open && (
          <button type="button" className="icon-btn combo-clear" onClick={() => onChange(null)} aria-label="Clear project">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      {open && <div className="combo-pop">{listbox}</div>}
    </div>
  );
}
