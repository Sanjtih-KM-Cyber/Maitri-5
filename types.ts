// types.ts

export enum Screen {
  Home = 'home',
  Guardian = 'guardian',
  CoPilot = 'copilot',
  Storyteller = 'storyteller',
  Recreation = 'recreation',
  Chat = 'chat',
  Admin = 'admin',
}

export interface EarthlinkMessage {
  id: string;
  date: string;
  from: string;
  text?: string;
  photoUrl?: string; // Base64 data URL
  videoUrl?: string; // Base64 data URL
  viewed: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'model' | 'system';
  timestamp: string;
  replyTo?: {
    id: string;
    text: string;
    sender: 'user' | 'model' | 'system';
  }
}

export interface CaptainLog {
  id: string;
  date: string;
  text: string;
  photo?: string; // Base64 data URL
  video?: string; // Base64 data URL
}

export interface MissionTask {
    id: number;
    time: string;
    name: string;
    completed: boolean;
}

export interface MissionProcedure {
    id: string;
    name:string;
    steps: { id: string; text: string }[];
}

export type UserType = 'astronaut' | 'admin';

export interface UserData {
    password?: string; // Optional on some operations
    securityQuestion: string;
    securityAnswer: string;
}

export interface SymptomLog {
    id: string;
    date: string;
    symptom: string;
    severity: 'mild' | 'moderate' | 'severe';
    notes: string;
    photo?: string; // Base64 data URL
    video?: string; // Base64 data URL
}

export interface DoctorAdvice {
    id: string;
    date: string;
    text: string;
    symptomLogId: string; // To link advice to a specific symptom
}

export interface MassProtocol {
    id: string;
    name: string;
    sets: number;
    duration: number; // in minutes
    rest: number; // in seconds
}

export type Mood = 'Excellent' | 'Good' | 'Okay' | 'Tired' | 'Stressed';
export type SleepQuality = '< 6 hours' | '6-7 hours' | '7-8 hours' | '8+ hours';

export interface DailyCheckInLog {
    date: string; // YYYY-MM-DD
    mood: Mood;
    sleep: SleepQuality;
}

// Master data structure for each astronaut
export interface AstronautData {
    name: string;
    photoUrl: string | null;
    designation: string;
    missionTasks: MissionTask[];
    symptomLogs: SymptomLog[];
    captainLogs: CaptainLog[];
    doctorAdvice: DoctorAdvice[];
    massProtocols: MassProtocol[];
    procedures: MissionProcedure[];
    dailyCheckInLogs: DailyCheckInLog[];
    earthlinkMessages: EarthlinkMessage[];
}
