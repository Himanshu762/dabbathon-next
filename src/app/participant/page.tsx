'use client';

import { useMemo, useState } from 'react';
import { useStore, ops, metricsForRound } from '../../store';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function ParticipantPage() {
    const teams = useStore((s) => s.teams);
    const scoresR1 = useStore((s) => s.scores);
    const scoresR2 = useStore((s) => s.scoresRound2 || []);
    const scoresR3 = useStore((s) => s.scoresRound3 || []);
    const metricsAll = useStore((s) => s.metrics);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const headerMetrics = useMemo(() => metricsForRound(activeRound as 1 | 2 | 3, metricsAll), [metricsAll, activeRound]);
    const publicView = useStore((s) => s.publicViewEnabled);
    const [query, setQuery] = useState('');
    const notifications = useStore((s) => s.notifications || []);

    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
    const items = useMemo(() => Object.values(teams)
        .filter((t) => t.id.toLowerCase().includes(query.toLowerCase()) || (t.name || '').toLowerCase().includes(query.toLowerCase()))
        .sort(numSort), [teams, query]);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-heading text-xl font-bold text-d-black">Participant Portal</h2>
                    <p className="text-xs text-d-gray-400">View your slot, room, and marks.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="badge badge-red">Round {activeRound}</span>
                    <span className="badge badge-outline">{headerMetrics.length} metrics</span>
                </div>
            </div>

            <input className="input max-w-sm" placeholder="Search team..." value={query} onChange={(e) => setQuery(e.target.value)} />

            {items.length === 0 ? (
                <div className="card p-12 text-center">
                    <p className="text-sm text-d-gray-400">No teams found.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {items.map((t) => {
                        const effRound = activeRound === 3 ? (t.finalist ? 3 : 2) : activeRound;
                        const metrics = metricsForRound(effRound as 1 | 2 | 3, metricsAll);
                        const roundScores = effRound === 3 ? scoresR3 : effRound === 2 ? scoresR2 : scoresR1;
                        const teamScores = roundScores.filter((s) => s.teamId === t.id);
                        const byMetric = metrics.map((m) => {
                            const last = [...teamScores].reverse().find((x) => x.metricId === m.id);
                            return { metric: m.name, score: last ? last.score : 0, max: m.max };
                        });
                        const total = byMetric.reduce((sum, bm) => sum + bm.score, 0);
                        const maxTotal = metrics.reduce((a, m) => a + m.max, 0);
                        const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                        const teamNotifs = notifications.filter(n => n.teamId === t.id);

                        return (
                            <div key={t.id} className="card p-5 space-y-4">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-d-black">{t.name} <span className="text-[11px] text-d-gray-400">({t.id})</span></div>
                                        <div className="text-[11px] text-d-gray-400">{t.room || 'No room'} · {t.slotTime || 'No slot'}</div>
                                    </div>
                                    {publicView && (
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-d-red">{total}</div>
                                            <div className="text-[10px] text-d-gray-400">/ {maxTotal}</div>
                                        </div>
                                    )}
                                </div>

                                {publicView && (
                                    <>
                                        {/* Radar */}
                                        <div className="h-52 border border-d-gray-100 rounded-lg bg-white p-1">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                                                <RadarChart data={byMetric} outerRadius="65%" margin={{ top: 12, right: 40, bottom: 12, left: 40 }}>
                                                    <PolarGrid stroke="rgba(0,0,0,0.06)" />
                                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#424242', fontSize: 10 }} />
                                                    <PolarRadiusAxis domain={[0, Math.max(...metrics.map(m => m.max))]} tick={{ fill: '#9E9E9E', fontSize: 9 }} />
                                                    <Radar name="Score" dataKey="score" stroke="#D32F2F" fill="#D32F2F" fillOpacity={0.15} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Score + Pct */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-d-gray-100 p-3 bg-white">
                                                <div className="text-[11px] font-medium text-d-red uppercase tracking-wider">Score</div>
                                                <div className="text-lg font-bold text-d-black mt-0.5">{total} <span className="text-xs text-d-gray-400">/ {maxTotal}</span></div>
                                            </div>
                                            <div className="rounded-lg border border-d-gray-100 p-3 bg-white">
                                                <div className="text-[11px] font-medium text-d-red uppercase tracking-wider">Percentile</div>
                                                <div className="text-lg font-bold text-d-black mt-0.5">{pct}%</div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {!publicView && <div className="text-xs text-d-gray-400">Scores hidden by host.</div>}

                                {/* Notifications */}
                                {teamNotifs.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-medium text-d-gray-500 uppercase tracking-wider">Notifications</div>
                                        {teamNotifs.slice(-3).reverse().map((n) => (
                                            <div key={n.id} className="notification-badge flex items-center justify-between gap-2">
                                                <span className="truncate text-xs">{new Date(n.timestamp).toLocaleTimeString()} — {n.message}</span>
                                                <button className="text-[10px] text-d-red hover:underline flex-shrink-0" onClick={() => ops.deleteNotification(n.id)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
