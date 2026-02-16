'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    ChartBarIcon,
    MegaphoneIcon,
    UsersIcon,
    Cog6ToothIcon,
    WrenchScrewdriverIcon,
    ArrowRightStartOnRectangleIcon,
    Bars3Icon,
    XMarkIcon,
    ServerStackIcon,
} from '@heroicons/react/24/outline';
import { isAdminAuthed, setAdminAuthed } from '../auth';
import SiteHeader from './SiteHeader';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { href: '/participant', label: 'Participant', icon: MegaphoneIcon },
    { href: '/teams', label: 'Teams', icon: UsersIcon },
    { href: '/admin', label: 'Admin', icon: Cog6ToothIcon },
    { href: '/invigilator', label: 'Invigilator', icon: WrenchScrewdriverIcon },
    { href: '/backend', label: 'Backend', icon: ServerStackIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [adminAuthed, setAdminAuthedState] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setAdminAuthedState(isAdminAuthed());
        function handler() { setAdminAuthedState(isAdminAuthed()); }
        window.addEventListener('admin-auth-changed', handler);
        return () => window.removeEventListener('admin-auth-changed', handler);
    }, []);

    const isLoginPage = pathname === '/';

    return (
        <div className="min-h-screen flex bg-d-gray-50">
            {/* Sidebar */}
            {adminAuthed && !isLoginPage && (
                <>
                    {/* Mobile hamburger */}
                    <button
                        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-d-gray-200 shadow-sm"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
                    </button>

                    {/* Mobile overlay */}
                    {sidebarOpen && (
                        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
                    )}

                    <aside className={`
            fixed lg:sticky top-0 left-0 z-40 h-screen w-56 flex-shrink-0
            bg-white border-r border-d-gray-200
            flex flex-col transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
                        {/* Brand */}
                        <div className="p-4 border-b border-d-gray-100">
                            <div className="flex items-center gap-2">
                                <svg className="w-7 h-7 text-d-red flex-shrink-0" viewBox="0 0 64 64" fill="currentColor">
                                    <rect x="14" y="16" width="36" height="8" rx="2" opacity="0.95" />
                                    <rect x="16" y="24" width="32" height="10" rx="1.5" opacity="0.75" />
                                    <rect x="16" y="34" width="32" height="10" rx="1.5" opacity="0.55" />
                                    <rect x="16" y="44" width="32" height="10" rx="1.5" opacity="0.35" />
                                    <path d="M28 10 C28 6 36 6 36 10 L36 16 L28 16 Z" opacity="0.6" />
                                </svg>
                                <div>
                                    <div className="font-heading font-bold text-sm text-d-black leading-tight">Dabbathon <span className="text-d-red">v2.0</span></div>
                                    <div className="text-[10px] font-medium tracking-widest uppercase text-d-gray-400">BBA PESU</div>
                                </div>
                            </div>
                        </div>

                        {/* Nav */}
                        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                            {navItems.map(({ href, label, icon: Icon }) => {
                                const isActive = pathname.startsWith(href);
                                return (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        {label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Logout */}
                        <div className="p-2 border-t border-d-gray-100">
                            <button
                                onClick={() => { setAdminAuthed(false); window.location.assign('/'); }}
                                className="sidebar-link w-full text-d-gray-400 hover:text-d-red"
                            >
                                <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* Main */}
            <main className="flex-1 min-h-screen flex flex-col">
                <div className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
                    {!isLoginPage && <SiteHeader />}
                    {children}
                </div>
                <footer className="border-t border-d-gray-200">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 text-[11px] text-d-gray-400 flex items-center justify-between">
                        <span>© {new Date().getFullYear()} BBA PESU · Dabbathon v2.0</span>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-d-red" />
                            <span>Live</span>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
