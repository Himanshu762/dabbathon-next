'use client';

import { useMemo, useState } from 'react';
import { useStore, metricsForRound } from '../../store';

export default function DashboardPage() {
    const teams = useStore((s) => s.teams);
    const scoresR1 = useStore((s) => s.scores);
    const scoresR2 = useStore((s) => s.scoresRound2 || []);
    const metricsAll = useStore((s) => s.metrics);
    const activeRound = useStore(s => s.activeRound ?? 1);
    const scores = activeRound === 2 ? scoresR2 : scoresR1;
    const metrics = useMemo(() => metricsForRound(activeRound as 1 | 2, metricsAll), [metricsAll, activeRound]);
    const publicView = useStore((s) => s.publicViewEnabled);
    const [query, setQuery] = useState('');

    const list = useMemo(() => {
        let arr = Object.values(teams).filter((t) =>
            t.id.toLowerCase().includes(query.toLowerCase()) ||
            (t.name || '').toLowerCase().includes(query.toLowerCase())
        );
        const getTotal = (t: typeof arr[0]) => {
            return metrics.reduce((sum, m) => {
                const last = [...scores].reverse().find(x => x.teamId === t.id && x.metricId === m.id);
                return sum + (last ? last.score : 0);
            }, 0);
        };
        arr.sort((a, b) => getTotal(b) - getTotal(a));
        return arr;
    }, [teams, query, activeRound, metrics, scores]);

    const teamCount = Object.keys(teams).length;

    return (
        <div className="space-y-5">
            {/* Stats bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="badge badge-red">Round {activeRound}</span>
                <span className="badge badge-outline">{teamCount} Teams</span>
                <span className="badge badge-outline">{metrics.length} Metrics</span>
                <span className={`badge ${publicView ? 'badge-red' : 'badge-outline'}`}>
                    Public: {publicView ? 'ON' : 'OFF'}
                </span>
            </div>

            {/* Search */}
            <input
                className="input max-w-sm"
                placeholder="Search team by name or ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {/* Table */}
            {teamCount === 0 ? (
                <div className="card p-12 text-center">
                    <p className="text-sm text-d-gray-400">No teams registered yet.</p>
                    <p className="text-xs text-d-gray-300 mt-1">Add teams from the Admin panel.</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-12">#</th>
                                    <th>Team</th>
                                    {metrics.map((m) => (
                                        <th key={m.id} className="w-20 text-center">{m.name}</th>
                                    ))}
                                    <th className="w-20 text-center !text-d-red">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((t, idx) => {
                                    const byMetric = metrics.map((m) => {
                                        const last = [...scores].reverse().find((x) => x.teamId === t.id && x.metricId === m.id);
                                        return last ? last.score : 0;
                                    });
                                    const total = byMetric.reduce((a, b) => a + b, 0);
                                    return (
                                        <tr key={t.id}>
                                            <td className="text-d-gray-400 font-medium">{idx + 1}</td>
                                            <td>
                                                <div className="font-medium text-d-black">{t.name}</div>
                                                <div className="text-[11px] text-d-gray-400">{t.id}</div>
                                            </td>
                                            {byMetric.map((v, i) => (
                                                <td key={i} className="text-center text-d-gray-700">{v}</td>
                                            ))}
                                            <td className="text-center font-bold text-d-red">{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
