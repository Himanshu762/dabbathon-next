'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

/**
 * Notification sound + read/unread tracker for team pages.
 * Plays a short beep when a new notification arrives.
 * Tracks which notifications the team has seen.
 */
export function useNotificationSound(teamId: string | null) {
    const notifications = useStore(s => s.notifications || []);
    const prevCountRef = useRef(0);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const playBeep = useCallback(() => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } catch { /* no audio context available */ }
    }, []);

    useEffect(() => {
        if (!teamId) return;
        const teamNotifs = notifications.filter(n => n.teamId === teamId);
        if (teamNotifs.length > prevCountRef.current && prevCountRef.current > 0) {
            playBeep();
        }
        prevCountRef.current = teamNotifs.length;
    }, [notifications, teamId, playBeep]);
}

/** Mark/unmark notifications as read (client-only, stored in sessionStorage) */
export function markNotifRead(notifId: string) {
    try {
        const key = 'readNotifs';
        const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
        if (!existing.includes(notifId)) {
            existing.push(notifId);
            sessionStorage.setItem(key, JSON.stringify(existing));
        }
    } catch { }
}

export function isNotifRead(notifId: string): boolean {
    try {
        const existing = JSON.parse(sessionStorage.getItem('readNotifs') || '[]');
        return existing.includes(notifId);
    } catch { return false; }
}

export function getUnreadCount(teamId: string, notifications: { id: string; teamId: string }[]): number {
    const teamNotifs = notifications.filter(n => n.teamId === teamId);
    return teamNotifs.filter(n => !isNotifRead(n.id)).length;
}
