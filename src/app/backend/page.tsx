'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStore, ops } from '../../store';
import type { Team } from '../../types';

export default function BackendPage() {
    return <BackendLayout />;
}

function BackendLayout() {
    const pathname = usePathname();
    const isSlots = pathname === '/backend';
    const isNotifications = pathname === '/backend/notifications';
    const isReports = pathname === '/backend/reports';

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-heading text-xl font-bold text-d-black">Backend Panel</h2>
                <nav className="flex gap-1">
                    {[
                        { href: '/backend', label: 'Slots', active: isSlots },
                        { href: '/backend/notifications', label: 'Notifications', active: isNotifications },
                        { href: '/backend/reports', label: 'Reports', active: isReports },
                    ].map(t => (
                        <Link key={t.href} href={t.href}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${t.active ? 'bg-d-red text-white' : 'text-d-gray-600 hover:bg-d-gray-100'}`}>
                            {t.label}
                        </Link>
                    ))}
                </nav>
            </div>
            {isSlots && <BackendSlots />}
            {isNotifications && <BackendNotifications />}
            {isReports && <BackendReports />}
        </div>
    );
}

function BackendSlots() {
    const teams = useStore(s => s.teams);
    const rooms = useStore(s => s.rooms || {});
    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);

    const grouped = useMemo(() => {
        const g: Record<string, Team[]> = {};
        Object.values(teams).sort(numSort).forEach(t => {
            const r = t.room || 'Unassigned';
            if (!g[r]) g[r] = [];
            g[r].push(t);
        });
        return g;
    }, [teams]);

    if (Object.keys(teams).length === 0) {
        return <div className="card p-8 text-center"><p className="text-sm text-d-gray-400">No teams yet.</p></div>;
    }

    return (
        <div className="space-y-3">
            {Object.entries(grouped).map(([room, ts]) => (
                <div key={room} className="card p-4">
                    <div className="card-section-title mb-2">{room}</div>
                    <div className="space-y-1.5">
                        {ts.map(t => <SlotEditor key={t.id} team={t} />)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SlotEditor({ team }: { team: Team }) {
    const [slot, setSlot] = useState(team.slotTime || '');
    const [room, setRoom] = useState(team.room || '');
    const [problem, setProblem] = useState(team.problemStatement || '');

    const onSave = () => {
        ops.setTeamSlot(team.id, slot);
        ops.setTeamRoom(team.id, room);
        if (problem !== team.problemStatement) ops.setTeamProblem(team.id, problem);
    };

    return (
        <div className="flex flex-wrap items-end gap-2 py-1.5 border-b border-d-gray-100 last:border-0">
            <div className="font-medium text-sm text-d-black min-w-[80px]">{team.name} <span className="text-[11px] text-d-gray-400">({team.id})</span></div>
            <input className="input flex-1 min-w-[100px]" placeholder="Slot time" value={slot} onChange={e => setSlot(e.target.value)} />
            <input className="input w-24" placeholder="Room" value={room} onChange={e => setRoom(e.target.value)} />
            <input className="input flex-1 min-w-[100px]" placeholder="Problem" value={problem} onChange={e => setProblem(e.target.value)} />
            <button className="btn-primary text-xs" onClick={onSave}>Save</button>
        </div>
    );
}

function BackendNotifications() {
    return (
        <div className="space-y-3">
            <SendNotificationMany />
            <NotificationLog />
        </div>
    );
}

function SendNotificationMany() {
    const teams = useStore(s => s.teams);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [msg, setMsg] = useState('');
    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
    const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const send = () => {
        if (!msg.trim()) return;
        selected.forEach(id => ops.notifyTeam(id, msg.trim()));
        setMsg(''); setSelected(new Set());
    };

    const teamsList = Object.values(teams).sort(numSort);

    return (
        <div className="card p-4 space-y-3">
            <div className="card-section-title">Send Notification</div>
            {teamsList.length === 0 ? (
                <p className="text-xs text-d-gray-400">No teams available.</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-1.5">
                        {teamsList.map(t => (
                            <button key={t.id} onClick={() => toggle(t.id)}
                                className={`text-[11px] px-2 py-0.5 rounded-full border transition ${selected.has(t.id) ? 'bg-d-red text-white border-d-red' : 'bg-white border-d-gray-200 text-d-gray-600 hover:border-d-gray-300'}`}>
                                {t.id}
                            </button>
                        ))}
                        <button className="text-[11px] px-2 py-0.5 rounded-full bg-d-gray-100 text-d-gray-600 border border-d-gray-200"
                            onClick={() => setSelected(new Set(Object.keys(teams)))}>All</button>
                    </div>
                    <textarea className="input min-h-[60px]" placeholder="Message..." value={msg} onChange={e => setMsg(e.target.value)} />
                    <button className="btn-primary text-xs" onClick={send} disabled={!selected.size || !msg.trim()}>Send to {selected.size} team(s)</button>
                </>
            )}
        </div>
    );
}

function NotificationLog() {
    const notifications = useStore(s => s.notifications || []);
    const sorted = useMemo(() => [...notifications].sort((a, b) => b.timestamp - a.timestamp), [notifications]);

    return (
        <div className="card p-4 space-y-3">
            <div className="card-section-title">Notification Log ({notifications.length})</div>
            <div className="space-y-1 max-h-64 overflow-auto">
                {sorted.map(n => (
                    <div key={n.id} className="notification-badge flex items-center justify-between gap-2">
                        <span className="truncate text-xs">{n.teamId} — {new Date(n.timestamp).toLocaleTimeString()} — {n.message}</span>
                        <button className="text-[10px] text-d-red hover:underline flex-shrink-0" onClick={() => ops.deleteNotification(n.id)}>×</button>
                    </div>
                ))}
                {!notifications.length && <div className="text-xs text-d-gray-400">No notifications sent yet.</div>}
            </div>
        </div>
    );
}

function BackendReports() {
    const teams = useStore(s => s.teams);
    const metrics = useStore(s => s.metrics);
    const scores = useStore(s => s.scores);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const reportMetric = metrics.find(m => m.id === 'm6' || m.name.toLowerCase() === 'report');
    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);

    if (!reportMetric) {
        return <div className="card p-5"><p className="text-sm text-d-gray-400">No &quot;Report&quot; metric found. Add one in Admin → Metrics.</p></div>;
    }

    const teamsList = Object.values(teams).sort(numSort);
    if (teamsList.length === 0) {
        return <div className="card p-8 text-center"><p className="text-sm text-d-gray-400">No teams yet.</p></div>;
    }

    return (
        <div className="card p-4 space-y-3">
            <div className="card-section-title">Report Grading — {reportMetric.name} (max {reportMetric.max})</div>
            <div className="space-y-1.5">
                {teamsList.map(t => {
                    const last = [...scores].reverse().find(s => s.teamId === t.id && s.metricId === reportMetric.id);
                    return <ReportRow key={t.id} teamId={t.id} teamName={t.name} metricId={reportMetric.id} max={reportMetric.max} currentScore={last?.score ?? 0} round={activeRound as 1 | 2 | 3} />;
                })}
            </div>
        </div>
    );
}

function ReportRow({ teamId, teamName, metricId, max, currentScore, round }: { teamId: string; teamName: string; metricId: string; max: number; currentScore: number; round: 1 | 2 | 3 }) {
    const [score, setScore] = useState(currentScore);

    return (
        <div className="flex items-center gap-3 py-1.5 border-b border-d-gray-100 last:border-0">
            <div className="font-medium text-sm text-d-black min-w-[100px]">{teamName} <span className="text-[11px] text-d-gray-400">({teamId})</span></div>
            <input type="number" className="input w-16 text-center" value={score} min={0} max={max} onChange={e => setScore(Number(e.target.value))} />
            <span className="text-xs text-d-gray-400">/ {max}</span>
            <button className="btn-primary text-xs" onClick={() => ops.submitScore(round, { teamId, metricId, score, invigilatorName: 'backend', timestamp: Date.now() })}>Save</button>
        </div>
    );
}
