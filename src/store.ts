'use client';

import type { AppState, Metric, Team, ScoreEntry } from './types';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { db, initAnonymousAuth } from './lib/firebase';
import {
    collection, doc, onSnapshot, setDoc, addDoc, deleteDoc,
    updateDoc, query, getDocs, writeBatch, serverTimestamp,
    Timestamp
} from 'firebase/firestore';

const STORAGE_KEY = 'dabbathon-state-v1';

function normalizeRoomTitle(room: string | undefined): string | undefined {
    if (!room) return room;
    const trimmed = room.trim();
    const m = /^Room\s+([1-5])$/i.exec(trimmed);
    if (m) {
        const num = Number(m[1]);
        const letter = String.fromCharCode(64 + num);
        return `Room ${letter}`;
    }
    return trimmed;
}

function makeDefaultState(): AppState {
    const defaultMetrics: Metric[] = [];

    return {
        metrics: [],
        rooms: {},
        teams: {},
        scores: [],
        scoresRound2: [],
        scoresRound3: [],
        notifications: [],
        readNotifications: [],
        publicViewEnabled: false,
        activeRound: 1,
        autoPingEnabled: true,
        autoPingLeadMinutes: 5,
        timerConfig: { sessionDurationSec: 3_600, teamDurationSec: 600 },
        timerState: { session: { isRunning: false }, teams: {} },
    };
}

// ─── Global State ───
let state: AppState = makeDefaultState();

type Listener = () => void;
const listeners = new Set<Listener>();

export function getState(): AppState {
    return state;
}

export function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((l) => l());
}

export function setState(mutator: (draft: AppState) => void) {
    const next = structuredClone(state);
    mutator(next);
    state = next;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { }
    notify();
}

// ─── useStore hook ───
const serverSnapshot = makeDefaultState();
export function useStore<T>(selector: (s: AppState) => T): T {
    return useSyncExternalStore(
        subscribe,
        () => selector(state),
        () => selector(serverSnapshot),
    );
}

// ─── Metric helpers ───
function baseMetrics(all: Metric[]): Metric[] {
    return all.filter(m => !m.id.startsWith('r2_') && !m.id.startsWith('r3_'));
}
function metricsRound2(all: Metric[]): Metric[] {
    return all.filter(m => m.id.startsWith('r2_'));
}
function metricsRound3(all: Metric[]): Metric[] {
    return all.filter(m => m.id.startsWith('r3_'));
}
export function metricsForRound(round: 1 | 2 | 3, all: Metric[]): Metric[] {
    if (round === 2) return metricsRound2(all).length ? metricsRound2(all) : baseMetrics(all);
    if (round === 3) return metricsRound3(all).length ? metricsRound3(all) : baseMetrics(all);
    return baseMetrics(all);
}

// ─── Firebase Realtime Listeners ───
let listenersInitialized = false;

