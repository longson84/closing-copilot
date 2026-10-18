import { useState, type FormEvent } from 'react';
import type { Purpose, Residency } from '../../../src/shared/types';
import { createBooking } from '../api';
import { AiProgress, Dropzone, ErrorNote, Icon } from '../components/ui';
import { formatSGD, todayISO } from '../format';
import { navigate } from '../router';

const STEPS = ['Uploading ID securely…', 'Reading ID with Document AI…', 'Extracting buyer details with Gemini…', 'Creating the deal and deadlines…'];

export function NewBooking() {
  const [file, setFile] = useState<File | null>(null);
  const [project, setProject] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [otpDate, setOtpDate] = useState(todayISO());
  const [residency, setResidency] = useState<Residency>('SC');
  const [purpose, setPurpose] = useState<Purpose>('OWN_STAY');
  const [propertiesOwned, setPropertiesOwned] = useState('0');
  const [household, setHousehold] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const priceNum = Number(price.replace(/[^\d]/g, ''));
  const missing = {
    file: !file,
    project: !project.trim(),
    unit: !unit.trim(),
    price: !priceNum,
    otpDate: !otpDate,
  };
  const valid = !Object.values(missing).some(Boolean);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid || !file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('project', project.trim());
    fd.append('unit', unit.trim());
    fd.append('price', String(priceNum));
    fd.append('otpDate', otpDate);
    fd.append('residency', residency);
    fd.append('purpose', purpose);
    fd.append('propertiesOwned', propertiesOwned);
    if (household.trim()) fd.append('household', household.trim());
    if (phone.trim()) fd.append('phone', phone.trim());
    if (email.trim()) fd.append('email', email.trim());
    setSubmitting(true);
    setError(null);
    try {
      const res = await createBooking(fd);
      navigate(`/deals/${res.deal.id}?review=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const inv = (k: keyof typeof missing) => (tried && missing[k] ? ' invalid' : '');

  if (submitting)
    return (
      <div className="page">
        <div className="card extracting">
          <h1 className="serif">Registering the booking</h1>
          <p className="page-sub">
            {file?.name} · {project}, {unit}
          </p>
          <AiProgress steps={STEPS} />
          <p className="muted small">The full ID number is stored securely and shown masked everywhere in the app.</p>
        </div>
      </div>
    );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>New booking</h1>
          <p className="page-sub">Upload the buyer's ID. Copilot reads it, fills the CDD record and sets every deadline from the OTP date.</p>
        </div>
      </header>

      {error && <ErrorNote message={`Couldn't create the booking: ${error}`} />}

      <form className="booking" onSubmit={submit} noValidate>
        <section className="card">
          <div className="card-head">
            <h2>Buyer's identity document</h2>
          </div>
          <div className="pad">
            <Dropzone file={file} onFile={setFile} hint="NRIC (front and back), FIN card or passport. Image or PDF." />
            {tried && missing.file && <p className="field-error">Add the buyer's ID to continue.</p>}
            <ul className="assurances">
              <li>
                <Icon name="check" size={14} /> Name, ID number, date of birth and address are extracted for you
              </li>
              <li>
                <Icon name="check" size={14} /> ID numbers are masked in the app and in Copilot answers
              </li>
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Purchase</h2>
          </div>
          <div className="form-grid pad">
            <label className={`field span-2${inv('project')}`}>
              <span>Project</span>
              <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Lentor Hills Residences" />
            </label>
            <label className={`field${inv('unit')}`}>
              <span>Unit</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="#12-05" />
            </label>
            <label className={`field${inv('price')}`}>
              <span>Purchase price (S$)</span>
              <input
                inputMode="numeric"
                value={price}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^\d]/g, ''));
                  setPrice(n ? n.toLocaleString('en-SG') : '');
                }}
                placeholder="1,688,000"
              />
              {priceNum > 0 && <small>5% booking fee: {formatSGD(Math.round(priceNum * 0.05))}</small>}
            </label>
            <label className={`field${inv('otpDate')}`}>
              <span>OTP date</span>
              <input type="date" value={otpDate} onChange={(e) => setOtpDate(e.target.value)} />
            </label>
          </div>

          <div className="card-head sub">
            <h2>Buyer profile</h2>
            <span className="card-hint">Used for stamp duty and follow-ups</span>
          </div>
          <div className="form-grid pad">
            <div className="field span-2">
              <span>Residency</span>
              <Segmented
                value={residency}
                onChange={setResidency}
                options={[
                  ['SC', 'Singapore Citizen'],
                  ['SPR', 'Permanent Resident'],
                  ['FOREIGNER', 'Foreigner'],
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
                ]}
              />
            </div>
            <label className="field">
              <span>Properties already owned</span>
              <input type="number" inputMode="numeric" pattern="[0-9]*" min={0} max={20} value={propertiesOwned} onChange={(e) => setPropertiesOwned(e.target.value)} />
            </label>
            <label className="field span-2">
              <span>Household (optional)</span>
              <input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="e.g. Married, 2 young children" />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 9123 4567" />
            </label>
            <label className="field">
              <span>Email (optional)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@example.com" />
            </label>
          </div>
          <div className="form-actions">
            <a className="btn btn-ghost" href="#/">
              Cancel
            </a>
            <button className="btn btn-primary" type="submit">
              <Icon name="spark" size={15} /> Create booking
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          type="button"
          key={v}
          role="radio"
          aria-checked={value === v}
          className={value === v ? 'on' : ''}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
