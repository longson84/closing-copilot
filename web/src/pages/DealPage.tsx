import { useCallback, useEffect, useState } from 'react';
import type { DealDetail, DealDocument, Project, Stage } from '../../../src/shared/types';
import { completeStage, getDeal, listProjects, uploadDocument } from '../api';
import { DocumentCard } from '../components/DocumentCard';
import { Followups } from '../components/Followups';
import { StageRail } from '../components/StageRail';
import { AiProgress, ConfirmDialog, Dropzone, ErrorNote, Icon, RiskBadge, Spinner } from '../components/ui';
import { formatDate, formatMonth, formatSGD, purposeLabel, residencyLabel, todayISO } from '../format';

export function DealPage({ id, review }: { id: string; review: boolean }) {
  const [data, setData] = useState<DealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Stage | null>(null);
  const [completeDate, setCompleteDate] = useState(todayISO());
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<DealDocument | null>(null);
  const [showReview, setShowReview] = useState(review);
  const [followKey, setFollowKey] = useState(0);
  const [catalog, setCatalog] = useState<Project[]>([]);
  useEffect(() => {
    listProjects()
      .then(setCatalog)
      .catch(() => undefined); // header extras are optional
  }, []);

  const load = useCallback(() => {
    setError(null);
    getDeal(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    if (fresh) document.getElementById(`doc-${fresh.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [fresh]);

  async function onUpload(file: File) {
    setUploading(file);
    setUploadError(null);
    setFresh(null);
    try {
      const res = await uploadDocument(id, file);
      setData(res.deal);
      setFresh(res.document);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(null);
    }
  }

  async function onConfirmComplete() {
    if (!confirming) return;
    setCompleting(true);
    setCompleteError(null);
    try {
      setData(await completeStage(id, confirming.key, completeDate));
      setConfirming(null);
      setFollowKey((k) => k + 1);
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompleting(false);
    }
  }

  if (error)
    return (
      <div className="page">
        <BackLink />
        <ErrorNote message={`Couldn't load this deal: ${error}`} onRetry={load} />
      </div>
    );
  if (!data)
    return (
      <div className="page">
        <BackLink />
        <div className="loading-block">
          <Spinner /> Loading deal…
        </div>
      </div>
    );

  const { deal, customer, risk } = data;
  const docs = [...deal.documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const mismatches = deal.documents.flatMap((d) => d.checks.filter((c) => c.status === 'MISMATCH').map((c) => ({ d, c })));
  const proj = deal.projectId ? catalog.find((p) => p.id === deal.projectId) : undefined;
  const projFacts = proj
    ? [
        proj.developer,
        [proj.district, proj.segment].filter(Boolean).join(' '),
        proj.tenure,
        proj.expectedTop ? `Expected TOP ${formatMonth(proj.expectedTop)}` : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="page">
      <BackLink />

      <header className="deal-head">
        <div>
          <h1 className="serif">{customer.fullName}</h1>
          <p className="deal-meta">
            <span>
              {deal.project}, unit {deal.unit}
            </span>
            <span className="sep" />
            <span className="tabular">{formatSGD(deal.price)}</span>
            <span className="sep" />
            <span>OTP {formatDate(deal.otpDate)}</span>
            <span className="sep" />
            <span>Booking fee {formatSGD(deal.bookingFee)}</span>
          </p>
          {projFacts.length > 0 && (
            <p className="deal-proj">
              <Icon name="building" size={14} />
              {projFacts.map((f, k) => (
                <span key={k}>{f}</span>
              ))}
              {proj?.fictional && <span className="tag tag-demo">Demo project (fictional)</span>}
            </p>
          )}
        </div>
        <RiskBadge risk={risk} />
      </header>

      {showReview && (
        <div className="review-banner">
          <Icon name="spark" size={18} />
          <div>
            <strong>Booking created from the ID document.</strong>
            <p>Check the buyer details Gemini extracted against the physical ID before moving on. CDD is the next stage.</p>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowReview(false)}>
            Details look right
          </button>
        </div>
      )}

      {mismatches.length > 0 && (
        <section className="hero-alert" role="alert">
          <div className="hero-alert-icon">
            <Icon name="alert" size={22} />
          </div>
          <div className="hero-alert-body">
            <h2>
              {mismatches.length === 1 ? 'A document doesn’t match the deal record' : `${mismatches.length} document mismatches need fixing`}
            </h2>
            {mismatches.map(({ d, c }, i) => (
              <p key={i}>
                <a href={`#/deals/${deal.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`doc-${d.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  {d.fileName}
                </a>
                {': '}
                {c.message}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="card rail-card">
        <div className="card-head">
          <h2>Closing timeline</h2>
          <span className="card-hint">Deadlines counted from the OTP date</span>
        </div>
        <StageRail
          stages={deal.stages}
          current={deal.currentStage}
          onComplete={(s) => {
            setCompleteDate(todayISO());
            setCompleteError(null);
            setConfirming(s);
          }}
        />
      </section>

      <div className="deal-grid">
        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2>Documents</h2>
              <span className="card-hint">
                {deal.documents.length} on file
              </span>
            </div>
            <div className="upload-area">
              {uploading ? (
                <div className="uploading">
                  <div className="uploading-file">
                    <Icon name="file" size={16} /> {uploading.name}
                  </div>
                  <AiProgress />
                </div>
              ) : (
                <Dropzone onFile={onUpload} hint="OTP, S&P, payment receipt or ID. PDF or image." compact />
              )}
              {uploadError && <ErrorNote message={`Upload failed: ${uploadError}`} />}
            </div>
            {docs.length === 0 ? (
              <p className="muted pad">No documents yet. Upload the OTP to check it against the buyer's ID.</p>
            ) : (
              <div className="doc-list">
                {docs.map((d) => (
                  <DocumentCard key={d.id} doc={d} fresh={fresh?.id === d.id} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="col">
          <section className={`card${showReview ? ' highlight' : ''}`}>
            <div className="card-head">
              <h2>Buyer</h2>
              <a className="card-link" href={`#/customers/${customer.id}`}>
                Open customer file
              </a>
            </div>
            <dl className="kv">
              {customer.idNumberMasked && (
                <div>
                  <dt>{customer.idType ?? 'ID'}</dt>
                  <dd className="tabular">{customer.idNumberMasked}</dd>
                </div>
              )}
              <div>
                <dt>Residency</dt>
                <dd>{customer.residency ? residencyLabel[customer.residency] : '—'}</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{customer.profile.purpose ? purposeLabel[customer.profile.purpose] : '—'}</dd>
              </div>
              <div>
                <dt>Properties owned</dt>
                <dd>
                  {customer.profile.propertiesOwned === null
                    ? '—'
                    : customer.profile.propertiesOwned === 0
                      ? 'None (first property)'
                      : customer.profile.propertiesOwned}
                </dd>
              </div>
              <div className="wide">
                <dt>Household</dt>
                <dd>{customer.profile.household ?? '—'}</dd>
              </div>
              {customer.dateOfBirth && (
                <div>
                  <dt>Date of birth</dt>
                  <dd>{formatDate(customer.dateOfBirth)}</dd>
                </div>
              )}
              {customer.nationality && (
                <div>
                  <dt>Nationality</dt>
                  <dd>{customer.nationality}</dd>
                </div>
              )}
              {customer.address && (
                <div className="wide">
                  <dt>Address</dt>
                  <dd>{customer.address}</dd>
                </div>
              )}
              {customer.phone && (
                <div>
                  <dt>Phone</dt>
                  <dd>{customer.phone}</dd>
                </div>
              )}
              {customer.email && (
                <div>
                  <dt>Email</dt>
                  <dd>{customer.email}</dd>
                </div>
              )}
            </dl>
          </section>

          <Followups dealId={deal.id} refreshKey={followKey} />
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Mark “${confirming.label}” complete?`}
          busy={completing}
          confirmLabel="Mark complete"
          onCancel={() => setConfirming(null)}
          onConfirm={onConfirmComplete}
          body={
            <>
              <p>{confirming.description}</p>
              <label className="field">
                <span>Completed on</span>
                <input type="date" value={completeDate} max={todayISO()} onChange={(e) => setCompleteDate(e.target.value)} />
              </label>
              <p className="muted small">Deadlines for the next stages are recalculated from this date.</p>
              {completeError && <ErrorNote message={completeError} />}
            </>
          }
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <a className="back" href="#/">
      <Icon name="back" size={14} /> Pipeline
    </a>
  );
}
