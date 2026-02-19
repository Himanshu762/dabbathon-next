'use client';

import { useMemo, useState } from 'react';
import { useStore, ops, metricsForRound } from '../../store';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function ParticipantPage() {
    const teams = useStore((s) => s.teams);
    const scoresR1 = useStore((s) => s.scores);
    const scoresR2 = useStore((s) => s.scoresRound2 || []);
    const metricsAll = useStore((s) => s.metrics);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const headerMetrics = useMemo(() => metricsForRound(activeRound as 1 | 2, metricsAll), [metricsAll, activeRound]);
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
                    <h2 className="dabbawala-stamp text-2xl border-2 border-d-red text-d-red px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(211,47,47,0.2)] bg-white rotate-[-1deg]">
                        PARTICIPANT PORTAL
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-d-gray-400 mt-2 ml-1">
                        View your assigned slot & marks
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="dabbawala-code text-xs bg-d-red text-white">ROUND {activeRound}</span>
                    <span className="dabbawala-code text-xs border border-d-gray-200 bg-white text-d-gray-500">{headerMetrics.length} METRICS</span>
                </div>
            </div>

            <input className="input max-w-sm" placeholder="Search team..." value={query} onChange={(e) => setQuery(e.target.value)} />

            {items.length === 0 ? (
                <div className="card p-12 text-center border-dashed border-2 border-d-gray-200 bg-transparent shadow-none">
                    <p className="text-sm font-bold uppercase tracking-widest text-d-gray-400">No teams found matching query</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {items.map((t) => {
                        const metrics = metricsForRound(activeRound as 1 | 2, metricsAll);
                        const roundScores = activeRound === 2 ? scoresR2 : scoresR1;
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
                            <div key={t.id} className="card p-0 overflow-hidden border border-d-gray-300 shadow-sm transition-all hover:shadow-md group relative">
                                {/* Dabbawala Watermark */}
                                <div className="absolute top-2 right-2 opacity-[0.03] text-6xl font-black pointer-events-none select-none">
                                    DB
                                </div>
                                <div className="p-5 space-y-4 relative z-10">
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="dabbawala-code text-lg bg-d-black text-white">{t.id}</span>
                                                <span className="font-heading font-bold text-lg text-d-black uppercase tracking-tight">{t.name}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-d-gray-500">
                                                <span className="px-1.5 py-0.5 border border-d-gray-200 rounded-sm bg-d-gray-50">
                                                    {t.room || 'NO ROOM'}
                                                </span>
                                                <span>•</span>
                                                <span className="px-1.5 py-0.5 border border-d-gray-200 rounded-sm bg-d-gray-50 text-d-red">
                                                    {t.slotTime || 'NO SLOT'}
                                                </span>
                                            </div>
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
                            </div>
                        );
                    })}
                </div>
            )
            }
        </div>
    );
}
