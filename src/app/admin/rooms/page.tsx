'use client';

import { useState, useCallback } from 'react';
import { useStore, ops } from '../../../store';
import { TrashIcon } from '@heroicons/react/24/outline';

function RoomRow({ room, onRemove }: {
    room: { id: string; title?: string; password?: string };
    onRemove: (id: string) => void;
}) {
    const [localTitle, setLocalTitle] = useState(room.title || '');
    const [localPwd, setLocalPwd] = useState(room.password || '');

    return (
        <tr className="hover:bg-d-gray-50/50 transition">
            <td className="w-24 text-xs text-d-gray-400 font-mono">{room.id}</td>
            <td>
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Room number"
                    value={localTitle}
                    onChange={e => setLocalTitle(e.target.value)}
                    onBlur={() => ops.updateRoom(room.id, { title: localTitle })}
                />
            </td>
            <td className="w-48">
                <input
                    className="input py-1 px-2 text-sm w-full bg-transparent"
                    placeholder="Room password"
                    value={localPwd}
                    onChange={e => setLocalPwd(e.target.value)}
                    onBlur={() => ops.updateRoom(room.id, { password: localPwd })}
                />
            </td>
            <td className="w-10 text-center">
                <button
                    className="text-d-gray-400 hover:text-d-red hover:bg-d-red/5 p-1.5 rounded transition inline-flex"
                    onClick={() => { if (confirm('Delete this room?')) onRemove(room.id); }}
                    title="Delete Room"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

export default function AdminRoomsPage() {
    const rooms = useStore(s => s.rooms || {});
    const [newId, setNewId] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newPwd, setNewPwd] = useState('');

    const handleAddRoom = () => {
        if (!newId.trim()) return;
        ops.addRoom(newId.trim(), newTitle.trim(), newPwd);
        setNewId('');
        setNewTitle('');
        setNewPwd('');
    };

    const handleRemoveRoom = useCallback((id: string) => ops.removeRoom(id), []);

    const handleDeleteAllRooms = () => {
        if (!confirm('Delete ALL rooms? This cannot be undone.')) return;
        Object.keys(rooms).forEach(id => ops.removeRoom(id));
    };

    const roomList = Object.values(rooms);

    return (
        <div className="card overflow-hidden">
            <div className="p-4 border-b border-d-gray-200 flex items-center justify-between bg-white">
                <div className="card-section-title">Rooms ({roomList.length})</div>
                {roomList.length > 0 && (
                    <button className="text-[11px] text-d-gray-400 hover:text-d-red transition font-medium" onClick={handleDeleteAllRooms}>
                        Delete All
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="w-24">Room ID</th>
                            <th>Room Number</th>
                            <th className="w-48">Room Password</th>
                            <th className="w-10 text-center">Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roomList.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-d-gray-400 text-xs italic">
                                    No rooms yet. Add one below.
                                </td>
                            </tr>
                        )}
                        {roomList.map(r => (
                            <RoomRow key={r.id} room={r} onRemove={handleRemoveRoom} />
                        ))}
                        {/* Add Row */}
                        <tr className="bg-d-gray-50/50">
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="ID"
                                    value={newId}
                                    onChange={e => setNewId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Room number"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
                                />
                            </td>
                            <td className="px-3 py-2">
                                <input
                                    className="input py-1.5 px-3 text-sm w-full border-d-gray-300"
                                    placeholder="Password"
                                    value={newPwd}
                                    onChange={e => setNewPwd(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
                                />
                            </td>
                            <td className="text-center px-3 py-2">
                                <button className="btn-primary py-1.5 px-3 text-xs w-full" onClick={handleAddRoom}>Add</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
