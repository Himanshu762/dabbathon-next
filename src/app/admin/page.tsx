'use client';

import { useMemo, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore, ops, getQueuedAutoPings, metricsForRound } from '../../store';

export default function AdminPage() {
    const pathname = usePathname();
    const tab = pathname === '/admin/rooms' ? 'rooms' : pathname === '/admin/teams' ? 'teams' : 'overview';

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-heading text-xl font-bold text-d-black">Admin Panel</h2>
                <nav className="flex gap-1">
                    {[
                        { key: 'overview', href: '/admin', label: 'Overview' },
                        { key: 'rooms', href: '/admin/rooms', label: 'Rooms' },
                        { key: 'teams', href: '/admin/teams', label: 'Teams' },
                    ].map((t) => (
                        <Link key={t.key} href={t.href}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.key ? 'bg-d-red text-white' : 'text-d-gray-600 hover:bg-d-gray-100'}`}>
                            {t.label}
                        </Link>
                    ))}
                </nav>
            </div>
            {tab === 'overview' && <AdminOverview />}
            {tab === 'rooms' && <AdminRooms />}
            {tab === 'teams' && <AdminTeams />}
        </div>
    );
}

/* ──────────────── Editable Metric Row ──────────────── */
function MetricRow({ id, name, max, onUpdate, onRemove }: {
    id: string; name: string; max: number;
    onUpdate: (id: string, patch: { name?: string; max?: number }) => void;
    onRemove: (id: string) => void;
}) {
    const [localName, setLocalName] = useState(name);
    const [localMax, setLocalMax] = useState(max);

    return (
        <div className="flex items-center gap-2 py-1.5 border-b border-d-gray-100 last:border-0">
            <span className="text-xs text-d-gray-400 w-10">{id}</span>
            <input
                className="input flex-1 text-sm"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={() => onUpdate(id, { name: localName })}
                placeholder="Metric name"
            />
            <input
                type="number"
                className="input w-16 text-center text-sm"
                min={1}
                value={localMax}
                onChange={e => setLocalMax(Number(e.target.value))}
                onBlur={() => onUpdate(id, { max: localMax })}
            />
            <button className="text-d-red hover:underline text-xs" onClick={() => onRemove(id)}>×</button>
        </div>
    );
}

function AdminOverview() {
    const activeRound = useStore(s => s.activeRound ?? 1);
    const publicView = useStore(s => s.publicViewEnabled);
    const autoPing = useStore(s => s.autoPingEnabled ?? true);
    const autoPingLead = useStore(s => s.autoPingLeadMinutes ?? 5);
    const metrics = useStore(s => s.metrics);
    const teams = useStore(s => s.teams);
    const queued = useMemo(() => getQueuedAutoPings(), []);
    const [newName, setNewName] = useState('');
    const [newMax, setNewMax] = useState(10);

    const handleUpdateMetric = useCallback((id: string, patch: { name?: string; max?: number }) => {
        ops.updateMetric(id, patch);
    }, []);

    const handleRemoveMetric = useCallback((id: string) => {
        ops.removeMetric(id);
    }, []);

    const handleAddMetric = () => {
        if (!newName.trim()) return;
        ops.addMetric(newName.trim(), newMax);
        setNewName('');
        setNewMax(10);
    };

    const handleDeleteAllMetrics = () => {
        if (!confirm('Delete ALL metrics? This cannot be undone.')) return;
        metrics.forEach(m => ops.removeMetric(m.id));
    };

    return (
        <div className="space-y-4">
            {/* Config row */}
            <div className="grid sm:grid-cols-3 gap-3">
                <div className="card p-4">
                    <div className="card-section-title mb-2">Round</div>
                    <div className="flex gap-1">
                        {([1, 2, 3] as const).map(r => (
                            <button key={r} onClick={() => ops.setActiveRound(r)}
                                className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${activeRound === r ? 'bg-d-red text-white' : 'bg-d-gray-50 text-d-gray-600 hover:bg-d-gray-100'}`}>
                                R{r}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="card p-4">
                    <div className="card-section-title mb-2">Public Scores</div>
                    <button onClick={() => ops.setPublicView(!publicView)}
                        className={`w-full py-1.5 rounded text-xs font-semibold transition ${publicView ? 'bg-d-red text-white' : 'bg-d-gray-50 text-d-gray-600'}`}>
                        {publicView ? 'ON' : 'OFF'}
                    </button>
                </div>
                <div className="card p-4">
                    <div className="card-section-title mb-2">Auto-Ping</div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => ops.setAutoPingEnabled(!autoPing)}
                            className={`py-1.5 px-3 rounded text-xs font-semibold transition ${autoPing ? 'bg-d-red text-white' : 'bg-d-gray-50 text-d-gray-600'}`}>
                            {autoPing ? 'ON' : 'OFF'}
                        </button>
                        <input type="number" className="input w-14 text-center text-xs" min={1} max={60}
                            value={autoPingLead} onChange={e => ops.setAutoPingLeadMinutes(Number(e.target.value))} />
                        <span className="text-[11px] text-d-gray-400">min lead</span>
                    </div>
                </div>
            </div>

            {/* Export */}
            <div className="card p-4">
                <div className="card-section-title mb-2">Export</div>
                <div className="flex gap-2">
                    {([1, 2, 3] as const).map(r => (
                        <button key={r} onClick={() => ops.exportScoresCsv(r)} className="btn-secondary text-xs">CSV Round {r}</button>
                    ))}
                </div>
            </div>

            {/* Metrics */}
            <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="card-section-title">Metrics ({metrics.length})</div>
                    {metrics.length > 0 && (
                        <button className="text-[11px] text-d-gray-400 hover:text-d-red" onClick={handleDeleteAllMetrics}>
                            Delete All
                        </button>
                    )}
                </div>
                <div className="space-y-1.5">
                    {metrics.map(m => (
                        <MetricRow
                            key={m.id}
                            id={m.id}
                            name={m.name || ''}
                            max={m.max}
                            onUpdate={handleUpdateMetric}
                            onRemove={handleRemoveMetric}
                        />
                    ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-d-gray-100">
                    <input
                        className="input flex-1"
                        placeholder="Metric name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                    <input
                        type="number"
                        className="input w-16 text-center"
                        min={1}
                        value={newMax}
                        onChange={e => setNewMax(Number(e.target.value))}
                    />
                    <button className="btn-primary text-xs" onClick={handleAddMetric}>Add</button>
                </div>
            </div>

            {/* Stats */}
            <div className="card p-4">
                <div className="card-section-title mb-2">Quick Stats</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div><span className="text-xl font-bold text-d-black">{Object.keys(teams).length}</span><div className="text-[11px] text-d-gray-400">Teams</div></div>
                    <div><span className="text-xl font-bold text-d-black">{metrics.length}</span><div className="text-[11px] text-d-gray-400">Metrics</div></div>
                    <div><span className="text-xl font-bold text-d-black">{queued.length}</span><div className="text-[11px] text-d-gray-400">Queued Pings</div></div>
                </div>
            </div>
        </div>
    );
}

function AdminRooms() {
    const rooms = useStore(s => s.rooms || {});
    const [newId, setNewId] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newPwd, setNewPwd] = useState('');

    return (
        <div className="card p-5 space-y-3">
            <div className="card-section-title">Rooms ({Object.keys(rooms).length})</div>
            <div className="space-y-2">
                {Object.values(rooms).map(r => (
                    <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-d-gray-100 last:border-0">
                        <span className="text-xs text-d-gray-400 w-12">{r.id}</span>
                        <input className="input flex-1 text-sm" defaultValue={r.title || ''}
                            onBlur={e => ops.updateRoom(r.id, { title: e.target.value })} />
                        <input className="input w-28 text-sm" placeholder="password" defaultValue={r.password || ''}
                            onBlur={e => ops.updateRoom(r.id, { password: e.target.value })} />
                        <button className="text-d-red hover:underline text-xs" onClick={() => ops.removeRoom(r.id)}>×</button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-d-gray-100">
                <input className="input w-20" placeholder="ID" value={newId} onChange={e => setNewId(e.target.value)} />
                <input className="input flex-1" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <input className="input w-28" placeholder="Password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                <button className="btn-primary text-xs" onClick={() => { if (newId) { ops.addRoom(newId, newTitle, newPwd); setNewId(''); setNewTitle(''); setNewPwd(''); } }}>Add</button>
            </div>
        </div>
    );
}

/* ──────────────── Editable Team Row ──────────────── */
function TeamRow({ team, onRemove }: {
    team: { id: string; name: string; slotTime?: string; room?: string; finalist?: boolean };
    onRemove: (id: string) => void;
}) {
    const [localName, setLocalName] = useState(team.name || '');
    const [localSlot, setLocalSlot] = useState(team.slotTime || '');
    const [localRoom, setLocalRoom] = useState(team.room || '');

    return (
        <div className="flex items-center gap-2 py-1.5 border-b border-d-gray-100 last:border-0">
            <span className="text-xs text-d-gray-400 w-10">{team.id}</span>
            <input
                className="input flex-1 text-sm"
                value={localName}
                placeholder="Team name"
                onChange={e => setLocalName(e.target.value)}
                onBlur={() => ops.renameTeam(team.id, localName)}
            />
            <input
                className="input w-24 text-sm"
                placeholder="Slot"
                value={localSlot}
                onChange={e => setLocalSlot(e.target.value)}
                onBlur={() => ops.setTeamSlot(team.id, localSlot)}
            />
            <input
                className="input w-20 text-sm"
                placeholder="Room"
                value={localRoom}
                onChange={e => setLocalRoom(e.target.value)}
                onBlur={() => ops.setTeamRoom(team.id, localRoom)}
            />
            <label className="flex items-center gap-1 text-[11px] text-d-gray-500">
                <input type="checkbox" checked={team.finalist || false}
                    onChange={e => ops.setTeamFinalist(team.id, e.target.checked)} className="accent-d-red" /> Fin
            </label>
            <button className="text-d-red hover:underline text-xs" onClick={() => onRemove(team.id)}>×</button>
        </div>
    );
}

function AdminTeams() {
    const teams = useStore(s => s.teams);
    const [newName, setNewName] = useState('');
    const [newSlot, setNewSlot] = useState('');
    const [newRoom, setNewRoom] = useState('');
    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
    const list = Object.values(teams).sort(numSort);

    const handleAddTeam = () => {
        if (!newName.trim()) return;
        ops.addTeam(newName.trim(), { slotTime: newSlot, room: newRoom });
        setNewName('');
        setNewSlot('');
        setNewRoom('');
    };

    const handleRemoveTeam = useCallback((id: string) => {
        ops.removeTeam(id);
    }, []);

    const handleDeleteAllTeams = () => {
        if (!confirm('Delete ALL teams? This cannot be undone.')) return;
        Object.keys(teams).forEach(id => ops.removeTeam(id));
    };

    return (
        <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="card-section-title">Teams ({list.length})</div>
                {list.length > 0 && (
                    <button className="text-[11px] text-d-gray-400 hover:text-d-red" onClick={handleDeleteAllTeams}>
                        Delete All
                    </button>
                )}
            </div>
            {list.length === 0 && <p className="text-xs text-d-gray-400">No teams yet. Add one below.</p>}
            <div className="space-y-1.5 max-h-[50vh] overflow-auto">
                {list.map(t => (
                    <TeamRow key={t.id} team={t} onRemove={handleRemoveTeam} />
                ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-d-gray-100">
                <input className="input flex-1" placeholder="Team name" value={newName} onChange={e => setNewName(e.target.value)} />
                <input className="input w-24" placeholder="Slot" value={newSlot} onChange={e => setNewSlot(e.target.value)} />
                <input className="input w-20" placeholder="Room" value={newRoom} onChange={e => setNewRoom(e.target.value)} />
                <button className="btn-primary text-xs" onClick={handleAddTeam}>Add</button>
            </div>
        </div>
    );
}
