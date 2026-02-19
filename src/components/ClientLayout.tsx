'use client';

import { useEffect } from 'react';
import { initFirebaseListeners, ops } from '../store';
import AppShell from '../components/Layout';
import { ToastProvider } from '../components/Toast';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        (async () => {
            await initFirebaseListeners();
            ops.seedDefaults();
        })();
    }, []);

    return <ToastProvider><AppShell>{children}</AppShell></ToastProvider>;
}
