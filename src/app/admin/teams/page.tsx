'use client';

import { useState, useCallback, useMemo } from 'react';
import { useStore, ops, metricsForRound } from '../../../store';
import { TrashIcon, PaperAirplaneIcon, PencilIcon } from '@heroicons/react/24/outline';
import { showToast } from '../../../components/Toast';

function TeamCard({ team, onRemove }: {
    team: { id: string; name: string; username?: string; password?: string; slotTime?: string; room?: string; problemStatement?: string; finalist?: boolean };
    onRemove: (id: string) => void;
}) {
    const activeRound = useStore(s => s.activeRound ?? 1);
    const metricsAll = useStore(s => s.metrics);
    const scoresR1 = useStore(s => s.scores);
    const scoresR2 = useStore(s => s.scoresRound2 || []);
    const metrics = useMemo(() => metricsForRound(activeRound as 1 | 2, metricsAll), [metricsAll, activeRound]);
    const scores = activeRound === 2 ? scoresR2 : scoresR1;
    const teamScores = scores.filter(s => s.teamId === team.id);

    const [editing, setEditing] = useState(false);
    const [localName, setLocalName] = useState(team.name || '');
    const [localSlot, setLocalSlot] = useState(team.slotTime || '');
    const [localRoom, setLocalRoom] = useState(team.room || '');
    const [localProblem, setLocalProblem] = useState(team.problemStatement || '');
    const [localUsername, setLocalUsername] = useState(team.username || '');
    const [localPwd, setLocalPwd] = useState(team.password || '');

    // Notification
    const [notifMsg, setNotifMsg] = useState('');
    const [notifSent, setNotifSent] = useState(false);

    const byMetric = metrics.map(m => {
        const last = [...teamScores].reverse().find(s => s.metricId === m.id);
        return { name: m.name, score: last?.score ?? 0, max: m.max };
    });
    const total = byMetric.reduce((s, b) => s + b.score, 0);
    const maxTotal = metrics.reduce((s, m) => s + m.max, 0);

    const saveEdits = () => {
        ops.renameTeam(team.id, localName);
        ops.setTeamSlot(team.id, localSlot);
        ops.setTeamRoom(team.id, localRoom);
        ops.setTeamProblem(team.id, localProblem);
        ops.setTeamCredential(team.id, localUsername, localPwd);
        showToast(`${team.name} updated`, 'success');
        setEditing(false);
    };

    const sendNotif = () => {
        if (!notifMsg.trim()) return;
        ops.notifyTeam(team.id, notifMsg.trim());
        setNotifMsg('');
        setNotifSent(true);
        showToast(`Notification sent to ${team.name}`, 'success');
        setTimeout(() => setNotifSent(false), 2000);
    };

    return (
        <div className="card p-0 overflow-hidden border border-d-gray-200 shadow-sm hover:shadow-md transition-all group relative">
            {/* Header */}
            <div className="p-4 pb-3 flex items-start justify-between">
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="dabbawala-code text-sm bg-d-black text-white">{team.id}</span>
                        <span className="font-heading font-bold text-base text-d-black uppercase tracking-tight">{team.name}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-d-gray-400">
                        <span className="px-1.5 py-0.5 border border-d-gray-200 rounded-sm bg-d-gray-50">
                            {team.room || 'NO ROOM'}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 border border-d-gray-200 rounded-sm bg-d-gray-50 text-d-red">
                            {team.slotTime || 'NO SLOT'}
                        </span>
                        {team.finalist && (
                            <>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 bg-d-red text-white rounded-sm">FINALIST</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(!editing)} className="text-d-gray-400 hover:text-d-black p-1 rounded transition" title="Edit">
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Delete this team?')) onRemove(team.id); }} className="text-d-gray-400 hover:text-d-red p-1 rounded transition" title="Delete">
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Problem Statement */}
            {team.problemStatement && !editing && (
                <div className="px-4 pb-2">
                    <div className="text-[11px] text-d-gray-600 bg-d-gray-50 border border-d-gray-100 rounded p-2 leading-relaxed">
                        <strong className="text-d-red">Problem:</strong> {team.problemStatement}
                    </div>
                </div>
            )}

            {/* Scores Summary */}
            <div className="px-4 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {byMetric.map((b, i) => (
                        <div key={i} className="text-[10px] px-1.5 py-0.5 border border-d-gray-100 rounded bg-white">
                            <span className="text-d-gray-400">{b.name}:</span>{' '}
                            <span className="font-bold text-d-black">{b.score}</span>
                            <span className="text-d-gray-300">/{b.max}</span>
                        </div>
                    ))}
                    <div className="text-[10px] px-1.5 py-0.5 border border-d-red/20 rounded bg-d-red/5 font-bold text-d-red">
                        Total: {total}/{maxTotal}
                    </div>
                </div>
            </div>

            {/* Edit Panel */}
            {editing && (
                <div className="px-4 pb-3 space-y-2 border-t border-d-gray-100 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                        <input className="input text-xs" placeholder="Name" value={localName} onChange={e => setLocalName(e.target.value)} />
                        <input className="input text-xs" type="time" placeholder="Slot Time" value={localSlot} onChange={e => setLocalSlot(e.target.value)} />
                        <input className="input text-xs" placeholder="Room" value={localRoom} onChange={e => setLocalRoom(e.target.value)} />
                        <input className="input text-xs" placeholder="Login ID" value={localUsername} onChange={e => setLocalUsername(e.target.value)} />
                        <input className="input text-xs" placeholder="Password" value={localPwd} onChange={e => setLocalPwd(e.target.value)} />
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] text-d-gray-500">Finalist</label>
                            <input type="checkbox" checked={team.finalist || false} onChange={e => ops.setTeamFinalist(team.id, e.target.checked)} className="accent-d-red w-3.5 h-3.5" />
                        </div>
                    </div>
                    <input className="input text-xs w-full" placeholder="Problem Statement..." value={localProblem} onChange={e => setLocalProblem(e.target.value)} />
                    <div className="flex gap-2">
                        <button className="btn-primary text-xs flex-1" onClick={saveEdits}>Save</button>
                        <button className="btn-secondary text-xs" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Quick Notification */}
            <div className="px-4 pb-3 flex gap-1.5">
                <input
                    className="input text-xs flex-1"
                    placeholder={`Notify ${team.name}...`}
                    value={notifMsg}
                    onChange={e => setNotifMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendNotif()}
                />
                <button className="btn-primary p-1.5" onClick={sendNotif} title="Send" disabled={!notifMsg.trim()}>
                    <PaperAirplaneIcon className="w-3.5 h-3.5" />
                </button>
                {notifSent && <span className="text-[10px] text-green-600 self-center">✓</span>}
            </div>
        </div>
    );
}

