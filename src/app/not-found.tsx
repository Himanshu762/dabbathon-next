'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        router.push('/');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
            Redirecting to login...
        </div>
    );
}
