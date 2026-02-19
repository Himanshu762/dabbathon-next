'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void }>({ toast: () => { } });

export function useToast() { return useContext(ToastContext); }

let _globalToast: (msg: string, type?: ToastType) => void = () => { };
export function showToast(msg: string, type: ToastType = 'info') { _globalToast(msg, type); }

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    let nextId = 0;

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now() + nextId++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    useEffect(() => { _globalToast = toast; }, [toast]);

    const colors: Record<ToastType, string> = {
        success: 'bg-green-600 text-white',
        error: 'bg-d-red text-white',
        info: 'bg-d-black text-white',
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id}
                        className={`${colors[t.type]} px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium pointer-events-auto 
                        animate-[slideIn_0.3s_ease-out] max-w-sm`}
                        style={{ animation: 'slideIn 0.3s ease-out' }}
                    >
                        {t.type === 'success' && '✓ '}
                        {t.type === 'error' && '✗ '}
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
