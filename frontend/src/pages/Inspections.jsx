import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS = ['DRAFT', 'PROCESSING', 'ANALYZED', 'UNDER_REVIEW', 'CLOSED'];

export default function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (status) params.status = status;
    const { data } = await api.get('/inspections', { params });
    setInspections(data.inspections);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250); // debounce search
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Inspection history</h1>
          <p className="text-sm text-ink/60">Search and review past and ongoing inspections.</p>
        </div>
        <Link to="/inspections/new" className="btn-primary">New Inspection</Link>
      </div>

      <div className="flex gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search product or location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-ink/50">
              <th className="px-5 py-3 font-normal">Product</th>
              <th className="px-5 py-3 font-normal">Officer</th>
              <th className="px-5 py-3 font-normal">Location</th>
              <th className="px-5 py-3 font-normal">Images</th>
              <th className="px-5 py-3 font-normal">Status</th>
              <th className="px-5 py-3 font-normal">Created</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => (
              <tr key={i.id} className="border-b border-line/60 last:border-0 hover:bg-paper/40">
                <td className="px-5 py-3">
                  <Link to={`/inspections/${i.id}`} className="font-medium text-brass hover:underline">
                    {i.product?.name || 'Unnamed product'}
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink/70">{i.officer?.fullName}</td>
                <td className="px-5 py-3 text-ink/70">{i.location || '—'}</td>
                <td className="px-5 py-3 text-ink/70">{i._count?.images ?? 0}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={i.complianceResults?.[0]?.overallStatus || i.status} />
                </td>
                <td className="px-5 py-3 text-ink/50">{new Date(i.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && inspections.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink/40">
                  No inspections match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
