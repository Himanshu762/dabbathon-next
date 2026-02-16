'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { getQueuedAutoPings, ops } from '../../store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const tab = pathname === '/admin/rooms' ? 'rooms' : pathname === '/admin/teams' ? 'teams' : 'overview';

    // Auto-Ping Runner
    // We run this in Layout so it works on any admin page
    useEffect(() => {
        const interval = setInterval(() => {
            const pings = getQueuedAutoPings();
            pings.forEach(p => ops.notifyTeam(p.teamId, p.message));
        }, 30_000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-heading text-xl font-bold text-d-black">Admin Panel</h2>
                <nav className="flex gap-1">
                    {[
                        { key: 'overview', href: '/admin', label: 'Overview' },
                        { key: 'rooms', href: '/admin/rooms', label: 'Rooms' },
                        { key: 'teams', href: '/admin/teams', label: 'Teams' },
                    ].map((t) => (
                        <Link key={t.key} href={t.href}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.key ? 'bg-d-red text-white' : 'text-d-gray-600 hover:bg-d-gray-100'}`}>
                            {t.label}
                        </Link>
                    ))}
                </nav>
            </div>
            {children}
        </div>
    );
}
