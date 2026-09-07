import { useEffect, useState } from 'react';
import { api } from '../api/client';

const ROLES = ['OFFICER', 'REVIEWER', 'ADMIN'];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get('/users');
    setUsers(data.users);
  }

  useEffect(() => { load(); }, []);

  async function updateUser(id, patch) {
    setError('');
    try {
      await api.patch(`/users/${id}`, patch);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update this user.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl">Users</h1>
        <p className="text-sm text-ink/60">Manage roles and access. New signups default to Officer.</p>
      </div>

      {error && <p className="rounded-md bg-noncompliant-bg px-3 py-2 text-sm text-noncompliant">{error}</p>}

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper/60 text-ink/50">
              <th className="px-5 py-3 font-normal">Name</th>
              <th className="px-5 py-3 font-normal">Email</th>
              <th className="px-5 py-3 font-normal">Role</th>
              <th className="px-5 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3">{u.fullName}</td>
                <td className="px-5 py-3 text-ink/60">{u.email}</td>
                <td className="px-5 py-3">
                  <select
                    className="input py-1 text-sm"
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                    className={u.isActive ? 'text-noncompliant hover:underline' : 'text-compliant hover:underline'}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
