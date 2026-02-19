'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useStore, ops, getQueuedAutoPings } from '../../store';
import { TrashIcon, ArrowDownTrayIcon, SignalIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

/* ── Editable Metric Row ── */
function MetricRow({ id, name, max, round, onRemove }: {
    id: string; name: string; max: number; round?: 1 | 2 | 3;
    onRemove: (id: string) => void;
}) {
    const [localName, setLocalName] = useState(name);
    const [localMax, setLocalMax] = useState(max);

    return (
        <TableRow>
            <TableCell className="font-mono text-xs text-d-gray-400">{id}</TableCell>
            <TableCell>
                <Input
                    className="h-8 border-transparent bg-transparent focus-visible:ring-1 focus-visible:ring-d-gray-200 hover:bg-d-gray-50 transition-colors"
                    value={localName}
                    placeholder="Metric name"
                    onChange={e => setLocalName(e.target.value)}
                    onBlur={() => ops.updateMetric(id, { name: localName })}
                />
            </TableCell>
            <TableCell className="text-center">
                <select
                    className="h-8 w-full rounded-md border-transparent bg-transparent text-xs focus:ring-1 focus:ring-d-gray-200 hover:bg-d-gray-50 cursor-pointer text-center"
                    value={round || 1}
                    onChange={(e) => ops.updateMetric(id, { round: Number(e.target.value) as 1 | 2 | 3 })}
                >
                    <option value={1}>R1</option>
                    <option value={2}>R2</option>
                    <option value={3}>R3</option>
                </select>
            </TableCell>
            <TableCell className="w-24">
                <Input
                    type="number"
                    className="h-8 text-center border-transparent bg-transparent focus-visible:ring-1 focus-visible:ring-d-gray-200 hover:bg-d-gray-50"
                    min={1}
                    value={localMax}
                    onChange={e => setLocalMax(Number(e.target.value))}
                    onBlur={() => ops.updateMetric(id, { max: localMax })}
                />
            </TableCell>
            <TableCell className="text-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-d-gray-400 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => { if (confirm('Delete this metric?')) onRemove(id); }}
                >
                    <TrashIcon className="w-4 h-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

function StatCard({ label, value, subtext, highlight }: { label: string, value: string | number, subtext?: string, highlight?: boolean }) {
    return (
        <Card className={cn("overflow-hidden border-l-4", highlight ? "border-l-d-red" : "border-l-d-gray-300")}>
            <CardContent className="p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-d-gray-500 mb-1">{label}</div>
                <div className={cn("text-2xl font-heading font-bold", highlight ? "text-d-red" : "text-d-black")}>
                    {value}
                </div>
                {subtext && <div className="text-xs text-d-gray-400 mt-1">{subtext}</div>}
            </CardContent>
        </Card>
    );
}

export default function AdminOverviewPage() {
    const activeRound = useStore(s => s.activeRound ?? 1);
    const publicView = useStore(s => s.publicViewEnabled);
    const autoPing = useStore(s => s.autoPingEnabled ?? true);
    const autoPingLead = useStore(s => s.autoPingLeadMinutes ?? 5);
    const allMetrics = useStore(s => s.metrics);
    const metrics = useMemo(() => allMetrics.filter(m => Number(m.round || 1) === activeRound), [allMetrics, activeRound]);
    const teams = useStore(s => s.teams);
    const queued = useMemo(() => getQueuedAutoPings(), []);

    // New Metric State
    const [newName, setNewName] = useState('');
    const [newMax, setNewMax] = useState(10);
    const [newRound, setNewRound] = useState<1 | 2 | 3>(1);
    useEffect(() => setNewRound(activeRound as 1 | 2 | 3), [activeRound]);

    const handleAddMetric = () => {
        if (!newName.trim()) return;
        ops.addMetric(newName.trim(), newMax, newRound);
        setNewName('');
        setNewMax(10);
    };

    const handleRemoveMetric = useCallback((id: string) => ops.removeMetric(id), []);

    return (
        <div className="min-h-screen bg-d-gray-50/50 p-6 space-y-8 max-w-[1600px] mx-auto">
            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="dabbawala-stamp text-2xl border-2 border-d-red text-d-red px-3 py-1 bg-white shadow-[3px_3px_0px_0px_rgba(211,47,47,0.2)] rotate-[-1deg]">
                            ADMIN CONTROL
                        </h1>
                        <Badge variant="outline" className="h-6 bg-white">v2.0</Badge>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-d-gray-400 mt-2 ml-1">
                        Logistics & Operations Center
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open('/', '_blank')}>
                        View User Dashboard
                    </Button>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Active Round" value={`Round ${activeRound}`} highlight />
                <StatCard label="Registered Teams" value={Object.keys(teams).length} subtext="Total teams" />
                <StatCard label={`Metrics (R${activeRound})`} value={metrics.length} subtext={`${allMetrics.length} total across all rounds`} />
                <StatCard label="Queued Pings" value={queued.length} subtext="Auto-notifications" />
            </div>

            {/* 3. Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left Column: Metrics & Evaluation (2/3) */}
                <div className="xl:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-heading tracking-wide uppercase text-d-red">Metrics Configuration</CardTitle>
                                <CardDescription>Manage scoring criteria for each round</CardDescription>
                            </div>
                            {metrics.length > 0 && (
                                <Button variant="ghost" size="sm" className="text-xs text-d-gray-400 hover:text-destructive" onClick={() => confirm(`Delete all Round ${activeRound} metrics?`) && metrics.forEach(m => ops.removeMetric(m.id))}>
                                    Delete All
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-d-gray-200 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-d-gray-50">
                                        <TableRow>
                                            <TableHead className="w-16">ID</TableHead>
                                            <TableHead>Metric Name</TableHead>
                                            <TableHead className="w-20 text-center">Round</TableHead>
                                            <TableHead className="w-24 text-center">Max Score</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {metrics.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-d-gray-400 text-xs italic">
                                                    No metrics defined. Add one below.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            metrics.map(m => (
                                                <MetricRow key={m.id} id={m.id} name={m.name || ''} max={m.max} round={m.round} onRemove={handleRemoveMetric} />
                                            ))
                                        )}
                                        {/* Add New Row */}
                                        <TableRow className="bg-d-gray-50/50 hover:bg-d-gray-50">
                                            <TableCell className="text-xs italic text-d-gray-400">New</TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 bg-white"
                                                    placeholder="Enter metric name..."
                                                    value={newName}
                                                    onChange={e => setNewName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddMetric()}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <select
                                                    className="h-8 w-full rounded-md border border-d-gray-200 bg-white text-xs px-2 cursor-pointer"
                                                    value={newRound}
                                                    onChange={e => setNewRound(Number(e.target.value) as 1 | 2 | 3)}
                                                >
                                                    <option value={1}>R1</option>
                                                    <option value={2}>R2</option>
                                                    <option value={3}>R3</option>
                                                </select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8 bg-white text-center"
                                                    placeholder="10"
                                                    value={newMax}
                                                    onChange={e => setNewMax(Number(e.target.value))}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddMetric()}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={handleAddMetric} className="h-8 w-full">Add</Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Controls & Config (1/3) */}
                <div className="space-y-6">
                    {/* Game State Control */}
                    <Card className="border-l-4 border-l-d-black">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-d-gray-500">Game State</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-d-gray-700 mb-2 block">Active Round</label>
                                <div className="grid grid-cols-3 gap-1 bg-d-gray-100 p-1 rounded-lg">
                                    {([1, 2, 3] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => ops.setActiveRound(r)}
                                            className={cn(
                                                "py-1.5 text-xs font-bold rounded-md transition-all shadow-sm",
                                                activeRound === r ? "bg-white text-d-red shadow-sm ring-1 ring-black/5" : "text-d-gray-500 hover:text-d-black hover:bg-white/50"
                                            )}
                                        >
                                            Round {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 border border-d-gray-100 rounded-lg bg-d-gray-50/50">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-bold text-d-black">Public Scores</div>
                                    <div className="text-[10px] text-d-gray-500">Show leaderboard to participants</div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={publicView ? "default" : "secondary"}
                                    onClick={() => ops.setPublicView(!publicView)}
                                    className={cn("w-16 h-7 text-xs", publicView ? "bg-d-red hover:bg-d-red-dark" : "bg-d-gray-200 text-d-gray-500")}
                                >
                                    {publicView ? 'ON' : 'OFF'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auto Ping Config */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-d-gray-500 flex items-center gap-2">
                                <SignalIcon className="w-4 h-4" /> Auto-Ping
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">System Enabled</span>
                                <Button
                                    size="sm"
                                    variant={autoPing ? "default" : "outline"}
                                    onClick={() => ops.setAutoPingEnabled(!autoPing)}
                                    className={cn("h-7 text-xs", autoPing ? "bg-d-black text-white" : "text-d-gray-400")}
                                >
                                    {autoPing ? 'Active' : 'Paused'}
                                </Button>
                            </div>
                            <div className="pt-2 border-t border-d-gray-100">
                                <label className="text-[10px] font-bold text-d-gray-400 uppercase tracking-wider mb-1.5 block">Lead Time (Minutes)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        className="h-8"
                                        min={1} max={60}
                                        value={autoPingLead}
                                        onChange={e => ops.setAutoPingLeadMinutes(Number(e.target.value))}
                                    />
                                    <div className="flex items-center text-xs text-d-gray-400 whitespace-nowrap">
                                        before slot
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Export */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-d-gray-500 flex items-center gap-2">
                                <ArrowDownTrayIcon className="w-4 h-4" /> Data Export
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {([1, 2, 3] as const).map(r => (
                                <Button
                                    key={r}
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-between group"
                                    onClick={() => ops.exportScoresCsv(r)}
                                >
                                    <span className="text-xs">Round {r} Scores</span>
                                    <ArrowDownTrayIcon className="w-3 h-3 text-d-gray-400 group-hover:text-d-black" />
                                </Button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Data Import */}
                    <ScoreImporter />
                </div>
            </div>
        </div>
    );
}

import { fetchGoogleSheetCsv } from '../actions';

function ScoreImporter() {
    const [mode, setMode] = useState<'file' | 'url'>('url');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const handleImport = async (csvText: string) => {
        setLoading(true);
        setStatus(null);
        try {
            const res = await ops.importScores(csvText);
            if (res.message.includes('Could not match')) {
                setStatus({ type: 'error', msg: res.message });
            } else {
                setStatus({ type: 'success', msg: res.message });
            }
        } catch (e) {
            setStatus({ type: 'error', msg: 'Import failed: ' + (e as Error).message });
        } finally {
            setLoading(false);
        }
    };

    const onUrlSubmit = async () => {
        if (!url) return;
        setLoading(true);
        setStatus(null);
        const res = await fetchGoogleSheetCsv(url);
        if (res.error) {
            setStatus({ type: 'error', msg: res.error });
            setLoading(false);
            return;
        }
        if (res.csv) {
            await handleImport(res.csv);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            if (text) await handleImport(text);
        };
        reader.readAsText(file);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-d-gray-500 flex items-center gap-2">
                    <ArrowDownTrayIcon className="w-4 h-4 rotate-180" /> Import Scores
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex p-1 bg-d-gray-100 rounded-lg">
                    <button
                        className={cn("flex-1 py-1 text-xs font-semibold rounded-md transition-all", mode === 'url' ? "bg-white text-d-red shadow-sm" : "text-d-gray-500")}
                        onClick={() => setMode('url')}
                    >
                        Google Sheet
                    </button>
                    <button
                        className={cn("flex-1 py-1 text-xs font-semibold rounded-md transition-all", mode === 'file' ? "bg-white text-d-red shadow-sm" : "text-d-gray-500")}
                        onClick={() => setMode('file')}
                    >
                        CSV File
                    </button>
                </div>

                {mode === 'url' ? (
                    <div className="space-y-2">
                        <Input
                            className="h-8 text-xs font-mono"
                            placeholder="https://docs.google.com/spreadsheets/..."
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                        <Button size="sm" className="w-full h-8 text-xs" onClick={onUrlSubmit} disabled={loading}>
                            {loading ? 'Fetching...' : 'Fetch & Import'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Input
                            type="file"
                            accept=".csv"
                            className="h-8 text-xs file:text-xs file:bg-d-gray-100 file:border-0 file:rounded-sm file:px-2 file:mr-2 cursor-pointer"
                            onChange={onFileChange}
                            disabled={loading}
                        />
                        {loading && <div className="text-xs text-d-gray-400 text-center">Processing file...</div>}
                    </div>
                )}

                {status && (
                    <div className={cn("text-xs p-2 rounded border",
                        status.type === 'success' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                        {status.msg}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
