'use client';

import { use, useState } from 'react';
import { loginTeam } from '../../../../store';
import { useRouter } from 'next/navigation';

export default function TeamLoginPage({ params }: { params: Promise<{ teamId: string }> }) {
    const { teamId } = use(params);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const doLogin = () => {
        if (!teamId) return;
        if (loginTeam(teamId, username.trim(), password)) {
            router.push(`/team/${teamId}`);
        } else {
            alert('Invalid credentials');
        }
    };

    return (
        <div className="max-w-sm mx-auto card p-8 space-y-5">
            <div>
                <h1 className="font-heading text-xl font-bold text-d-black">Team Login</h1>
                <p className="text-xs text-d-gray-400 mt-0.5">Team: <span className="font-medium text-d-black">{teamId}</span></p>
            </div>
            <div>
                <label className="block text-xs font-medium mb-1.5 text-d-gray-600">Username</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-medium mb-1.5 text-d-gray-600">Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={doLogin}>Sign In</button>
        </div>
    );
}
