
// services/maitriService.ts
import { AstronautData, UserData, UserType, SymptomLog, CaptainLog, DoctorAdvice, MissionProcedure, MassProtocol, DailyCheckInLog, MissionTask, Mood, SleepQuality, EarthlinkMessage } from '../types';

// --- STATEFUL MOCK DATABASE WITH INDEXEDDB PERSISTENCE ---

const DB_NAME = 'MAITRI_MOCK_DB_V2';
const DB_VERSION = 1;
const STORE_NAME = 'users';

const initialDbState: { [key: string]: { data: AstronautData | null; user: UserData & { password?: string, type: UserType } } } = {
    'karen': {
        data: {
            name: 'karen',
            photoUrl: null,
            designation: 'Mission Commander',
            missionTasks: [
              { id: 1, time: '08:00', name: 'Morning Briefing', completed: true },
              { id: 2, time: '09:00', name: 'EVA Prep', completed: false },
              { id: 3, time: '13:00', name: 'Geological Survey', completed: false },
              { id: 4, time: '17:00', name: 'System Diagnostics', completed: false },
            ],
            symptomLogs: [],
            captainLogs: [{ id: 'log-1', date: new Date(Date.now() - 86400000 * 2).toISOString(), text: 'Day 185. The view of Earth is mesmerizing.'}],
            doctorAdvice: [],
            massProtocols: [
                { id: 'mass-1', name: 'Upper Body Strength', sets: 4, duration: 45, rest: 60 },
                { id: 'mass-2', name: 'Core Stability', sets: 3, duration: 60, rest: 30 },
            ],
            procedures: [
                { id: 'proc-1', name: 'Standard EVA Pre-flight Check', steps: [{id: 's1', text: 'Verify suit pressure is nominal.'}, {id: 's2', text: 'Check helmet seal.'}] },
            ],
            dailyCheckInLogs: [{ date: new Date(Date.now() - 86400000).toISOString().split('T')[0], mood: 'Good', sleep: '7-8 hours' }],
            earthlinkMessages: [],
        },
        user: {
            password: 'password123',
            securityQuestion: 'What was the name of your first pet?',
            securityAnswer: 'fluffy',
            type: 'astronaut'
        }
    },
    'admin': {
        data: null, // Admins don't have astronaut data
        user: {
            password: 'admin',
            securityQuestion: "What is your mother's maiden name?",
            securityAnswer: 'smith',
            type: 'admin'
        }
    }
};


let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'name' });
                    Object.entries(initialDbState).forEach(([key, value]) => {
                        store.add({ name: key, ...value });
                    });
                }
            };
        });
    }
    return dbPromise;
};


const parseMockToken = (token: string): { username: string; type: UserType } | null => {
    if (!token || !token.startsWith('mock-jwt-for-')) return null;
    const parts = token.split('-');
    if (parts.length < 6) return null;
    const username = parts[3];
    const type = parts[4] as UserType;
    if (type !== 'astronaut' && type !== 'admin') return null;
    return { username, type };
};

const getLoggedInUserFromToken = (): { username: string; type: UserType } | null => {
    const token = localStorage.getItem('maitri_jwt');
    if (!token) return null;
    return parseMockToken(token);
};

const getLocalDateString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// --- Helper for transactions ---
const performTransaction = <T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => Promise<T>): Promise<T> => {
    return getDb().then(db => {
        return new Promise<T>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            
            callback(store)
                .then(resolve)
                .catch(reject);

            transaction.oncomplete = () => {};
            transaction.onerror = () => reject(transaction.error);
        });
    });
};

