export type Role = 'participant' | 'invigilator' | 'backend';

export type RoundId = 'round1' | 'round2';

export interface Metric {
  id: string;
  name: string;
  max: number;
  round?: 1 | 2 | 3;
}

export interface Team {
  id: string;
  name: string;
  slotTime?: string;
  room?: string;
  problemStatement?: string;
  finalist?: boolean;
  username?: string;
  password?: string;
  submissions?: Record<string, string>; // e.g. "1": "url", "2": "url"
}

export interface ScoreEntry {
  teamId: string;
  invigilatorName: string;
  metricId: string;
  score: number;
  notes?: string;
  timestamp: number;
  pending?: boolean;
}

export interface TimerConfig {
  sessionDurationSec: number;
  teamDurationSec: number;
}

export interface TimerState {
  session?: {
    startedAt?: number;
    pausedAt?: number;
    isRunning: boolean;
  };
  teams: Record<string, {
    startedAt?: number;
    pausedAt?: number;
    isRunning: boolean;
  } | undefined>;
}

export interface AppState {
  metrics: Metric[];
  rooms?: Record<string, { id: string; title?: string; password?: string; invigilator?: string; updatedAt?: string }>;
  teams: Record<string, Team>;
  scores: ScoreEntry[];
  scoresRound2?: ScoreEntry[];
  scoresRound3?: ScoreEntry[];
  notifications?: { id: string; teamId: string; message: string; timestamp: number }[];
  readNotifications?: string[];
  publicViewEnabled: boolean;
  activeRound?: 1 | 2 | 3;
  timerConfig: TimerConfig;
  timerState: TimerState;
  autoPingEnabled?: boolean;
  autoPingLeadMinutes?: number;
}
