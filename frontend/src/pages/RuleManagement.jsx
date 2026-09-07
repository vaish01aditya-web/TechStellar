import { useEffect, useState } from 'react';
import { api } from '../api/client';

const STATUS_STYLE = {
  ACTIVE: 'bg-compliant-bg text-compliant',
  DRAFT: 'bg-review-bg text-review',
  INACTIVE: 'bg-failed-bg text-failed',
};

const DECLARATION_TYPES = ['MANUFACTURER_NAME_ADDRESS', 'NET_QUANTITY', 'MRP', 'MFG_DATE', 'CONSUMER_CARE', 'OTHER'];

export default function RuleManagement() {
  const [rules, setRules] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ruleCode: '',
    name: '',
    description: '',
    validationType: 'PRESENCE',
    applicableDeclarationTypes: [],
  });

  async function load() {
    const { data } = await api.get('/rules');
    setRules(data.rules);
  }

  useEffect(() => { load(); }, []);

  async function toggle(rule, action) {
    setError('');
    try {
      await api.post(`/rules/${rule.id}/${action}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the rule.');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rules', form);
      setForm({ ruleCode: '', name: '', description: '', validationType: 'PRESENCE', applicableDeclarationTypes: [] });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the rule.');
    }
  }

  function toggleType(type) {
    setForm((f) => ({
      ...f,
      applicableDeclarationTypes: f.applicableDeclarationTypes.includes(type)
        ? f.applicableDeclarationTypes.filter((t) => t !== type)
        : [...f.applicableDeclarationTypes, type],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">Compliance rules</h1>
          <p className="text-sm text-ink/60">
            Rules the automated engine evaluates against. Only one version per rule code can be active at a time.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-secondary">
          {showForm ? 'Cancel' : 'New rule'}
        </button>
      </div>

      {error && <p className="rounded-md bg-noncompliant-bg px-3 py-2 text-sm text-noncompliant">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rule code</label>
              <input className="input" placeholder="RULE-LM-008" required value={form.ruleCode}
                onChange={(e) => setForm((f) => ({ ...f, ruleCode: e.target.value }))} />
            </div>
            <div>
              <label className="label">Validation type</label>
              <select className="input" value={form.validationType}
                onChange={(e) => setForm((f) => ({ ...f, validationType: e.target.value }))}>
                <option value="PRESENCE">Presence</option>
                <option value="FORMAT">Format</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Applies to</label>
            <div className="flex flex-wrap gap-2">
              {DECLARATION_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    form.applicableDeclarationTypes.includes(t)
                      ? 'border-brass bg-brass text-white'
                      : 'border-line text-ink/60'
                  }`}
                >
                  {t.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary">Save as draft</button>
        </form>
      )}

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-ink/50">
              <th className="px-5 py-3 font-normal">Code</th>
              <th className="px-5 py-3 font-normal">Name</th>
              <th className="px-5 py-3 font-normal">Type</th>
              <th className="px-5 py-3 font-normal">Version</th>
              <th className="px-5 py-3 font-normal">Status</th>
              <th className="px-5 py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3 font-mono text-xs">{r.ruleCode}</td>
                <td className="px-5 py-3">
                  {r.name}
                  {r.requiresLegalVerification && (
                    <span className="ml-2 text-xs text-review">(pending legal verification)</span>
                  )}
                </td>
                <td className="px-5 py-3 text-ink/60">{r.validationType}</td>
                <td className="px-5 py-3 text-ink/60">v{r.version}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {r.status !== 'ACTIVE' && (
                    <button onClick={() => toggle(r, 'activate')} className="text-brass hover:underline">Activate</button>
                  )}
                  {r.status === 'ACTIVE' && (
                    <button onClick={() => toggle(r, 'deactivate')} className="text-noncompliant hover:underline">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
