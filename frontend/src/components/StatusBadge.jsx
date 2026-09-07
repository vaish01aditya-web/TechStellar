const STYLES = {
  COMPLIANT: 'bg-compliant-bg text-compliant',
  NON_COMPLIANT: 'bg-noncompliant-bg text-noncompliant',
  NEEDS_HUMAN_REVIEW: 'bg-review-bg text-review',
  ANALYSIS_FAILED: 'bg-failed-bg text-failed',
  DRAFT: 'bg-failed-bg text-failed',
  PROCESSING: 'bg-review-bg text-review',
  ANALYZED: 'bg-review-bg text-review',
  UNDER_REVIEW: 'bg-review-bg text-review',
  CLOSED: 'bg-compliant-bg text-compliant',
};

const LABELS = {
  NON_COMPLIANT: 'Non-compliant',
  NEEDS_HUMAN_REVIEW: 'Needs human review',
  ANALYSIS_FAILED: 'Analysis failed',
  UNDER_REVIEW: 'Under review',
};

export default function StatusBadge({ status }) {
  if (!status) return <span className="text-sm text-ink/40">—</span>;
  const style = STYLES[status] || 'bg-failed-bg text-failed';
  const label = LABELS[status] || status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
