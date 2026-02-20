'use client';

import { useMemo, useEffect, useState } from 'react';
import { useStore, metricsForRound } from '../../../store';
import { useRouter } from 'next/navigation';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const REFRESH_MS = 10_000;

export default function TVDashboard() {
    const router = useRouter();
    const teams = useStore(s => s.teams);
    const scoresR1 = useStore(s => s.scores);
    const scoresR2 = useStore(s => s.scoresRound2 || []);
    const metricsAll = useStore(s => s.metrics);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const metrics = useMemo(() => metricsForRound(activeRound as 1 | 2, metricsAll), [metricsAll, activeRound]);
    const scores = activeRound === 2 ? scoresR2 : scoresR1;
    const [tick, setTick] = useState(0);
    const [cd, setCd] = useState(REFRESH_MS / 1000);

    useEffect(() => {
        const iv = setInterval(() => {
            setCd(p => { if (p <= 1) { setTick(t => t + 1); return REFRESH_MS / 1000; } return p - 1; });
        }, 1000);
        return () => clearInterval(iv);
    }, []);

    const maxPossible = metrics.reduce((s, m) => s + m.max, 0) || 1;
    const globalMax = Math.max(...metrics.map(m => m.max), 1);

    const board = useMemo(() => {
        return Object.values(teams).map(t => {
            const radarData = metrics.map(m => {
                let score = 0;
                for (let i = scores.length - 1; i >= 0; i--) {
                    if (scores[i].teamId === t.id && scores[i].metricId === m.id) { score = scores[i].score; break; }
                }
                return { metric: m.name, score, max: m.max };
            });
            const total = radarData.reduce((sum, d) => sum + d.score, 0);
            return { name: t.name || t.id, total, id: t.id, radarData };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [teams, metrics, scores, tick]);

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#060606]">

            {/* Header */}
            <div className="flex items-center justify-between px-10 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-4">
                    <svg className="w-7 h-7 text-[#FF4444]" viewBox="0 0 64 64" fill="currentColor">
                        <rect x="14" y="16" width="36" height="8" rx="2" opacity="0.95" />
                        <rect x="16" y="24" width="32" height="10" rx="1.5" opacity="0.75" />
                        <rect x="16" y="34" width="32" height="10" rx="1.5" opacity="0.55" />
                        <rect x="16" y="44" width="32" height="10" rx="1.5" opacity="0.35" />
                        <path d="M28 10 C28 6 36 6 36 10 L36 16 L28 16 Z" opacity="0.6" />
                        <rect x="30" y="6" width="4" height="4" rx="2" opacity="0.8" />
                    </svg>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-white/90">
                            Dabbathon <span className="text-[#FF4444]">v2.0</span>
                        </h1>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/20">
                            Round {activeRound} · {board.length} Teams
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${cd <= 3 ? 'bg-[#FF4444]' : 'bg-emerald-500'} animate-pulse`} />
                        <span className="text-[10px] font-mono text-white/20">{cd}s</span>
                    </div>
                    <button onClick={() => router.push('/')} className="text-white/10 hover:text-white/30 text-sm transition">✕</button>
                </div>
            </div>

            {/* Team Grid */}
            <div className="flex-1 overflow-auto px-8 py-5 min-h-0">
                {board.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-white/10 text-lg">Waiting for teams...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {board.map((team) => (
                            <div
                                key={team.id}
                                className="rounded-xl flex items-stretch overflow-hidden transition-all duration-500 aspect-[4/3]"
                                style={{
                                    background: 'rgba(255,255,255,0.025)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}
                            >
                                {/* Radar Chart — fills card height */}
                                <div className="w-[60%] flex-shrink-0 p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={team.radarData} outerRadius="85%" cx="50%" cy="50%">
                                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                            <PolarAngleAxis dataKey="metric" tick={false} />
                                            <PolarRadiusAxis domain={[0, globalMax]} tick={false} axisLine={false} />
                                            <Radar dataKey="score" stroke="#FF4444" fill="#FF4444" fillOpacity={0.25} strokeWidth={2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Name + Score — vertically centered */}
                                <div className="flex-1 flex flex-col justify-center pr-5">
                                    <div className="text-3xl font-bold text-white/80 truncate">
                                        {team.name}
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-1.5">
                                        <span className="text-6xl font-bold tabular-nums text-white/90 leading-none">
                                            {team.total}
                                        </span>
                                        <span className="text-sm text-white/20">/{maxPossible}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-10 py-2 flex items-center justify-center gap-2 text-[9px] text-white/8 uppercase tracking-widest" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="w-1 h-1 rounded-full bg-[#FF4444] animate-pulse" />
                <span>BBA PESU · Live</span>
            </div>
        </div>
    );
}
