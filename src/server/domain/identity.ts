// NRIC/FIN handling. The full number is stored once on the customer record and
// never leaves the server: API responses, documents and the copilot only see the mask.

const NRIC_RE = /^[STFGM]\d{7}[A-Z]$/;

export function normalizeId(raw: string): string {
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isNricFormat(raw: string): boolean {
    return NRIC_RE.test(normalizeId(raw));
}

/** "S8812345D" -> "S****345D"; anything else keeps only its last 4 characters. */
export function maskId(raw: string): string {
    const id = normalizeId(raw);
    if (NRIC_RE.test(id)) return `${id[0]}****${id.slice(5)}`;
    return id.length <= 4 ? '****' : `${'*'.repeat(id.length - 4)}${id.slice(-4)}`;
}

export function normalizeName(raw: string): string {
    return raw.toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Position (1-based) of the first differing character, for a mismatch message that leaks nothing. */
export function firstDifference(a: string, b: string): number {
    const x = normalizeId(a);
    const y = normalizeId(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return i + 1;
    return 0;
}