export async function initFirebaseListeners() {
    if (listenersInitialized) return;
    if (typeof window === 'undefined') return;
    listenersInitialized = true;

    // Hydrate from localStorage first (while auth is pending)
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as AppState;
            state = { ...makeDefaultState(), ...parsed };
            notify();
        }
    } catch { }

    // Sign in anonymously BEFORE any Firestore operations
    await initAnonymousAuth();

    // App state config
    onSnapshot(doc(db, 'app_state', 'config'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setState((s) => {
                if (data.publicViewEnabled !== undefined) s.publicViewEnabled = data.publicViewEnabled;
                if (data.activeRound !== undefined) s.activeRound = data.activeRound;
                if (data.timerConfig) s.timerConfig = data.timerConfig;
                if (data.autoPingEnabled !== undefined) s.autoPingEnabled = data.autoPingEnabled;
                if (data.autoPingLeadMinutes !== undefined) s.autoPingLeadMinutes = data.autoPingLeadMinutes;
            });
        }
    });

    // Teams
    onSnapshot(collection(db, 'teams'), (snap) => {
        setState((s) => {
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const id = change.doc.id;
                if (change.type === 'removed') {
                    delete s.teams[id];
                } else {
                    s.teams[id] = {
                        id,
                        name: d.name,
                        slotTime: d.slotTime || undefined,
                        room: normalizeRoomTitle(d.room) || undefined,
                        problemStatement: d.problemStatement || undefined,
                        finalist: d.finalist || undefined,
                        username: d.username || undefined,
                        password: d.password || undefined,
                    };
                }
            });
        });
    });

    // Metrics
    onSnapshot(collection(db, 'metrics'), (snap) => {
        setState((s) => {
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const id = change.doc.id;
                if (change.type === 'removed') {
                    s.metrics = s.metrics.filter(m => m.id !== id);
                } else {
                    const existing = s.metrics.find(m => m.id === id);
                    if (existing) {
                        existing.name = d.name;
                        existing.max = d.max;
                    } else {
                        s.metrics.push({ id, name: d.name, max: d.max });
                    }
                }
            });
        });
    });

    // Rooms
    onSnapshot(collection(db, 'rooms'), (snap) => {
        setState((s) => {
            s.rooms = s.rooms || {};
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const id = change.doc.id;
                if (change.type === 'removed') {
                    delete s.rooms![id];
                } else {
                    s.rooms![id] = {
                        id,
                        title: normalizeRoomTitle(d.title) || d.title,
                        password: d.password,
                        invigilator: d.invigilator,
                        updatedAt: d.updatedAt,
                    };
                }
            });
        });
    });

    // Scores (round 1)
    onSnapshot(collection(db, 'scores'), (snap) => {
        setState((s) => {
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const entry: ScoreEntry = {
                    teamId: d.teamId,
                    invigilatorName: d.invigilatorName,
                    metricId: d.metricId,
                    score: Number(d.score),
                    notes: d.notes || undefined,
                    timestamp: d.timestamp instanceof Timestamp ? d.timestamp.toMillis() : (d.timestamp || Date.now()),
                };
                if (change.type === 'removed') {
                    s.scores = s.scores.filter(e => !(e.teamId === entry.teamId && e.metricId === entry.metricId));
                } else {
                    const idx = s.scores.findIndex(e => e.teamId === entry.teamId && e.metricId === entry.metricId);
                    if (idx !== -1) s.scores[idx] = entry;
                    else s.scores.push(entry);
                }
            });
        });
    });

    // Scores round 2
    onSnapshot(collection(db, 'scores_round2'), (snap) => {
        setState((s) => {
            s.scoresRound2 = s.scoresRound2 || [];
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const entry: ScoreEntry = {
                    teamId: d.teamId, invigilatorName: d.invigilatorName, metricId: d.metricId,
                    score: Number(d.score), notes: d.notes || undefined,
                    timestamp: d.timestamp instanceof Timestamp ? d.timestamp.toMillis() : (d.timestamp || Date.now()),
                };
                if (change.type === 'removed') {
                    s.scoresRound2 = s.scoresRound2!.filter(e => !(e.teamId === entry.teamId && e.metricId === entry.metricId));
                } else {
                    const idx = s.scoresRound2!.findIndex(e => e.teamId === entry.teamId && e.metricId === entry.metricId);
                    if (idx !== -1) s.scoresRound2![idx] = entry;
                    else s.scoresRound2!.push(entry);
                }
            });
        });
    });

    // Scores round 3
    onSnapshot(collection(db, 'scores_round3'), (snap) => {
        setState((s) => {
            s.scoresRound3 = s.scoresRound3 || [];
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const entry: ScoreEntry = {
                    teamId: d.teamId, invigilatorName: d.invigilatorName, metricId: d.metricId,
                    score: Number(d.score), notes: d.notes || undefined,
                    timestamp: d.timestamp instanceof Timestamp ? d.timestamp.toMillis() : (d.timestamp || Date.now()),
                };
                if (change.type === 'removed') {
                    s.scoresRound3 = s.scoresRound3!.filter(e => !(e.teamId === entry.teamId && e.metricId === entry.metricId));
                } else {
                    const idx = s.scoresRound3!.findIndex(e => e.teamId === entry.teamId && e.metricId === entry.metricId);
                    if (idx !== -1) s.scoresRound3![idx] = entry;
                    else s.scoresRound3!.push(entry);
                }
            });
        });
    });

    // Notifications
    onSnapshot(collection(db, 'notifications'), (snap) => {
        setState((s) => {
            s.notifications = s.notifications || [];
            snap.docChanges().forEach((change) => {
                const d = change.doc.data();
                const id = change.doc.id;
                const n = { id, teamId: d.teamId, message: d.message, timestamp: d.timestamp instanceof Timestamp ? d.timestamp.toMillis() : (d.timestamp || Date.now()) };
                if (change.type === 'removed') {
                    s.notifications = s.notifications!.filter(x => x.id !== id);
                } else if (change.type === 'added') {
                    if (!s.notifications!.some(x => x.id === id)) s.notifications!.push(n);
                } else {
                    const idx = s.notifications!.findIndex(x => x.id === id);
                    if (idx !== -1) s.notifications![idx] = n;
                }
            });
        });
    });

    // Start auto-notify scheduler
    startAutoNotifyScheduler();
}

