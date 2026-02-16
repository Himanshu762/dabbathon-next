'use client';

import { useMemo, useState, useCallback } from 'react';
import { useStore, ops, getQueuedAutoPings } from '../../store';
import { TrashIcon } from '@heroicons/react/24/outline';

/* ── Editable Metric Row (name + score) ── */
function MetricRow({ id, name, max, round, onRemove }: {
    id: string; name: string; max: number; round?: 1 | 2 | 3;
    onRemove: (id: string) => void;
}) {
    const [localName, setLocalName] = useState(name);
    const [localMax, setLocalMax] = useState(max);

    return (
        <tr className="hover:bg-d-gray-50/50 transition">
            <td className="w-16 text-xs text-d-gray-400 font-mono">{id}</td>
            <td>
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    value={localName}
                    placeholder="Metric name"
                    onChange={e => setLocalName(e.target.value)}
                    onBlur={() => ops.updateMetric(id, { name: localName })}
                />
            </td>
            <td className="w-16 text-center text-xs font-semibold text-d-gray-500">
                R{round || 1}
            </td>
            <td className="w-24">
                <input
                    type="number"
                    className="input py-1 px-2 text-center text-sm w-full bg-transparent"
                    min={1}
                    value={localMax}
                    placeholder="Score"
                    onChange={e => setLocalMax(Number(e.target.value))}
                    onBlur={() => ops.updateMetric(id, { max: localMax })}
                />
            </td>
            <td className="w-10 text-center">
                <button
                    className="text-d-gray-400 hover:text-d-red hover:bg-d-red/5 p-1.5 rounded transition inline-flex"
                    onClick={() => { if (confirm('Delete this metric?')) onRemove(id); }}
                    title="Delete Metric"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

export default function AdminOverviewPage() {
    const activeRound = useStore(s => s.activeRound ?? 1);
    const publicView = useStore(s => s.publicViewEnabled);
    const autoPing = useStore(s => s.autoPingEnabled ?? true);
    const autoPingLead = useStore(s => s.autoPingLeadMinutes ?? 5);
    const metrics = useStore(s => s.metrics);
    const teams = useStore(s => s.teams);
    const queued = useMemo(() => getQueuedAutoPings(), []);
    const [newName, setNewName] = useState('');
    const [newMax, setNewMax] = useState(10);
    const [newRound, setNewRound] = useState<1 | 2 | 3>(1);

    const handleAddMetric = () => {
        if (!newName.trim()) return;
        ops.addMetric(newName.trim(), newMax, newRound);
        setNewName('');
        setNewMax(10);
        setNewRound(1);
    };

    const handleRemoveMetric = useCallback((id: string) => ops.removeMetric(id), []);

    const handleDeleteAllMetrics = () => {
        if (!confirm('Delete ALL metrics? This cannot be undone.')) return;
        metrics.forEach(m => ops.removeMetric(m.id));
    };

    return (
        <div className="space-y-6">
            {/* Config row */}
            <div className="grid sm:grid-cols-3 gap-4">
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
                        <input type="number" className="input py-1 px-2 w-14 text-center text-xs" min={1} max={60}
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
                        <button key={r} onClick={() => ops.exportScoresCsv(r)} className="btn-secondary text-xs py-1.5 px-3">CSV Round {r}</button>
                    ))}
                </div>
            </div>

            {/* Metrics Table */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-d-gray-200 flex items-center justify-between bg-white">
                    <div className="card-section-title">Metrics ({metrics.length})</div>
                    {metrics.length > 0 && (
                        <button className="text-[11px] text-d-gray-400 hover:text-d-red transition font-medium" onClick={handleDeleteAllMetrics}>
                            Delete All
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-16">ID</th>
                                <th>Metric Name</th>
                                <th className="w-16 text-center">Round</th>
                                <th className="w-24 text-center">Score</th>
                                <th className="w-10 text-center">Del</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-d-gray-400 text-xs italic">
                                        No metrics yet. Add one below.
                                    </td>
                                </tr>
                            )}
                            {metrics.map(m => (
                                <MetricRow key={m.id} id={m.id} name={m.name || ''} max={m.max} round={m.round} onRemove={handleRemoveMetric} />
                            ))}
                            {/* Add Row */}
                            <tr className="bg-d-gray-50/50">
                                <td className="text-xs text-d-gray-400 px-3 py-2 italic">New</td>
                                <td className="px-3 py-2">
                                    <input
                                        className="input py-1.5 px-3 text-sm w-full border-d-gray-300 focus:border-d-red focus:ring-1 focus:ring-d-red/20"
                                        placeholder="Metric name"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddMetric()}
                                    />
                                </td>
                                <td className="px-2 py-2">
                                    <select className="input py-1.5 px-2 text-xs w-full text-center"
                                        value={newRound} onChange={e => setNewRound(Number(e.target.value) as 1 | 2 | 3)}>
                                        <option value={1}>R1</option>
                                        <option value={2}>R2</option>
                                        <option value={3}>R3</option>
                                    </select>
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        className="input py-1.5 px-3 text-center text-sm w-full border-d-gray-300"
                                        placeholder="Score"
                                        min={1}
                                        value={newMax}
                                        onChange={e => setNewMax(Number(e.target.value))}
                                        onKeyDown={e => e.key === 'Enter' && handleAddMetric()}
                                    />
                                </td>
                                <td className="text-center px-3 py-2">
                                    <button className="btn-primary py-1.5 px-3 text-xs w-full" onClick={handleAddMetric}>Add</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
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
