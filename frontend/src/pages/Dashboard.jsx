import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

function StatCard({ label, value, tone }) {
  return (
    <div className="card">
      <p className="text-sm text-ink/60">{label}</p>
      <p className={`mt-2 font-serif text-3xl ${tone || 'text-ink'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then(({ data }) => setData(data))
      .catch(() => setError('Could not load dashboard data.'));
  }, []);

  if (error) return <p className="text-sm text-noncompliant">{error}</p>;
  if (!data) return <p className="text-sm text-ink/50">Loading dashboard…</p>;

  const chartData = data.topViolationCategories.map((c) => ({
    name: c.rule?.ruleCode || 'Unknown',
    count: c.count,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl">Dashboard</h1>
        <p className="text-sm text-ink/60">Enforcement activity across all officers.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total inspections" value={data.totalInspections} />
        <StatCard label="Compliant" value={data.compliant} tone="text-compliant" />
        <StatCard label="Non-compliant" value={data.nonCompliant} tone="text-noncompliant" />
        <StatCard label="Needs review" value={data.needsReview} tone="text-review" />
        <StatCard label="Analysis failed" value={data.analysisFailed} tone="text-failed" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h2 className="mb-4 font-serif text-lg">Recent inspections</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink/50">
                <th className="pb-2 font-normal">Product</th>
                <th className="pb-2 font-normal">Officer</th>
                <th className="pb-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInspections.map((i) => (
                <tr key={i.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2">
                    <Link to={`/inspections/${i.id}`} className="text-brass hover:underline">
                      {i.product?.name || 'Unnamed product'}
                    </Link>
                  </td>
                  <td className="py-2 text-ink/70">{i.officer?.fullName}</td>
                  <td className="py-2">
                    <StatusBadge status={i.complianceResults?.[0]?.overallStatus || i.status} />
                  </td>
                </tr>
              ))}
              {data.recentInspections.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink/40">
                    No inspections yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-serif text-lg">Most common violations</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-ink/40">No violations recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9DFE5" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#9C6B30" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