const readUser = (username: string, store: IDBObjectStore): Promise<any> => {
    return new Promise((resolve, reject) => {
        const request = store.get(username.toLowerCase());
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- AUTH & USER MGMT ---
const login = async (name: string, pass: string, type: UserType): Promise<{ token: string }> => {
    return performTransaction('readonly', async (store) => {
        const username = name.toLowerCase();
        const userRecord = await readUser(username, store);
        if (userRecord && userRecord.user.password === pass && userRecord.user.type === type) {
            const mockToken = `mock-jwt-for-${username}-${type}-${Date.now()}`;
            localStorage.setItem('maitri_jwt', mockToken);
            return { token: mockToken };
        }
        throw new Error("Invalid credentials");
    });
};

const register = async (name: string, data: UserData): Promise<AstronautData> => {
    return performTransaction('readwrite', async (store) => {
        const username = name.toLowerCase();
        const existingUser = await readUser(username, store);
        if (existingUser) {
            throw new Error("User already exists");
        }
        
        const newAstronautData: AstronautData = { 
            name: username, 
            photoUrl: null, 
            designation: 'New Recruit', 
            missionTasks: [], symptomLogs: [], captainLogs: [], doctorAdvice: [], 
            massProtocols: [], procedures: [], dailyCheckInLogs: [],
            earthlinkMessages: [],
        };

        const newUserRecord = {
            name: username,
            data: newAstronautData,
            user: { ...data, type: 'astronaut' as UserType }
        };

        return new Promise((resolve, reject) => {
            const addRequest = store.add(newUserRecord);
            addRequest.onsuccess = () => resolve(newAstronautData);
            addRequest.onerror = () => reject(addRequest.error);
        });
    });
};

const logout = () => {
    localStorage.removeItem('maitri_jwt');
};

// --- ASTRONAUT DATA ---
const getAstronautData = async (): Promise<AstronautData> => {
    const user = getLoggedInUserFromToken();
    if (!user || user.type !== 'astronaut') {
        throw new Error("No astronaut data found for logged in user.");
    }
    return performTransaction('readonly', async (store) => {
        const userRecord = await readUser(user.username, store);
        if (!userRecord || !userRecord.data) {
             throw new Error("No astronaut data found for logged in user.");
        }
        return JSON.parse(JSON.stringify(userRecord.data));
    });
};

// --- MUTATION HELPER ---
const mutateAstronautData = <T>(
    mutation: (data: AstronautData) => T
): Promise<T> => {
    const user = getLoggedInUserFromToken();
    if (!user || user.type !== 'astronaut') throw new Error("User not found");

    return performTransaction('readwrite', async (store) => {
        const userRecord = await readUser(user.username, store);
        if (!userRecord || !userRecord.data) throw new Error("Astronaut data not found");
        
        const result = mutation(userRecord.data);
        
        return new Promise((resolve, reject) => {
            const updateRequest = store.put(userRecord);
            updateRequest.onsuccess = () => resolve(result);
            updateRequest.onerror = () => reject(updateRequest.error);
        });
    });
};


// --- SPECIFIC MUTATIONS ---
const addSymptomLog = (log: Omit<SymptomLog, 'id' | 'date'>): Promise<SymptomLog> => 
    mutateAstronautData(data => {
        const newLog = { ...log, id: `symp-${Date.now()}`, date: new Date().toISOString() };
        data.symptomLogs.push(newLog);
        return newLog;
    });

const addMediaToSymptomLog = (logId: string, mediaUrl: string, mediaType: 'photo' | 'video'): Promise<void> =>
    mutateAstronautData(data => {
        const log = data.symptomLogs.find(l => l.id === logId);
        if (log) {
            if (mediaType === 'photo') {
                log.photo = mediaUrl;
            } else {
                log.video = mediaUrl;
            }
        } else {
            console.warn(`Symptom log with id ${logId} not found.`);
        }
    });

const addCaptainLog = (log: Omit<CaptainLog, 'id' | 'date'>): Promise<CaptainLog> =>
    mutateAstronautData(data => {
        const newLog = { ...log, id: `cap-${Date.now()}`, date: new Date().toISOString() };
        data.captainLogs.push(newLog);
        return newLog;
    });

const addDailyCheckIn = (checkIn: { mood: Mood; sleep: SleepQuality }): Promise<DailyCheckInLog> =>
    mutateAstronautData(data => {
        const newLog = { ...checkIn, date: getLocalDateString(new Date()) };
        data.dailyCheckInLogs.push(newLog);
        return newLog;
    });

const updateMissionTasks = (newTasks: MissionTask[]): Promise<MissionTask[]> =>
    mutateAstronautData(data => {
        data.missionTasks = newTasks;
        return newTasks;
    });

const markEarthlinkMessageAsViewed = (messageId: string): Promise<void> =>
    mutateAstronautData(data => {
        const message = data.earthlinkMessages.find(m => m.id === messageId);
        if (message) {
            message.viewed = true;
        }
    });

// --- ADMIN ACTIONS ---
const getAllAstronauts = async (): Promise<AstronautData[]> => {
    return performTransaction('readonly', async (store) => {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const allUsers = request.result;
                const astronauts = allUsers
                    .filter(record => record.user.type === 'astronaut' && record.data)
                    .map(record => JSON.parse(JSON.stringify(record.data!)));
                resolve(astronauts);
            };
            request.onerror = () => reject(request.error);
        });
    });
};

