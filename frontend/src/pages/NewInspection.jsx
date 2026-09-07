import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function NewInspection() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ productName: '', location: '', notes: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.productName.trim()) {
      setError('Enter the product name being inspected.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/inspections', form);
      navigate(`/inspections/${data.inspection.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the inspection.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-serif text-2xl">New inspection</h1>
        <p className="text-sm text-ink/60">
          Start with the product and where it was found. You'll upload package photos on the next screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <p className="rounded-md bg-noncompliant-bg px-3 py-2 text-sm text-noncompliant">{error}</p>}
        <div>
          <label className="label" htmlFor="productName">Product name</label>
          <input
            id="productName"
            required
            className="input"
            placeholder="e.g. ABC Foods Instant Noodles 500g"
            value={form.productName}
            onChange={update('productName')}
          />
        </div>
        <div>
          <label className="label" htmlFor="location">Location / store</label>
          <input
            id="location"
            className="input"
            placeholder="e.g. Super Mart, MG Road, Raipur"
            value={form.location}
            onChange={update('location')}
          />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            className="input"
            rows={3}
            placeholder="Any context worth recording before the scan"
            value={form.notes}
            onChange={update('notes')}
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating…' : 'Create inspection and continue'}
        </button>
      </form>
    </div>
  );
}
