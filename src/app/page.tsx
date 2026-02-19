'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginTeamByPassword } from '../store';
import { setAdminAuthed } from '../auth';

type Role = 'participant' | 'faculty' | 'tv' | 'admin';

export default function LoginPage() {
  const [role, setRole] = useState<Role>('participant');
  const [secret, setSecret] = useState('');
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const facultyKey = process.env.NEXT_PUBLIC_FACULTY_PASSKEY ?? 'bbapesu591313';
    const backendKey = process.env.NEXT_PUBLIC_BACKEND_PASSKEY ?? 'bbapesu560060';
    const adminKey = process.env.NEXT_PUBLIC_ADMIN_PASSKEY ?? 'bbapesuadmin';

    if (role === 'participant') {
      const teamId = loginTeamByPassword(secret);
      if (teamId) return router.push(`/team/${teamId}`);
      return alert('Invalid team password');
    }
    if (role === 'faculty') {
      if (secret === facultyKey) return router.push('/invigilator');
      return alert('Invalid faculty passkey');
    }
    if (role === 'tv') {
      if (secret === backendKey) return router.push('/dashboard/tv');
      return alert('Invalid passkey');
    }
    if (role === 'admin') {
      if (secret === adminKey) { setAdminAuthed(true); return router.push('/admin'); }
      return alert('Invalid admin passkey');
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <div className="card p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <svg className="w-14 h-14 mx-auto text-d-red mb-4" viewBox="0 0 64 64" fill="currentColor">
              <rect x="14" y="16" width="36" height="8" rx="2" opacity="0.95" />
              <rect x="16" y="24" width="32" height="10" rx="1.5" opacity="0.75" />
              <rect x="16" y="34" width="32" height="10" rx="1.5" opacity="0.55" />
              <rect x="16" y="44" width="32" height="10" rx="1.5" opacity="0.35" />
              <path d="M28 10 C28 6 36 6 36 10 L36 16 L28 16 Z" opacity="0.6" />
              <rect x="30" y="6" width="4" height="4" rx="2" opacity="0.8" />
            </svg>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-d-black">
              Dabbathon <span className="text-d-red">v2.0</span>
            </h1>
            <p className="text-[11px] font-medium tracking-widest uppercase text-d-gray-400 mt-1">BBA PESU</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-d-gray-600">Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="participant">Participant</option>
                <option value="faculty">Faculty / Invigilator</option>
                <option value="tv">TV Dashboard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-d-gray-600">
                {role === 'participant' ? 'Team Password' : 'Passkey'}
              </label>
              <input
                className="input"
                type="password"
                placeholder="Enter password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full" type="submit">Sign In</button>
          </div>
        </div>
      </form>
    </div>
  );
}
