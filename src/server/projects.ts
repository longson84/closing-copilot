// Catalog of Singapore new-launch projects (public reference data, plus the fictional demo project).

import { readFileSync } from 'node:fs';
import type { Project } from '../shared/types.js';

const FILE = new URL('./data/projects.json', import.meta.url);

const projects: Project[] = (JSON.parse(readFileSync(FILE, 'utf8')) as Project[]).sort((a, b) =>
    (b.launchDate ?? '').localeCompare(a.launchDate ?? ''),
);

export function listProjects(): Project[] {
    return projects;
}

export function getProject(id: string | null | undefined): Project | null {
    return (id && projects.find((p) => p.id === id)) || null;
}

export function findProjectByName(name: string): Project | null {
    const n = name.trim().toLowerCase();
    return projects.find((p) => p.name.toLowerCase() === n) ?? null;
}

/** Expected TOP as a date: "2029-06" -> "2029-06-30", "2029" -> "2029-12-31". */
export function expectedTopDate(project: Project | null): string | null {
    const top = project?.expectedTop;
    if (!top) return null;
    if (/^\d{4}$/.test(top)) return `${top}-12-31`;
    const m = /^(\d{4})-(\d{2})$/.exec(top);
    if (!m) return null;
    const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
    return `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`;
}