// ─── Team Auth (client-side session) ───
const TEAM_SESSION_PREFIX = 'dabbathon-team-session-';

export function loginTeam(teamId: string, username: string, password: string): boolean {
    const team = state.teams[teamId];
    if (!team) return false;
    if (team.username === username && team.password === password) {
        try { sessionStorage.setItem(TEAM_SESSION_PREFIX + teamId, 'true'); } catch { }
        return true;
    }
    return false;
}

export function loginTeamByPassword(password: string): string | null {
    const teams = Object.values(state.teams);
    const found = teams.find(t => t.password === password);
    if (found) {
        try { sessionStorage.setItem(TEAM_SESSION_PREFIX + found.id, 'true'); } catch { }
        return found.id;
    }
    return null;
}

export function isTeamAuthed(teamId: string): boolean {
    try { return sessionStorage.getItem(TEAM_SESSION_PREFIX + teamId) === 'true'; } catch { return false; }
}

export function logoutTeam(teamId: string) {
    try { sessionStorage.removeItem(TEAM_SESSION_PREFIX + teamId); } catch { }
}

// ─── Auto-notify scheduler ───
function parseSlotStart(slot: string | undefined): Date | null {
    if (!slot) return null;
    const s = slot.trim();
    if (!s) return null;
    const parts = s.split(/\s*[–-]\s*/);
    const first = parts[0] || s;
    const m = first.match(/^(\d{1,2}):(\d{2})(?:\s*[ap]m)?/i);
    if (!m) return null;
    let hour = Number(m[1]);
    const minute = Number(m[2]);
    const ampm = first.toLowerCase().includes('pm') ? 'pm' : (first.toLowerCase().includes('am') ? 'am' : '');
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
}

const AUTO_NOTIFIED_KEY = 'dabbathon-auto-notified-v1';
type NotifiedMap = Record<string, string[]>;

function loadAutoNotified(): NotifiedMap {
    try { const raw = localStorage.getItem(AUTO_NOTIFIED_KEY); if (raw) return JSON.parse(raw); } catch { }
    return {};
}
function saveAutoNotified(map: NotifiedMap) {
    try { localStorage.setItem(AUTO_NOTIFIED_KEY, JSON.stringify(map)); } catch { }
}
function markNotified(teamId: string, slotTime: string) {
    const map = loadAutoNotified();
    const arr = new Set(map[teamId] || []);
    arr.add(slotTime);
    map[teamId] = Array.from(arr);
    saveAutoNotified(map);
}
function hasBeenNotified(teamId: string, slotTime: string): boolean {
    return Boolean(loadAutoNotified()[teamId]?.includes(slotTime));
}

function runAutoNotifySweep() {
    const s = getState();
    if (s.autoPingEnabled === false) return;
    const teams = Object.values(s.teams);
    const now = new Date();
    for (const t of teams) {
        const start = parseSlotStart(t.slotTime);
        if (!start) continue;
        const label = t.slotTime || '';
        if (hasBeenNotified(t.id, label)) continue;
        const lead = s.autoPingLeadMinutes ?? 5;
        const diffMs = start.getTime() - now.getTime();
        if (diffMs <= lead * 60 * 1000 && diffMs > 0) {
            const hh = String(start.getHours()).padStart(2, '0');
            const mm = String(start.getMinutes()).padStart(2, '0');
            const msg = `You're up in ${lead} minutes for your presentation slot at ${hh}:${mm} (${label}). Please be ready.`;
            ops.notifyTeam(t.id, msg);
            markNotified(t.id, label);
        }
    }
}

function startAutoNotifyScheduler() {
    setInterval(() => { runAutoNotifySweep(); }, 15_000);
}

