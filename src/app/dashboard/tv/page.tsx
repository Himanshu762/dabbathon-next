'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { useStore, metricsForRound } from '../../../store';
import { useRouter } from 'next/navigation';

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

    const board = useMemo(() => {
        return Object.values(teams).map(t => {
            const total = metrics.reduce((sum, m) => {
                for (let i = scores.length - 1; i >= 0; i--) {
                    if (scores[i].teamId === t.id && scores[i].metricId === m.id) return sum + scores[i].score;
                }
                return sum;
            }, 0);
            return { name: t.name || t.id, total, id: t.id };
        }).sort((a, b) => b.total - a.total);
    }, [teams, metrics, scores, tick]);

    const top3 = board.slice(0, 3);
    const rest = board.slice(3);
    // Podium order: 2nd, 1st, 3rd
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

    const podiumStyles = [
        // 2nd place
        { height: '55%', bg: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)', border: '#94a3b8', glow: 'rgba(148,163,184,0.15)', accent: '#C0C0C0', label: '2ND', emoji: '🥈' },
        // 1st place
        { height: '75%', bg: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #451a03 100%)', border: '#f59e0b', glow: 'rgba(245,158,11,0.25)', accent: '#FFD700', label: '1ST', emoji: '🥇' },
        // 3rd place
        { height: '42%', bg: 'linear-gradient(180deg, #44403c 0%, #292524 100%)', border: '#a8a29e', glow: 'rgba(168,162,158,0.12)', accent: '#CD7F32', label: '3RD', emoji: '🥉' },
    ];

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ background: 'radial-gradient(ellipse at top, #1a0a0a 0%, #0a0a0a 50%, #000 100%)' }}>

            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between px-8 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,68,68,0.1)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-[#FF4444]" />
                    <div>
                        <h1 className="font-heading text-xl font-black tracking-tight text-white">
                            DABBATHON <span className="text-[#FF4444]">SCOREBOARD</span>
                        </h1>
                        <p className="text-white/25 text-[9px] font-semibold uppercase tracking-[0.25em]">
                            Round {activeRound} · {Object.keys(teams).length} Teams · Live
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cd <= 3 ? 'bg-[#FF4444]' : 'bg-emerald-400'} animate-pulse`} />
                        <span className="text-[10px] font-mono text-white/30">{cd}s</span>
                    </div>
                    <button onClick={() => router.push('/')} className="text-white/15 hover:text-white/40 text-[10px] transition">×</button>
                </div>
            </div>

            {/* ── Podium Section ── */}
            {top3.length >= 3 && (
                <div className="flex-shrink-0 px-8 pt-6 pb-2">
                    <div className="flex items-end justify-center gap-3 h-[38vh]">
                        {podiumOrder.map((team, i) => {
                            const style = podiumStyles[i];
                            const pct = Math.round((team.total / maxPossible) * 100);
                            return (
                                <div key={team.id} className="flex flex-col items-center" style={{ width: '28%', height: '100%', justifyContent: 'flex-end' }}>
                                    {/* Team name + score floating above podium */}
                                    <div className="text-center mb-2 animate-[fadeUp_0.6s_ease-out]">
                                        <div className="text-3xl mb-1">{style.emoji}</div>
                                        <div className="text-white font-bold text-base truncate max-w-[200px]">{team.name}</div>
                                        <div className="font-mono font-black text-2xl mt-0.5" style={{ color: style.accent }}>{team.total}</div>
                                        <div className="text-white/20 text-[10px] font-mono">/ {maxPossible} ({pct}%)</div>
                                    </div>
                                    {/* Podium block */}
                                    <div
                                        className="w-full rounded-t-xl flex items-end justify-center pb-3 relative overflow-hidden"
                                        style={{
                                            height: style.height,
                                            background: style.bg,
                                            border: `1px solid ${style.border}33`,
                                            borderBottom: 'none',
                                            boxShadow: `0 -20px 60px -10px ${style.glow}, inset 0 1px 0 ${style.border}22`,
                                        }}
                                    >
                                        {/* Shimmer effect for 1st place */}
                                        {i === 1 && (
                                            <div className="absolute inset-0 overflow-hidden">
                                                <div
                                                    className="absolute w-[200%] h-full opacity-[0.03]"
                                                    style={{
                                                        background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
                                                        animation: 'shimmer 3s ease-in-out infinite',
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <span className="font-heading font-black text-4xl tracking-wider relative z-10" style={{ color: `${style.accent}33` }}>
                                            {style.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Remaining Teams (scrollable ticker) ── */}
            <div className="flex-1 overflow-hidden px-8 pb-2 min-h-0">
                {rest.length > 0 && (
                    <div className="h-full overflow-auto scrollbar-hide">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 py-2">
                            {rest.map((team, idx) => {
                                const rank = idx + 4;
                                const pct = Math.round((team.total / maxPossible) * 100);
                                return (
                                    <div key={team.id} className="flex items-center gap-3 py-2 group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        {/* Rank */}
                                        <span className="w-6 text-right font-mono text-sm font-bold text-white/15">{rank}</span>
                                        {/* Name */}
                                        <span className="flex-1 text-sm font-semibold text-white/60 truncate">{team.name}</span>
                                        {/* Mini bar */}
                                        <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex-shrink-0">
                                            <div
                                                className="h-full rounded-full bg-[#FF4444]/60 transition-all duration-700"
                                                style={{ width: `${Math.max(pct, 3)}%` }}
                                            />
                                        </div>
                                        {/* Score */}
                                        <span className="w-12 text-right font-mono text-sm font-bold text-white/40">{team.total}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {board.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl mb-3 opacity-20">🏁</div>
                            <p className="text-white/15 text-sm font-medium">Waiting for scores...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 px-8 py-1.5 flex items-center justify-between text-[9px] text-white/10 uppercase tracking-wider" style={{ borderTop: '1px solid rgba(255,68,68,0.08)' }}>
                <span>BBA PESU · Dabbathon v2.0</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#FF4444] animate-pulse" />
                    <span>Live Scoring</span>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0%, 100% { transform: translateX(-100%); }
                    50% { transform: translateX(0%); }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
