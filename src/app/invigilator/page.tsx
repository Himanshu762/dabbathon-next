'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, ops, metricsForRound } from '../../store';
import { isAdminAuthed } from '../../auth';
import { showToast } from '../../components/Toast';

export default function InvigilatorPage() {
    const teams = useStore((s) => s.teams);
    const rooms = useStore((s) => s.rooms || {});
    const metricsAll = useStore((s) => s.metrics);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const scoresR1 = useStore((s) => s.scores);
    const scoresR2 = useStore((s) => s.scoresRound2 || []);
    const timerConfig = useStore((s) => s.timerConfig);
    const timerState = useStore((s) => s.timerState);

    const [loggedIn, setLoggedIn] = useState(false);
    const [invigilatorName, setInvigilatorName] = useState('');
    const [roomId, setRoomId] = useState('');
    const [roomPassword, setRoomPassword] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const isAdmin = isAdminAuthed();

    const scores = activeRound === 2 ? scoresR2 : scoresR1;
    const metrics = useMemo(() => metricsForRound(activeRound as 1 | 2, metricsAll), [metricsAll, activeRound]);

    const roomTeams = useMemo(() => {
        if (!roomId) return [];
        const roomObj = rooms[roomId];
        const roomTitle = roomObj?.title || roomId;
        return Object.values(teams)
            .filter(t => t.room === roomTitle || t.room === roomId)
            .sort((a, b) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10));
    }, [teams, roomId, rooms]);

    const selectedTeam = selectedTeamId ? teams[selectedTeamId] : null;

    const tryEnter = () => {
        const room = rooms[roomId];
        if (!room) return alert('Room not found');
        if (!isAdmin && room.password && room.password !== roomPassword) return alert('Incorrect room password');
        if (!invigilatorName.trim()) return alert('Enter your name');
        setLoggedIn(true);
    };

    // Admin auto-login: skip room password check
    useEffect(() => {
        if (isAdmin && !loggedIn && roomId && invigilatorName) {
            setLoggedIn(true);
        }
    }, [isAdmin, roomId, invigilatorName, loggedIn]);

    if (!loggedIn) {
        return (
            <div className="max-w-sm mx-auto card p-8 space-y-4">
                <h2 className="font-heading text-xl font-bold text-d-black">Invigilator Login</h2>
                <div>
                    <label className="block text-xs font-medium mb-1.5 text-d-gray-600">Your Name</label>
                    <input className="input" placeholder="e.g. Prof. Kumar" value={invigilatorName} onChange={(e) => setInvigilatorName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1.5 text-d-gray-600">Room</label>
                    <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                        <option value="">Select room...</option>
                        {Object.values(rooms).map(r => (
                            <option key={r.id} value={r.id}>{r.title || r.id}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1.5 text-d-gray-600">Room Password</label>
                    <input className="input" type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} />
                </div>
                <button className="btn-primary w-full" onClick={tryEnter}>Enter Room</button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Status bar */}
            <div className="card px-4 py-2 inline-flex items-center gap-3 flex-wrap text-xs">
                <span className="badge badge-red">Round {activeRound}</span>
                <span className="text-d-gray-500">Room: <strong className="text-d-black">{rooms[roomId]?.title || roomId}</strong></span>
                <span className="text-d-gray-500">Invigilator: <strong className="text-d-black">{invigilatorName}</strong></span>
                <span className="text-d-gray-500">Teams: <strong className="text-d-black">{roomTeams.length}</strong></span>
                <button
                    className="ml-auto text-d-gray-400 hover:text-d-red text-xs font-medium transition"
                    onClick={() => window.location.assign('/')}
                >
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Team list */}
                <div className="lg:col-span-1 card p-4 space-y-2">
                    <div className="card-section-title mb-2">Teams In Room</div>
                    <div className="space-y-1.5 max-h-[60vh] overflow-auto">
                        {roomTeams.map((t) => {
                            const isSelected = selectedTeamId === t.id;
                            const teamScored = metrics.some(m => scores.some(s => s.teamId === t.id && s.metricId === m.id));
                            return (
                                <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${isSelected ? 'bg-d-red text-white shadow-sm' :
                                        teamScored ? 'bg-green-50 text-d-black border border-green-200' :
                                            'bg-white border border-d-gray-200 text-d-black hover:border-d-gray-300'
                                        }`}>
                                    <div className="font-medium">{t.name}</div>
                                    <div className="text-[11px] opacity-70">{t.id} · {t.slotTime || 'No slot'}</div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {teamScored && !isSelected && <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">✓ Scored</span>}
                                        {t.submissions?.[activeRound] && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded flex items-center gap-0.5">🔗 Link</span>}
                                    </div>
                                </button>
                            );
                        })}
                        {!roomTeams.length && <p className="text-xs text-d-gray-400">No teams in this room.</p>}
                    </div>
                </div>

                {/* Scoring panel */}
                <div className="lg:col-span-2">
                    {selectedTeam ? (
                        <ScoringPanel
                            key={selectedTeamId! + activeRound}
                            team={selectedTeam}
                            metrics={metrics}
                            scores={scores.filter(s => s.teamId === selectedTeamId)}
                            round={activeRound as 1 | 2}
                            invigilatorName={invigilatorName}
                            roomId={roomId}
                            timerConfig={timerConfig}
                            timerState={timerState}
                            isAdmin={isAdmin}
                        />
                    ) : (
                        <div className="card p-12 text-center">
                            <p className="text-sm text-d-gray-400">Select a team to begin scoring</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ScoringPanel({
    team, metrics, scores, round, invigilatorName, roomId, timerConfig, timerState, isAdmin,
}: {
    team: { id: string; name: string; slotTime?: string; problemStatement?: string; submissions?: Record<string, string> };
    metrics: { id: string; name: string; max: number }[];
    scores: { teamId: string; metricId: string; score: number; notes?: string }[];
    round: 1 | 2;
    invigilatorName: string;
    roomId: string;
    timerConfig: { sessionDurationSec: number; teamDurationSec: number };
    timerState: { teams: Record<string, { startedAt?: number; pausedAt?: number; isRunning: boolean } | undefined> };
    isAdmin?: boolean;
}) {
    const alreadyScored = metrics.some(m => scores.some(s => s.metricId === m.id));
    const locked = alreadyScored && !isAdmin;
    const [drafts, setDrafts] = useState<Record<string, { score: number; notes: string }>>({});

    useEffect(() => {
        const d: Record<string, { score: number; notes: string }> = {};
        metrics.forEach(m => {
            const existing = [...scores].reverse().find(s => s.metricId === m.id);
            d[m.id] = { score: existing?.score ?? 0, notes: existing?.notes ?? '' };
        });
        setDrafts(d);
    }, [metrics, scores, team.id]);

    const setScore = (mid: string, value: number) => setDrafts(prev => ({ ...prev, [mid]: { ...prev[mid], score: value } }));
    const setNotes = (mid: string, value: string) => setDrafts(prev => ({ ...prev, [mid]: { ...prev[mid], notes: value } }));

    const submitAll = async () => {
        for (const m of metrics) {
            const d = drafts[m.id];
            if (d) await ops.submitScore(round, { teamId: team.id, metricId: m.id, score: d.score, notes: d.notes, invigilatorName, timestamp: Date.now() });
        }
        showToast(`Scores submitted for ${team.name}`, 'success');
    };

    const total = useMemo(() => metrics.reduce((sum, m) => sum + (drafts[m.id]?.score ?? 0), 0), [metrics, drafts]);
    const timerKey = `${roomId}:${team.id}`;
    const teamTimer = timerState.teams[timerKey];

    return (
        <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-heading text-lg font-bold text-d-black">{team.name}</div>
                    <div className="text-[11px] text-d-gray-400">{team.id} · Slot: {team.slotTime || 'N/A'}</div>
                    {team.submissions?.[round] && (
                        <div className="mt-2">
                            <a
                                href={team.submissions[round]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary text-xs inline-flex items-center gap-1 py-1 px-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                            >
                                <span>🔗 View Round {round} Submission</span>
                                <span className="text-[10px]">↗</span>
                            </a>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-d-gray-400 uppercase">Total</div>
                    <div className="text-2xl font-bold text-d-red">{total}</div>
                </div>
            </div>

            {team.problemStatement && (
                <div className="rounded-lg bg-d-gray-50 border border-d-gray-100 p-3 text-sm text-d-gray-700">
                    <strong className="text-d-red">Problem:</strong> {team.problemStatement}
                </div>
            )}

            {/* Timer */}
            <div className="rounded-lg border border-d-gray-100 p-3 flex items-center justify-between gap-3 bg-white">
                <TeamTimer timerState={teamTimer} maxSec={timerConfig.teamDurationSec} />
                <div className="flex gap-1.5">
                    <button className="btn-primary text-xs" onClick={() => ops.startTeamTimer(roomId, team.id)}>Start</button>
                    <button className="btn-secondary text-xs" onClick={() => ops.stopTeamTimer(roomId, team.id)}>Stop</button>
                    <button className="btn-ghost text-xs" onClick={() => ops.resetTeamTimer(roomId, team.id)}>Reset</button>
                </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
                {metrics.map(m => {
                    const d = drafts[m.id] ?? { score: 0, notes: '' };
                    return (
                        <div key={m.id} className={`rounded-lg border p-3 bg-white space-y-2 ${locked ? 'border-d-gray-100 opacity-60' : 'border-d-gray-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-d-black">{m.name}</div>
                                <div className="text-xs text-d-gray-400">max {m.max}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="range" min={0} max={m.max} step={0.5} value={d.score}
                                    onChange={e => setScore(m.id, Number(e.target.value))}
                                    disabled={locked}
                                    className="flex-1 accent-[#D32F2F]" />
                                <input type="number" className="input w-16 text-center" min={0} max={m.max} step={0.5}
                                    value={d.score} onChange={e => setScore(m.id, Number(e.target.value))} disabled={locked} />
                            </div>
                            <input className="input text-xs" placeholder="Notes (optional)" value={d.notes}
                                onChange={e => setNotes(m.id, e.target.value)} disabled={locked} />
                        </div>
                    );
                })}
            </div>

            {locked ? (
                <div className="text-center text-xs text-d-gray-400 bg-d-gray-50 border border-d-gray-200 rounded-lg py-3">
                    ✓ Scores submitted. Only an admin can modify scores.
                </div>
            ) : (
                <button className="btn-primary w-full text-sm" onClick={submitAll}>Submit All Scores</button>
            )}
        </div>
    );
}

function TeamTimer({ timerState, maxSec }: {
    timerState: { startedAt?: number; pausedAt?: number; isRunning: boolean } | undefined;
    maxSec: number;
}) {
    const [now, setNow] = useState(Date.now());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (timerState?.isRunning) {
            intervalRef.current = setInterval(() => setNow(Date.now()), 250);
            return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
        }
    }, [timerState?.isRunning]);

    const elapsed = useMemo(() => {
        if (!timerState?.startedAt) return 0;
        if (timerState.isRunning) return (now - timerState.startedAt) / 1000;
        if (timerState.pausedAt) return (timerState.pausedAt - timerState.startedAt) / 1000;
        return 0;
    }, [timerState, now]);

    const remaining = Math.max(0, maxSec - elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    const pct = Math.max(0, Math.min(100, (remaining / maxSec) * 100));
    const isLow = remaining < 60 && timerState?.isRunning;

    return (
        <div className="flex items-center gap-3">
            <div className={`font-mono text-xl font-bold ${isLow ? 'text-d-red animate-pulse' : 'text-d-black'}`}>
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
            <div className="w-24 progress-track">
                <div className={`progress-fill ${isLow ? '!bg-red-500' : ''}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