// ─── Domain Operations ───
export const ops = {
    setActiveRound(round: 1 | 2 | 3) {
        setState((s) => { s.activeRound = round; });
        setDoc(doc(db, 'app_state', 'config'), { activeRound: round }, { merge: true }).catch(console.error);
    },

    startSession() {
        setState((s) => {
            s.timerState.session = { ...(s.timerState.session || { isRunning: false }), startedAt: Date.now(), isRunning: true, pausedAt: undefined };
        });
    },
    stopSession() {
        setState((s) => {
            if (s.timerState.session?.isRunning) {
                s.timerState.session = { ...s.timerState.session, isRunning: false, pausedAt: Date.now() };
            }
        });
    },
    resetSession() {
        setState((s) => { s.timerState.session = { isRunning: false }; });
    },

    exportScoresCsv(round: 1 | 2 | 3) {
        const s = getState();
        let metrics = metricsForRound(round, s.metrics);
        if (round !== 1) metrics = metrics.filter(m => !(m.id === 'm6' || m.name.toLowerCase() === 'report'));
        const scoresAll = round === 2 ? (s.scoresRound2 || []) : (round === 3 ? (s.scoresRound3 || []) : s.scores);
        const scores = scoresAll.filter(sc => !sc.pending);
        const header = ['teamId', ...metrics.map(m => m.name), 'total'];
        const numSort = (a: { id: string }, b: { id: string }) => parseInt(a.id.replace(/\D/g, ''), 10) - parseInt(b.id.replace(/\D/g, ''), 10);
        const rows = Object.values(s.teams).sort(numSort).map((t) => {
            const totals = metrics.map(m => {
                const last = [...scores].reverse().find(x => x.teamId === t.id && x.metricId === m.id);
                return last ? last.score : 0;
            });
            const total = totals.reduce((a, b) => a + b, 0);
            return [t.id, ...totals, total];
        });
        const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
        try {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `scores_round${round}.csv`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch { }
    },

    setAutoPingEnabled(enabled: boolean) {
        setState((s) => { s.autoPingEnabled = enabled; });
        setDoc(doc(db, 'app_state', 'config'), { autoPingEnabled: enabled }, { merge: true }).catch(console.error);
    },
    setAutoPingLeadMinutes(mins: number) {
        const m = Math.max(1, Math.min(60, Math.floor(mins || 5)));
        setState((s) => { s.autoPingLeadMinutes = m; });
        setDoc(doc(db, 'app_state', 'config'), { autoPingLeadMinutes: m }, { merge: true }).catch(console.error);
    },

    setPublicView(enabled: boolean) {
        setState((s) => { s.publicViewEnabled = enabled; });
        setDoc(doc(db, 'app_state', 'config'), { publicViewEnabled: enabled }, { merge: true }).catch(console.error);
    },

    updateMetric(id: string, patch: Partial<Metric>) {
        setState((s) => { const m = s.metrics.find(mm => mm.id === id); if (m) Object.assign(m, patch); });
        const m = getState().metrics.find(m => m.id === id);
        if (m) setDoc(doc(db, 'metrics', m.id), { name: m.name, max: m.max }, { merge: true }).catch(console.error);
    },

    addMetric(name: string, max = 10) {
        const nm = (name || '').trim();
        if (!nm) return;
        const nums = getState().metrics.map(m => parseInt(m.id.replace(/\D/g, ''), 10)).filter(n => !Number.isNaN(n));
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        const id = `m${next}`;
        setState((s) => { s.metrics.push({ id, name: nm, max: Math.max(1, Math.floor(max)) }); });
        setDoc(doc(db, 'metrics', id), { name: nm, max: Math.max(1, Math.floor(max)) }).catch(console.error);
    },

    removeMetric(id: string) {
        setState((s) => {
            s.metrics = s.metrics.filter(m => m.id !== id);
            s.scores = s.scores.filter(sc => sc.metricId !== id);
            s.scoresRound2 = (s.scoresRound2 || []).filter(sc => sc.metricId !== id);
            s.scoresRound3 = (s.scoresRound3 || []).filter(sc => sc.metricId !== id);
        });
        deleteDoc(doc(db, 'metrics', id)).catch(console.error);
    },

    renameTeam(id: string, name: string) {
        setState((s) => { if (s.teams[id]) s.teams[id].name = name; });
        const t = getState().teams[id];
        if (t) setDoc(doc(db, 'teams', id), { ...t }, { merge: true }).catch(console.error);
    },

    addTeam(name: string, opts?: { slotTime?: string; room?: string; problemStatement?: string }): string {
        const s = getState();
        const nums = Object.keys(s.teams).map(k => parseInt(k.replace(/\D/g, ''), 10)).filter(n => !Number.isNaN(n));
        let nextNum = (nums.length ? Math.max(...nums) : 1) + 1;
        if (nextNum < 2) nextNum = 2;
        const id = `T${nextNum}`;
        const team: Team = { id, name: name.trim() || id, slotTime: opts?.slotTime, room: normalizeRoomTitle(opts?.room), problemStatement: opts?.problemStatement };
        setState((s) => { s.teams[id] = team; });
        setDoc(doc(db, 'teams', id), team).catch(console.error);
        return id;
    },

    removeTeam(id: string) {
        setState((s) => { delete s.teams[id]; });
        deleteDoc(doc(db, 'teams', id)).catch(console.error);
    },

    setTeamSlot(id: string, slotTime: string) {
        setState((s) => {
            if (s.teams[id]) s.teams[id].slotTime = slotTime;
        });
        const t = getState().teams[id];
        if (t) setDoc(doc(db, 'teams', id), { ...t }, { merge: true }).catch(console.error);
    },

    setTeamRoom(id: string, room: string) {
        setState((s) => {
            if (s.teams[id]) s.teams[id].room = normalizeRoomTitle(room) || undefined;
        });
        const t = getState().teams[id];
        if (t) setDoc(doc(db, 'teams', id), { ...t }, { merge: true }).catch(console.error);
    },

    setTeamProblem(id: string, problemStatement: string) {
        setState((s) => { if (s.teams[id]) s.teams[id].problemStatement = problemStatement; });
        const t = getState().teams[id];
        if (t) setDoc(doc(db, 'teams', id), { ...t }, { merge: true }).catch(console.error);
    },

    setTeamFinalist(id: string, finalist: boolean) {
        setState((s) => { if (s.teams[id]) s.teams[id].finalist = finalist; });
        const t = getState().teams[id];
        if (t) setDoc(doc(db, 'teams', id), { ...t }, { merge: true }).catch(console.error);
    },

    setTeamCredential(teamId: string, username: string, password: string) {
        setState((s) => {
            if (s.teams[teamId]) { s.teams[teamId].username = username; if (password) s.teams[teamId].password = password; }
        });
        const t = getState().teams[teamId];
        if (t) setDoc(doc(db, 'teams', teamId), { ...t }, { merge: true }).catch(console.error);
    },

    updateRoom(id: string, patch: { title?: string; password?: string; invigilator?: string }) {
        setState(s => {
            const rooms = (s.rooms ||= {});
            if (!rooms[id]) rooms[id] = { id };
            Object.assign(rooms[id], patch);
            if (patch.title) rooms[id].title = normalizeRoomTitle(patch.title);
        });
        const r = getState().rooms?.[id];
        if (r) setDoc(doc(db, 'rooms', id), { ...r, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
    },

    addRoom(id: string, title: string, password: string) {
        const normTitle = normalizeRoomTitle(title) || title;
        setState(s => {
            const rooms = (s.rooms ||= {});
            rooms[id] = { id, title: normTitle, password };
        });
        setDoc(doc(db, 'rooms', id), { id, title: normTitle, password, updatedAt: new Date().toISOString() }).catch(console.error);
    },

    removeRoom(id: string) {
        setState(s => { if (s.rooms) delete s.rooms[id]; });
        deleteDoc(doc(db, 'rooms', id)).catch(console.error);
    },

    async submitScore(round: 1 | 2 | 3, entry: ScoreEntry) {
        const collName = round === 2 ? 'scores_round2' : round === 3 ? 'scores_round3' : 'scores';
        setState((s) => {
            const arr = round === 2 ? (s.scoresRound2 ||= []) : round === 3 ? (s.scoresRound3 ||= []) : s.scores;
            const idx = arr.findIndex(e => e.teamId === entry.teamId && e.metricId === entry.metricId);
            if (idx !== -1) arr[idx] = entry;
            else arr.push(entry);
        });
        const docId = `${entry.teamId}_${entry.metricId}`;
        await setDoc(doc(db, collName, docId), {
            teamId: entry.teamId,
            invigilatorName: entry.invigilatorName,
            metricId: entry.metricId,
            score: entry.score,
            notes: entry.notes || '',
            timestamp: Date.now(),
        }).catch(console.error);
    },

    async deleteScore(round: 1 | 2 | 3, teamId: string, metricId: string) {
        const collName = round === 2 ? 'scores_round2' : round === 3 ? 'scores_round3' : 'scores';
        setState((s) => {
            if (round === 2) s.scoresRound2 = (s.scoresRound2 || []).filter(e => !(e.teamId === teamId && e.metricId === metricId));
            else if (round === 3) s.scoresRound3 = (s.scoresRound3 || []).filter(e => !(e.teamId === teamId && e.metricId === metricId));
            else s.scores = s.scores.filter(e => !(e.teamId === teamId && e.metricId === metricId));
        });
        const docId = `${teamId}_${metricId}`;
        await deleteDoc(doc(db, collName, docId)).catch(console.error);
    },

    notifyTeam(teamId: string, message: string) {
        const ts = Date.now();
        const n = { teamId, message, timestamp: ts };
        setState((s) => {
            s.notifications = s.notifications || [];
            s.notifications.push({ id: `temp-${ts}`, ...n });
        });
        addDoc(collection(db, 'notifications'), n).catch(console.error);
    },

    markNotificationRead(id: string) {
        setState((s) => {
            s.readNotifications = s.readNotifications || [];
            if (!s.readNotifications.includes(id)) s.readNotifications.push(id);
        });
    },

    deleteNotification(id: string) {
        setState((s) => {
            s.notifications = (s.notifications || []).filter(n => n.id !== id);
        });
        deleteDoc(doc(db, 'notifications', id)).catch(console.error);
    },

    // Seed defaults to Firestore if collections are empty
    async seedDefaults() {
        try {
            const metricsSnap = await getDocs(collection(db, 'metrics'));
            if (metricsSnap.empty) {
                const batch = writeBatch(db);
                const defaults = makeDefaultState();
                defaults.metrics.forEach(m => {
                    batch.set(doc(db, 'metrics', m.id), { name: m.name, max: m.max });
                });
                batch.set(doc(db, 'app_state', 'config'), {
                    publicViewEnabled: false,
                    activeRound: 1,
                    timerConfig: defaults.timerConfig,
                    autoPingEnabled: true,
                    autoPingLeadMinutes: 5,
                });
                await batch.commit();
            }
        } catch (e) {
            console.error('[seedDefaults]', e);
        }
    },

    // Timer ops for invigilator
    startTeamTimer(roomId: string, teamId: string) {
        const key = `${roomId}:${teamId}`;
        setState(s => { s.timerState.teams[key] = { startedAt: Date.now(), isRunning: true }; });
    },
    stopTeamTimer(roomId: string, teamId: string) {
        const key = `${roomId}:${teamId}`;
        setState(s => {
            const t = s.timerState.teams[key];
            if (t?.isRunning) s.timerState.teams[key] = { ...t, isRunning: false, pausedAt: Date.now() };
        });
    },
    resetTeamTimer(roomId: string, teamId: string) {
        const key = `${roomId}:${teamId}`;
        setState(s => { s.timerState.teams[key] = undefined; });
    },
};

// Helper: get queued auto pings
export function getQueuedAutoPings(): { teamId: string; slotTime: string; minutesUntil: number }[] {
    const s = getState();
    if (s.autoPingEnabled === false) return [];
    const result: { teamId: string; slotTime: string; minutesUntil: number }[] = [];
    const now = new Date();
    const lead = s.autoPingLeadMinutes ?? 5;
    for (const t of Object.values(s.teams)) {
        const start = parseSlotStart(t.slotTime);
        if (!start) continue;
        const label = t.slotTime || '';
        if (hasBeenNotified(t.id, label)) continue;
        const diffMs = start.getTime() - now.getTime();
        if (diffMs > 0 && diffMs <= lead * 60 * 1000 * 3) {
            result.push({ teamId: t.id, slotTime: label, minutesUntil: Math.round(diffMs / 60_000) });
        }
    }
    return result;
}
