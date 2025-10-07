// services/maitriApiService.ts
import { apiService, getToken, saveToken, removeToken } from './apiService';
import { AstronautData, UserData, UserType, SymptomLog, CaptainLog, DoctorAdvice, MissionProcedure, MassProtocol, DailyCheckInLog, MissionTask, Mood, SleepQuality, EarthlinkMessage } from '../types';

// --- AUTH & USER MGMT ---
const login = async (name: string, pass: string, type: UserType): Promise<{ token: string }> => {
    const response = await apiService.post<{ token: string }>('/auth/login', { name, password: pass, type });
    if (response.token) {
        saveToken(response.token);
    }
    return response;
};

const register = async (name: string, data: UserData): Promise<AstronautData> => {
    return apiService.post<AstronautData>('/auth/register', { name, ...data });
};

const logout = () => {
    removeToken();
};

const getSecurityQuestion = async (name: string): Promise<string | null> => {
    try {
        const response = await apiService.post<{ question: string }>('/auth/forgot-password/start', { name });
        return response.question;
    } catch (error) {
        console.error("Error getting security question:", error);
        return null;
    }
};

const verifySecurityAnswer = async (name: string, answer: string): Promise<boolean> => {
    try {
        await apiService.post('/auth/forgot-password/verify', { name, answer });
        return true;
    } catch (error) {
        console.error("Error verifying security answer:", error);
        return false;
    }
};

const resetPassword = async (name: string, answer: string, newPass: string): Promise<void> => {
    await apiService.post('/auth/forgot-password/reset', { name, answer, newPassword: newPass });
};


// --- ASTRONAUT DATA ---
const getAstronautData = async (): Promise<{ data: AstronautData, userType: UserType }> => {
    return apiService.get<{ data: AstronautData, userType: UserType }>('/astronauts/me');
};

const addSymptomLog = (log: Omit<SymptomLog, 'id' | 'date'>): Promise<SymptomLog> => {
    return apiService.post<SymptomLog>('/astronauts/me/symptoms', log);
};

const addMediaToSymptomLog = (logId: string, mediaUrl: string, mediaType: 'photo' | 'video'): Promise<void> => {
    return apiService.put<void>(`/astronauts/me/symptoms/${logId}/media`, { mediaUrl, mediaType });
};

const addCaptainLog = (log: Omit<CaptainLog, 'id' | 'date'>): Promise<CaptainLog> => {
    return apiService.post<CaptainLog>('/astronauts/me/captain-logs', log);
};

const addDailyCheckIn = (checkIn: { mood: Mood; sleep: SleepQuality }): Promise<DailyCheckInLog> => {
    return apiService.post<DailyCheckInLog>('/astronauts/me/check-ins', checkIn);
};

const updateMissionTasks = (newTasks: MissionTask[]): Promise<MissionTask[]> => {
    return apiService.put<MissionTask[]>('/astronauts/me/tasks', { tasks: newTasks });
};

const markEarthlinkMessageAsViewed = (messageId: string): Promise<void> => {
    return apiService.put<void>(`/astronauts/me/earthlink/${messageId}/viewed`, {});
};

const addEarthlinkMessageFromAstronaut = (message: Omit<EarthlinkMessage, 'id' | 'date' | 'viewed'>): Promise<EarthlinkMessage> => {
    return apiService.post<EarthlinkMessage>('/astronauts/me/earthlink', message);
};

// --- ADMIN ACTIONS ---
const getAllAstronauts = async (): Promise<AstronautData[]> => {
    return apiService.get<AstronautData[]>('/admin/astronauts');
};

const addDoctorAdvice = (username: string, advice: Omit<DoctorAdvice, 'id' | 'date'>): Promise<DoctorAdvice> => {
    return apiService.post<DoctorAdvice>(`/admin/astronauts/${username}/advice`, advice);
};

const assignProcedure = (username: string, procedure: Omit<MissionProcedure, 'id'>): Promise<MissionProcedure> => {
    return apiService.post<MissionProcedure>(`/admin/astronauts/${username}/procedures`, procedure);
};

const assignMassProtocol = (username: string, protocol: Omit<MassProtocol, 'id'>): Promise<MassProtocol> => {
    return apiService.post<MassProtocol>(`/admin/astronauts/${username}/mass-protocols`, protocol);
};

const updateAstronautPhoto = (username: string, photoUrl: string): Promise<{ photoUrl: string }> => {
    return apiService.put<{ photoUrl: string }>(`/admin/astronauts/${username}/photo`, { photoUrl });
};

const sendEarthlinkMessage = (username: string, message: Omit<EarthlinkMessage, 'id' | 'date' | 'viewed'>): Promise<EarthlinkMessage> => {
    return apiService.post<EarthlinkMessage>(`/admin/astronauts/${username}/earthlink`, message);
};

// --- Exported Service Singleton ---
export const maitriApiService = {
    login, register, logout, getAstronautData, addSymptomLog,
    addCaptainLog, addDailyCheckIn, updateMissionTasks, getAllAstronauts, addDoctorAdvice,
    assignProcedure, assignMassProtocol, updateAstronautPhoto,
    sendEarthlinkMessage, markEarthlinkMessageAsViewed, addMediaToSymptomLog, addEarthlinkMessageFromAstronaut,
    getSecurityQuestion, verifySecurityAnswer, resetPassword,
};
