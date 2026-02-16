'use client';

import { useState, useCallback } from 'react';
import { useStore, ops } from '../../../store';
import { TrashIcon } from '@heroicons/react/24/outline';

function TeamRow({ team, onRemove }: {
    team: { id: string; name: string; username?: string; password?: string; slotTime?: string; room?: string; finalist?: boolean };
    onRemove: (id: string) => void;
}) {
    const [localName, setLocalName] = useState(team.name || '');
    const [localUsername, setLocalUsername] = useState(team.username || '');
    const [localPwd, setLocalPwd] = useState(team.password || '');
    const [localSlot, setLocalSlot] = useState(team.slotTime || '');
    const [localRoom, setLocalRoom] = useState(team.room || '');

    return (
        <tr className="hover:bg-d-gray-50/50 transition">
            <td className="w-12 text-center text-xs text-d-gray-400 font-mono">{team.id}</td>
            <td>
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Team name"
                    value={localName}
                    onChange={e => setLocalName(e.target.value)}
                    onBlur={() => ops.renameTeam(team.id, localName)}
                />
            </td>
            <td className="w-32">
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Team ID"
                    value={localUsername}
                    onChange={e => setLocalUsername(e.target.value)}
                    onBlur={() => ops.setTeamCredential(team.id, localUsername, localPwd)}
                />
            </td>
            <td className="w-32">
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Password"
                    value={localPwd}
                    onChange={e => setLocalPwd(e.target.value)}
                    onBlur={() => ops.setTeamCredential(team.id, localUsername, localPwd)}
                />
            </td>
            <td className="w-24">
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Slot"
                    value={localSlot}
                    onChange={e => setLocalSlot(e.target.value)}
                    onBlur={() => ops.setTeamSlot(team.id, localSlot)}
                />
            </td>
            <td className="w-24">
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Room"
                    value={localRoom}
                    onChange={e => setLocalRoom(e.target.value)}
                    onBlur={() => ops.setTeamRoom(team.id, localRoom)}
                />
            </td>
            <td className="w-12 text-center">
                <input
                    type="checkbox"
                    checked={team.finalist || false}
                    onChange={e => ops.setTeamFinalist(team.id, e.target.checked)}
                    className="accent-d-red cursor-pointer w-4 h-4 mt-1"
                    title="Mark as Finalist"
                />
            </td>
            <td className="w-10 text-center">
                <button
                    className="text-d-gray-400 hover:text-d-red hover:bg-d-red/5 p-1.5 rounded transition inline-flex"
                    onClick={() => { if (confirm('Delete this team?')) onRemove(team.id); }}
                    title="Delete Team"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

export default function AdminTeamsPage() {
    const teams = useStore(s => s.teams);
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [newSlot, setNewSlot] = useState('');
    const [newRoom, setNewRoom] = useState('');

    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
    const list = Object.values(teams).sort(numSort);

    const handleAddTeam = () => {
        if (!newName.trim()) return;
        ops.addTeam(newName.trim(), {
            username: newUsername || undefined,
            password: newPwd || undefined,
            slotTime: newSlot || undefined,
            room: newRoom || undefined,
        });
        setNewName(''); setNewUsername(''); setNewPwd(''); setNewSlot(''); setNewRoom('');
    };

    const handleRemoveTeam = useCallback((id: string) => ops.removeTeam(id), []);

    const handleDeleteAllTeams = () => {
        if (!confirm('Delete ALL teams? This cannot be undone.')) return;
        Object.keys(teams).forEach(id => ops.removeTeam(id));
    };

    return (
        <div className="card overflow-hidden">
            <div className="p-4 border-b border-d-gray-200 flex items-center justify-between bg-white">
                <div className="card-section-title">Teams ({list.length})</div>
                {list.length > 0 && (
                    <button className="text-[11px] text-d-gray-400 hover:text-d-red transition font-medium" onClick={handleDeleteAllTeams}>
                        Delete All
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="w-12 text-center">#</th>
                            <th>Team Name</th>
                            <th className="w-32">Team ID</th>
                            <th className="w-32">Password</th>
                            <th className="w-24">Slot</th>
                            <th className="w-24">Room</th>
                            <th className="w-12 text-center">Fin</th>
                            <th className="w-10 text-center">Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-8 text-d-gray-400 text-xs italic">
                                    No teams yet. Add one below.
                                </td>
                            </tr>
                        )}
                        {list.map(t => (
                            <TeamRow key={t.id} team={t} onRemove={handleRemoveTeam} />
                        ))}
                        {/* Add Row */}
                        <tr className="bg-d-gray-50/50 border-t-2 border-d-gray-200">
                            <td className="text-center text-xs text-d-gray-400 italic py-2">New</td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Team Name"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Login ID"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Password"
                                    value={newPwd}
                                    onChange={e => setNewPwd(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Slot"
                                    value={newSlot}
                                    onChange={e => setNewSlot(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Room"
                                    value={newRoom}
                                    onChange={e => setNewRoom(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
                                />
                            </td>
                            <td className="text-center px-3 py-2 text-xs text-d-gray-300">-</td>
                            <td className="text-center px-3 py-2">
                                <button className="btn-primary py-1.5 px-3 text-xs w-full" onClick={handleAddTeam}>Add</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
