'use client';

import { useEffect } from 'react';
import { initFirebaseListeners, ops } from '../store';
import AppShell from '../components/Layout';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        (async () => {
            await initFirebaseListeners();
            ops.seedDefaults();
        })();
    }, []);

    return <AppShell>{children}</AppShell>;
}
