'use client';

import Link from 'next/link';
import { useStore } from '../../store';

export default function TeamsPage() {
    const teams = useStore((s) => s.teams);
    const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
    const list = Object.values(teams).sort(numSort);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-bold text-d-black">Teams Directory</h2>
                <span className="badge badge-outline">{list.length} teams</span>
            </div>

            {list.length === 0 ? (
                <div className="card p-12 text-center">
                    <p className="text-sm text-d-gray-400">No teams yet.</p>
                    <p className="text-xs text-d-gray-300 mt-1">Teams are added from the Admin panel.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((t) => (
                        <div key={t.id} className="card p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-medium text-d-black text-sm">{t.name}</div>
                                    <div className="text-[11px] text-d-gray-400 mt-0.5">{t.id}</div>
                                </div>
                                {t.finalist && <span className="badge badge-red">★</span>}
                            </div>
                            <div className="text-[11px] text-d-gray-400 mt-2">
                                {t.room || 'No room'} · {t.slotTime || 'No slot'}
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <Link href={`/team/${t.id}`} className="text-xs text-d-red hover:underline font-medium">View →</Link>
                                <Link href={`/team/${t.id}/login`} className="text-xs text-d-gray-400 hover:underline">Login</Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