export default function AdminTeamsPage() {
    const teams = useStore(s => s.teams);
    const notifications = useStore(s => s.notifications || []);
    const [newName, setNewName] = useState('');
    const [query, setQuery] = useState('');
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState('');

    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
    const list = Object.values(teams)
        .filter(t => t.id.toLowerCase().includes(query.toLowerCase()) || (t.name || '').toLowerCase().includes(query.toLowerCase()))
        .sort(numSort);

    const handleAddTeam = () => {
        if (!newName.trim()) return;
        ops.addTeam(newName.trim());
        setNewName('');
    };

    const handleRemoveTeam = useCallback((id: string) => ops.removeTeam(id), []);

    const handleDeleteAllTeams = () => {
        if (!confirm('Delete ALL teams? This cannot be undone.')) return;
        Object.keys(teams).forEach(id => ops.removeTeam(id));
    };

    const handleAutoSelect = () => {
        if (!confirm('Auto-select Top 10 teams based on R1+R2 scores?')) return;
        ops.autoSelectFinalists();
    };

    const handleBroadcast = () => {
        if (!broadcastMsg.trim()) return;
        Object.keys(teams).forEach(id => ops.notifyTeam(id, broadcastMsg.trim()));
        setBroadcastMsg('');
        setShowBroadcast(false);
    };

    const recentNotifs = useMemo(() => [...notifications].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10), [notifications]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="dabbawala-stamp text-xl border-2 border-d-red text-d-red px-2 py-0.5 bg-white shadow-[2px_2px_0px_0px_rgba(211,47,47,0.2)] rotate-[-1deg]">
                        TEAMS ({Object.keys(teams).length})
                    </h2>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <button className="text-[11px] font-medium text-d-gray-400 hover:text-d-red transition" onClick={handleAutoSelect}>Auto Select Finalists</button>
                    <button className="text-[11px] font-medium text-d-gray-400 hover:text-d-red transition" onClick={() => setShowBroadcast(!showBroadcast)}>Broadcast</button>
                    {Object.keys(teams).length > 0 && (
                        <button className="text-[11px] font-medium text-d-gray-400 hover:text-d-red transition" onClick={handleDeleteAllTeams}>Delete All</button>
                    )}
                </div>
            </div>

            {/* Broadcast */}
            {showBroadcast && (
                <div className="card p-4 space-y-2 border-d-red/20 bg-d-red/5">
                    <div className="text-xs font-bold uppercase tracking-widest text-d-red">Broadcast to All Teams</div>
                    <textarea className="input min-h-[60px] text-sm" placeholder="Message for all teams..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} />
                    <div className="flex gap-2">
                        <button className="btn-primary text-xs" onClick={handleBroadcast} disabled={!broadcastMsg.trim()}>Send to {Object.keys(teams).length} teams</button>
                        <button className="btn-secondary text-xs" onClick={() => setShowBroadcast(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Search + Add */}
            <div className="flex gap-2 flex-wrap">
                <input className="input flex-1 min-w-[180px]" placeholder="Search teams..." value={query} onChange={e => setQuery(e.target.value)} />
                <input className="input w-48" placeholder="New team name..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTeam()} />
                <button className="btn-primary text-xs px-4" onClick={handleAddTeam}>Add Team</button>
            </div>

            {/* Team Grid */}
            {list.length === 0 ? (
                <div className="card p-12 text-center border-dashed border-2 border-d-gray-200 bg-transparent shadow-none">
                    <p className="text-sm font-bold uppercase tracking-widest text-d-gray-400">No teams found</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {list.map(t => (
                        <TeamCard key={t.id} team={t} onRemove={handleRemoveTeam} />
                    ))}
                </div>
            )}

            {/* Recent Notifications */}
            {recentNotifs.length > 0 && (
                <div className="card p-4 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-d-gray-400">Recent Notifications</div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                        {recentNotifs.map(n => (
                            <div key={n.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-d-gray-50 last:border-0">
                                <span className="truncate"><strong className="text-d-red">{n.teamId}</strong> — {new Date(n.timestamp).toLocaleTimeString()} — {n.message}</span>
                                <button className="text-[10px] text-d-red hover:underline flex-shrink-0" onClick={() => ops.deleteNotification(n.id)}>×</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