const adminMutateAstronaut = <T>(
    username: string,
    mutation: (data: AstronautData) => T
): Promise<T> => {
    return performTransaction('readwrite', async (store) => {
        const userRecord = await readUser(username, store);
        if (!userRecord || !userRecord.data) throw new Error("Astronaut not found");
        
        const result = mutation(userRecord.data);
        
        return new Promise((resolve, reject) => {
            const updateRequest = store.put(userRecord);
            updateRequest.onsuccess = () => resolve(result);
            updateRequest.onerror = () => reject(updateRequest.error);
        });
    });
};


const addDoctorAdvice = (username: string, advice: Omit<DoctorAdvice, 'id' | 'date'>): Promise<DoctorAdvice> =>
    adminMutateAstronaut(username, data => {
        const newAdvice = { ...advice, id: `adv-${Date.now()}`, date: new Date().toISOString() };
        data.doctorAdvice.push(newAdvice);
        return newAdvice;
    });

const assignProcedure = (username: string, procedure: Omit<MissionProcedure, 'id'>): Promise<MissionProcedure> =>
    adminMutateAstronaut(username, data => {
        const newProc = { ...procedure, id: `proc-${Date.now()}`};
        data.procedures.push(newProc);
        return newProc;
    });

const assignMassProtocol = (username: string, protocol: Omit<MassProtocol, 'id'>): Promise<MassProtocol> =>
    adminMutateAstronaut(username, data => {
        const newProto = { ...protocol, id: `mass-${Date.now()}`};
        data.massProtocols.push(newProto);
        return newProto;
    });

const updateAstronautPhoto = (username: string, photoUrl: string): Promise<{ photoUrl: string }> =>
    adminMutateAstronaut(username, data => {
        data.photoUrl = photoUrl;
        return { photoUrl };
    });

const sendEarthlinkMessage = (username: string, message: Omit<EarthlinkMessage, 'id' | 'date' | 'viewed'>): Promise<EarthlinkMessage> =>
    adminMutateAstronaut(username, data => {
        const newMessage = { ...message, id: `earth-${Date.now()}`, date: new Date().toISOString(), viewed: false };
        data.earthlinkMessages.push(newMessage);
        return newMessage;
    });

// --- Exported Service Singleton ---
export const maitriService = {
    login, register, logout, getLoggedInUserFromToken, getAstronautData, addSymptomLog,
    addCaptainLog, addDailyCheckIn, updateMissionTasks, getAllAstronauts, addDoctorAdvice,
    assignProcedure, assignMassProtocol, updateAstronautPhoto,
    sendEarthlinkMessage, markEarthlinkMessageAsViewed, addMediaToSymptomLog,
};

// --- DB Service for synchronous Forgot Password flow ---
const getUserSecurityQuestion = async (name: string): Promise<string | null> => {
    return performTransaction('readonly', async (store) => {
        const user = await readUser(name, store);
        return user ? user.user.securityQuestion : null;
    });
};

const verifySecurityAnswer = async (name: string, answer: string): Promise<boolean> => {
     return performTransaction('readonly', async (store) => {
        const user = await readUser(name, store);
        return !!user && user.user.securityAnswer.toLowerCase() === answer.toLowerCase();
    });
};

const resetPassword = async (name: string, newPass: string): Promise<void> => {
    return performTransaction('readwrite', async (store) => {
        const userRecord = await readUser(name, store);
        if (userRecord) {
            userRecord.user.password = newPass;
            return new Promise((resolve, reject) => {
                 const updateRequest = store.put(userRecord);
                 updateRequest.onsuccess = () => resolve();
                 updateRequest.onerror = () => reject(updateRequest.error);
            });
        }
    });
};

export const dbService = {
    getUserSecurityQuestion, verifySecurityAnswer, resetPassword,
};
