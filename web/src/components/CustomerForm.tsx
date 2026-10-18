import { useState, type FormEvent } from 'react';
import type { Customer, CustomerInput, CustomerStatus, Purpose, Residency, SocialProfile } from '../../../src/shared/types';
import { Segmented } from '../pages/NewBooking';
import { BEDROOMS, ChipToggles, SEGMENT_OPTS, TagInput } from './crm';
import { ErrorNote, Icon, Spinner } from './ui';

const num = (s: string): number | null => {
  const n = Number(s.replace(/[^\d]/g, ''));
  return s.trim() && Number.isFinite(n) ? n : null;
};
export function detectPlatform(url: string): SocialProfile['platform'] {
  const u = url.toLowerCase();
  if (u.includes('linkedin.')) return 'LINKEDIN';
  if (u.includes('instagram.') || u.includes('instagr.am')) return 'INSTAGRAM';
  if (u.includes('facebook.') || u.includes('fb.com') || u.includes('fb.me')) return 'FACEBOOK';
  return 'OTHER';
}
const PLATFORM_LABEL = { LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', OTHER: 'Link' } as const;

const money = (n: number | null) => (n === null ? '' : n.toLocaleString('en-SG'));

export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Customer;
  submitLabel: string;
  onSubmit: (input: CustomerInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [status, setStatus] = useState<CustomerStatus>(initial?.status ?? 'LEAD');
  const [residency, setResidency] = useState<Residency | ''>(initial?.residency ?? '');
  const [purpose, setPurpose] = useState<Purpose | ''>(initial?.profile.purpose ?? '');
  const [owned, setOwned] = useState(initial?.profile.propertiesOwned?.toString() ?? '');
  const [household, setHousehold] = useState(initial?.profile.household ?? '');
  const [bMin, setBMin] = useState(money(initial?.budgetMinSgd ?? null));
  const [bMax, setBMax] = useState(money(initial?.budgetMaxSgd ?? null));
  const [segments, setSegments] = useState<Array<'CCR' | 'RCR' | 'OCR'>>(initial?.preferences.segments ?? []);
  const [areas, setAreas] = useState<string[]>(initial?.preferences.areas ?? []);
  const [bedrooms, setBedrooms] = useState<string[]>(initial?.preferences.bedrooms ?? []);
  const [ec, setEc] = useState<'yes' | 'no' | 'open'>(
    initial?.preferences.executiveCondo === true ? 'yes' : initial?.preferences.executiveCondo === false ? 'no' : 'open',
  );
  const [timeline, setTimeline] = useState(initial?.preferences.timeline ?? '');
  const [prefNotes, setPrefNotes] = useState(initial?.preferences.notes ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [company, setCompany] = useState(initial?.company ?? '');
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? '');
  const [dob, setDob] = useState(initial?.dateOfBirth ?? '');
  const [socials, setSocials] = useState<string[]>(initial?.socialProfiles.map((x) => x.url) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const fmtMoney = (v: string, set: (s: string) => void) => {
    const n = num(v);
    set(n === null ? '' : n.toLocaleString('en-SG'));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!fullName.trim()) return;
    const t = (s: string) => s.trim() || null;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: t(phone),
        email: t(email),
        source: t(source),
        status,
        residency: residency || null,
        purpose: purpose || null,
        propertiesOwned: owned.trim() === '' ? null : Number(owned),
        household: t(household),
        budgetMinSgd: num(bMin),
        budgetMaxSgd: num(bMax),
        preferences: {
          segments,
          areas,
          bedrooms,
          executiveCondo: ec === 'yes' ? true : ec === 'no' ? false : null,
          timeline: t(timeline),
          notes: t(prefNotes),
        },
        tags,
        company: t(company),
        jobTitle: t(jobTitle),
        dateOfBirth: dob || null,
        socialProfiles: socials
          .map((u) => u.trim())
          .filter(Boolean)
          .map((u) => ({ platform: detectPlatform(u), url: /^https?:\/\//i.test(u) ? u : `https://${u}` })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form className="cust-form" onSubmit={submit} noValidate>
      <section className="card">
        <div className="card-head">
          <h2>Contact</h2>
        </div>
        <div className="form-grid pad">
          <label className={`field span-2${tried && !fullName.trim() ? ' invalid' : ''}`}>
            <span>Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As the customer introduces themselves" autoFocus={!initial} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 9123 4567" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </label>
          <label className="field">
            <span>Company</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. DBS Bank" />
          </label>
          <label className="field">
            <span>Job title</span>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Vice President, Treasury" />
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
          </label>
          <div className="field span-2">
            <span>Social profiles</span>
            <div className="social-rows">
              {socials.map((u, i) => (
                <div key={i} className="social-row">
                  <span className="social-plat">{PLATFORM_LABEL[detectPlatform(u)]}</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={u}
                    onChange={(e) => setSocials(socials.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder="https://www.linkedin.com/in/…"
                  />
                  <button type="button" className="icon-btn" onClick={() => setSocials(socials.filter((_, j) => j !== i))} aria-label="Remove link">
                    <Icon name="close" size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className="link-btn" onClick={() => setSocials([...socials, ''])}>
                <Icon name="plus" size={12} /> Add profile link
              </button>
              <small>Links only; Copilot doesn't read these pages. Paste a screenshot of their profile in Import screenshots to extract details (with consent).</small>
            </div>
          </div>
          <label className="field">
            <span>Source</span>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Showflat walk-in, referral, WhatsApp…" list="cust-sources" />
            <datalist id="cust-sources">
              <option value="Showflat walk-in" />
              <option value="WhatsApp" />
              <option value="Referral" />
              <option value="Roadshow" />
              <option value="Facebook ad" />
              <option value="PropertyGuru enquiry" />
            </datalist>
          </label>
          <div className="field">
            <span>Status</span>
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                ['LEAD', 'Lead'],
                ['PROSPECT', 'Prospect'],
                ['BOOKED', 'Booked'],
                ['LOST', 'Lost'],
              ]}
            />
          </div>
        </div>

        <div className="card-head sub">
          <h2>Profile</h2>
          <span className="card-hint">Leave blank if you don't know yet</span>
        </div>
        <div className="form-grid pad">
          <div className="field span-2">
            <span>Residency</span>
            <Segmented
              value={residency}
              onChange={setResidency}
              options={[
                ['SC', 'Citizen'],
                ['SPR', 'PR'],
                ['FOREIGNER', 'Foreigner'],
                ['', 'Unknown'],
              ]}
            />
          </div>
          <div className="field">
            <span>Purpose</span>
            <Segmented
              value={purpose}
              onChange={setPurpose}
              options={[
                ['OWN_STAY', 'Own stay'],
                ['INVESTMENT', 'Investment'],
                ['', 'Unknown'],
              ]}
            />
          </div>
          <label className="field">
            <span>Properties already owned</span>
            <input type="number" inputMode="numeric" pattern="[0-9]*" min={0} value={owned} onChange={(e) => setOwned(e.target.value)} placeholder="e.g. 0" />
          </label>
          <label className="field span-2">
            <span>Household</span>
            <input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="e.g. Married, 2 young children" />
          </label>
        </div>

        <div className="card-head sub">
          <h2>What they're looking for</h2>
        </div>
        <div className="form-grid pad">
          <label className="field">
            <span>Budget from (S$)</span>
            <input inputMode="numeric" value={bMin} onChange={(e) => fmtMoney(e.target.value, setBMin)} placeholder="1,500,000" />
          </label>
          <label className="field">
            <span>Budget up to (S$)</span>
            <input inputMode="numeric" value={bMax} onChange={(e) => fmtMoney(e.target.value, setBMax)} placeholder="1,900,000" />
          </label>
          <div className="field">
            <span>Market segments</span>
            <ChipToggles label="Market segments" options={SEGMENT_OPTS} value={segments} onChange={setSegments} />
          </div>
          <div className="field">
            <span>Executive condo</span>
            <Segmented
              value={ec}
              onChange={setEc}
              options={[
                ['yes', 'Yes'],
                ['no', 'No'],
                ['open', 'Open'],
              ]}
            />
          </div>
          <div className="field span-2">
            <span>Bedrooms</span>
            <ChipToggles label="Bedrooms" options={BEDROOMS} value={bedrooms} onChange={setBedrooms} />
          </div>
          <div className="field span-2">
            <span>Areas</span>
            <TagInput value={areas} onChange={setAreas} placeholder="Type an area and press Enter, e.g. Tampines" />
          </div>
          <label className="field span-2">
            <span>Timeline</span>
            <input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. Buy within 3 months" />
          </label>
          <label className="field span-2">
            <span>Notes on preferences</span>
            <textarea rows={3} value={prefNotes} onChange={(e) => setPrefNotes(e.target.value)} placeholder="Anything else that matters: facing, floor, schools, MRT…" />
          </label>
          <div className="field span-2">
            <span>Tags</span>
            <TagInput value={tags} onChange={setTags} placeholder="e.g. Hot lead, First-time buyer" />
          </div>
        </div>
        {error && (
          <div className="pad">
            <ErrorNote message={error} />
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={15} />} {submitLabel}
          </button>
        </div>
      </section>
    </form>
  );
}
