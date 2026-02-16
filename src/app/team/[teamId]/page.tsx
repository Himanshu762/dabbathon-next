'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isTeamAuthed, logoutTeam, useStore, ops, metricsForRound } from '../../../store';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

function Progress({ value, max }: { value: number; max: number }) {
    const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
    return (
        <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
    const { teamId } = use(params);
    const router = useRouter();
    const teams = useStore((s) => s.teams);
    const metricsAll = useStore((s) => s.metrics);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const team = useMemo(() => (teamId ? teams[teamId] : undefined), [teams, teamId]);
    const effectiveRound = useMemo(() => (activeRound === 3 && team && !team.finalist ? 2 : activeRound), [activeRound, team]);
    const metrics = useMemo(() => metricsForRound(effectiveRound as 1 | 2 | 3, metricsAll), [metricsAll, effectiveRound]);
    const scoresR1 = useStore((s) => s.scores);
    const scoresR2 = useStore((s) => s.scoresRound2 || []);
    const scoresR3 = useStore((s) => s.scoresRound3 || []);
    const scores = effectiveRound === 2 ? scoresR2 : effectiveRound === 3 ? scoresR3 : scoresR1;
    const notifications = useStore((s) => s.notifications || []);
    const publicView = useStore((s) => s.publicViewEnabled);
    const authed = teamId ? isTeamAuthed(teamId) : false;

    const teamScores = useMemo(() => scores.filter((x) => x.teamId === teamId), [scores, teamId]);
    const byMetric = useMemo(() => metrics.map((m) => {
        const last = [...teamScores].reverse().find((x) => x.metricId === m.id);
        return { m, score: last ? last.score : 0 };
    }), [metrics, teamScores]);
    const total = useMemo(() => byMetric.reduce((a, b) => a + b.score, 0), [byMetric]);
    const radarData = useMemo(() => byMetric.map(bm => ({
        metric: bm.m.name, score: bm.score, max: bm.m.max
    })), [byMetric]);

    if (!team || !teamId) {
        return <div className="card p-8 text-center"><p className="text-sm text-d-gray-400">Team not found.</p><Link className="text-xs text-d-red hover:underline mt-2 inline-block" href="/participant">Back</Link></div>;
    }

    if (!authed) {
        return (
            <div className="max-w-sm mx-auto card p-8 text-center space-y-3">
                <p className="text-sm text-d-gray-500">Sign in to view this team.</p>
                <Link href={`/team/${teamId}/login`} className="btn-primary inline-block">Team Login</Link>
            </div>
        );
    }

    const teamNotifs = notifications.filter(n => n.teamId === teamId);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="badge badge-red">Round {activeRound}</span>
                    <span className="badge badge-outline">{metrics.length} metrics</span>
                </div>
                <button className="btn-secondary text-xs" onClick={() => { if (teamId) logoutTeam(teamId); router.push('/'); }}>Logout</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Info */}
                <div className="card p-5 space-y-3">
                    <div className="card-section-title">Team Information</div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-d-gray-500">Name</span><span className="font-medium text-d-black">{team.name}</span></div>
                        <div className="flex justify-between"><span className="text-d-gray-500">ID</span><span className="font-medium text-d-black">{team.id}</span></div>
                        <div className="flex justify-between"><span className="text-d-gray-500">Room</span><span className="font-medium text-d-black">{team.room || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-d-gray-500">Slot</span><span className="font-medium text-d-black">{team.slotTime || 'TBD'}</span></div>
                    </div>
                </div>

                {/* Problem Statement */}
                <div className="card p-5 space-y-3">
                    <div className="card-section-title">Problem Statement</div>
                    <p className="text-sm text-d-gray-600 leading-relaxed">{team.problemStatement || 'Not assigned yet.'}</p>
                </div>

                {/* Score Summary */}
                <div className="card p-5 space-y-3">
                    <div className="card-section-title">Score Summary</div>
                    <div className="text-3xl font-bold text-d-red">{total}</div>
                    <div className="text-xs text-d-gray-400">out of {metrics.reduce((a, m) => a + m.max, 0)}</div>
                    <div className="progress-track mt-2">
                        <div className="progress-fill" style={{ width: `${Math.min(100, (total / Math.max(1, metrics.reduce((a, m) => a + m.max, 0))) * 100)}%` }} />
                    </div>
                </div>
            </div>

            {/* Radar Chart */}
            <div className="card p-5">
                <div className="card-section-title mb-3">Score Radar</div>
                <div className="h-72 bg-white rounded-lg border border-d-gray-100 p-2">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                        <RadarChart data={radarData} outerRadius="65%" margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                            <PolarGrid stroke="rgba(0,0,0,0.06)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: '#424242', fontSize: 11 }} />
                            <PolarRadiusAxis domain={[0, Math.max(...metrics.map(m => m.max))]} tick={{ fill: '#9E9E9E', fontSize: 10 }} />
                            <Radar name="Score" dataKey="score" stroke="#D32F2F" fill="#D32F2F" fillOpacity={0.15} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="card p-5">
                <div className="card-section-title mb-3">
                    Metrics Breakdown <span className="text-d-red ml-1">●</span> <span className="text-[11px] text-d-gray-400 normal-case tracking-normal font-normal">LIVE</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {byMetric.map(({ m, score }) => (
                        <div key={m.id} className="rounded-lg border border-d-gray-100 p-3 bg-white">
                            <div className="text-xs font-medium text-d-gray-600">{m.name}</div>
                            <div className="text-sm font-bold text-d-black mt-1">{publicView ? score : '—'} <span className="text-[10px] text-d-gray-400 font-normal">/ {m.max}</span></div>
                            <Progress value={publicView ? score : 0} max={m.max} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Notifications */}
            {teamNotifs.length > 0 && (
                <div className="card p-5">
                    <div className="card-section-title mb-3">Notifications</div>
                    <div className="space-y-1.5 max-h-40 overflow-auto">
                        {teamNotifs.slice(-10).reverse().map((n) => (
                            <div key={n.id} className="notification-badge flex items-center justify-between gap-2">
                                <span className="truncate text-xs">{new Date(n.timestamp).toLocaleTimeString()} — {n.message}</span>
                                <button className="text-[10px] text-d-red hover:underline flex-shrink-0" onClick={() => ops.deleteNotification(n.id)}>×</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
