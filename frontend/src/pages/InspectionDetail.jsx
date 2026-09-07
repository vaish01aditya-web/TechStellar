import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, fileUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ImageUploader from '../components/ImageUploader';

const DECLARATION_LABELS = {
  MANUFACTURER_NAME_ADDRESS: 'Manufacturer name & address',
  NET_QUANTITY: 'Net quantity',
  MRP: 'Maximum Retail Price',
  MFG_DATE: 'Month & year of manufacture',
  EXPIRY_DATE: 'Expiry / best-before date',
  BATCH_NUMBER: 'Batch / lot number',
  FSSAI_NUMBER: 'FSSAI / licence number',
  CONSUMER_CARE: 'Consumer care details',
  OTHER: 'Other',
};

function ConfidenceTag({ value }) {
  if (value == null) return <span className="text-xs text-ink/40">—</span>;
  const pct = Math.round(value * 100);
  const tone = pct >= 70 ? 'text-compliant' : pct >= 40 ? 'text-review' : 'text-noncompliant';
  return <span className={`text-xs font-medium ${tone}`}>{pct}% confidence</span>;
}

export default function InspectionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [inspection, setInspection] = useState(null);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(''); // '' | 'analyzing' | 'evaluating' | 'reporting'
  const [error, setError] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});

  const refresh = useCallback(async () => {
    const [{ data: insp }, { data: rep }] = await Promise.all([
      api.get(`/inspections/${id}`),
      api.get(`/inspections/${id}/reports`),
    ]);
    setInspection(insp.inspection);
    setReports(rep.reports);
  }, [id]);

  useEffect(() => {
    refresh().catch(() => setError('Could not load this inspection.'));
  }, [refresh]);

  async function handleAnalyze() {
    setBusy('analyzing');
    setError('');
    try {
      await api.post(`/inspections/${id}/analyze`);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.');
    } finally {
      setBusy('');
    }
  }

  async function handleEvaluate() {
    setBusy('evaluating');
    setError('');
    try {
      await api.post(`/inspections/${id}/evaluate-compliance`);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Compliance evaluation failed.');
    } finally {
      setBusy('');
    }
  }

  async function handleGenerateReport() {
    setBusy('reporting');
    setError('');
    try {
      await api.post(`/inspections/${id}/reports`);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate the report.');
    } finally {
      setBusy('');
    }
  }

  async function handleDownload(reportId) {
    const res = await api.get(`/reports/${reportId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `inspection-report-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleReview(violationId, decision) {
    try {
      await api.patch(`/violations/${violationId}/review`, {
        decision,
        reviewNotes: reviewNotes[violationId] || '',
      });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the review.');
    }
  }

  if (error && !inspection) return <p className="text-sm text-noncompliant">{error}</p>;
  if (!inspection) return <p className="text-sm text-ink/50">Loading inspection…</p>;

  const result = inspection.complianceResults?.[0];
  const canReview = user.role === 'REVIEWER' || user.role === 'ADMIN';

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl">{inspection.product?.name || 'Unnamed product'}</h1>
          <p className="text-sm text-ink/60">
            {inspection.location || 'No location recorded'} · Officer: {inspection.officer?.fullName}
          </p>
        </div>
        <StatusBadge status={result?.overallStatus || inspection.status} />
      </div>

      {error && <p className="rounded-md bg-noncompliant-bg px-3 py-2 text-sm text-noncompliant">{error}</p>}

      {/* Step 1 — Images */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">1. Package images</h2>
          <button onClick={handleAnalyze} disabled={inspection.images.length === 0 || busy === 'analyzing'} className="btn-primary">
            {busy === 'analyzing' ? 'Scanning…' : 'Run OCR analysis'}
          </button>
        </div>
        <ImageUploader inspectionId={id} onUploaded={refresh} />
        {inspection.images.length > 0 && (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {inspection.images.map((img) => (
              <a key={img.id} href={fileUrl(img.filePath)} target="_blank" rel="noreferrer">
                <img
                  src={fileUrl(img.filePath)}
                  alt={img.originalName || 'Package'}
                  className="h-24 w-full rounded-md border border-line object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Step 2 — Extracted declarations */}
      {inspection.declarations.length > 0 && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">2. Extracted declarations</h2>
            <button onClick={handleEvaluate} disabled={busy === 'evaluating'} className="btn-primary">
              {busy === 'evaluating' ? 'Evaluating…' : 'Evaluate compliance'}
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink/50">
                <th className="pb-2 font-normal">Declaration</th>
                <th className="pb-2 font-normal">Detected value</th>
                <th className="pb-2 font-normal">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {inspection.declarations.map((d) => (
                <tr key={d.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 text-ink/80">{DECLARATION_LABELS[d.declarationType] || d.declarationType}</td>
                  <td className="py-2">{d.rawValue || <span className="italic text-ink/40">Not detected</span>}</td>
                  <td className="py-2"><ConfidenceTag value={d.confidence} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Violations summary — SIH26(1) style */}
          {result && result.violations.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="font-serif text-base font-semibold mb-3">Violations</h3>
              <div className="space-y-2">
                {result.violations.map((v) => {
                  const severity = v.rule?.validationType === 'FORMAT' ? 'MAJOR' : 'CRITICAL';
                  const severityColor =
                    severity === 'CRITICAL'
                      ? 'text-noncompliant font-bold'
                      : 'text-review font-bold';
                  const message =
                    v.actualObservation === 'Not detected in any scanned image.'
                      ? `Mandatory declaration missing or not detected: ${v.rule?.name || v.expectedRequirement}`
                      : `${v.reason}: ${v.rule?.name || v.expectedRequirement}`;
                  return (
                    <div key={v.id} className="py-2 border-b border-line/40 last:border-0 text-sm">
                      <span className={severityColor}>{severity}</span>
                      <span className="text-ink/70"> — {message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result && result.violations.length === 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="font-serif text-base font-semibold mb-2">Violations</h3>
              <p className="text-sm text-compliant">No violations detected.</p>
            </div>
          )}
        </section>
      )}

      {/* Step 3 — Compliance result & violations */}
      {result && (
        <section className="card space-y-4">
          <h2 className="font-serif text-lg">3. Compliance result</h2>
          <div className="flex items-center gap-3">
            <StatusBadge status={result.overallStatus} />
            <p className="text-sm text-ink/60">{result.summary}</p>
          </div>

          {result.violations.length === 0 ? (
            <p className="text-sm text-compliant">No issues flagged against the active rule set.</p>
          ) : (
            <div className="space-y-3">
              {result.violations.map((v) => (
                <div key={v.id} className="rounded-md border border-line p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{v.rule?.name}</p>
                      <p className="text-xs text-ink/40">{v.rule?.ruleCode}</p>
                    </div>
                    <span className="rounded-full bg-review-bg px-2.5 py-1 text-xs font-medium text-review">
                      {v.humanVerificationStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-ink/50">Expected</dt><dd>{v.expectedRequirement}</dd>
                    <dt className="text-ink/50">Observed</dt><dd>{v.actualObservation || '—'}</dd>
                    <dt className="text-ink/50">Reason</dt><dd>{v.reason}</dd>
                    <dt className="text-ink/50">Confidence</dt><dd><ConfidenceTag value={v.confidence} /></dd>
                  </dl>

                  {v.humanVerificationStatus === 'PENDING' && canReview && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      <textarea
                        className="input text-sm"
                        rows={2}
                        placeholder="Review notes (optional)"
                        value={reviewNotes[v.id] || ''}
                        onChange={(e) => setReviewNotes((n) => ({ ...n, [v.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(v.id, 'REJECT')} className="btn-secondary text-sm">
                          Mark as valid (no violation)
                        </button>
                        <button
                          onClick={() => handleReview(v.id, 'CONFIRM')}
                          className="rounded-md bg-noncompliant px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                        >
                          Confirm violation
                        </button>
                      </div>
                    </div>
                  )}
                  {v.humanVerificationStatus !== 'PENDING' && (
                    <p className="mt-2 text-xs text-ink/50">
                      Reviewed by {v.reviewedBy?.fullName || 'an officer'}
                      {v.reviewNotes ? ` — "${v.reviewNotes}"` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Step 4 — Reports */}
      {result && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg">4. Report</h2>
            <button onClick={handleGenerateReport} disabled={busy === 'reporting'} className="btn-primary">
              {busy === 'reporting' ? 'Generating…' : 'Generate PDF report'}
            </button>
          </div>
          {reports.length === 0 ? (
            <p className="text-sm text-ink/40">No report generated yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                  <span>Version {r.version} — {new Date(r.generatedAt).toLocaleString()}</span>
                  <button onClick={() => handleDownload(r.id)} className="text-brass hover:underline">
                    Download PDF
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
