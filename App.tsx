import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Screen, AstronautData, UserData, UserType, SymptomLog, CaptainLog, Mood, SleepQuality, DoctorAdvice, MissionProcedure, MassProtocol, DailyCheckInLog, MissionTask, ChatMessage } from './types';
import { ThemeContext, Theme } from './contexts/ThemeContext';
import { maitriService } from './services/databaseService';
import { getToken, removeToken } from './services/apiService';

// Screens
import HomeScreen from './screens/HomeScreen';
import GuardianScreen from './screens/GuardianScreen';
import CoPilotScreen from './screens/CoPilotScreen';
import StorytellerScreen from './screens/StorytellerScreen';
import RecreationScreen from './screens/RecreationScreen';
import ChatScreen from './screens/ChatScreen';
import AuthScreen from './screens/AuthScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

// Components
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import ProfileModal from './components/ProfileModal';
import TopRightControls from './components/TopRightControls';
import WorkoutTimer from './components/WorkoutTimer';
import VoiceAssistantModal from './components/VoiceAssistantModal';

// Hooks
import { useTTS } from './hooks/useTTS';

// Toast component for mission alerts and errors
const Toast: React.FC<{ message: string; show: boolean; onDismiss: () => void; type?: 'alert' | 'error' }> = ({ message, show, onDismiss, type = 'alert' }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onDismiss, 5000);
            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-accent-cyan';

    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-lg shadow-2xl transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${bgColor} text-white font-semibold`}>
            {message}
        </div>
    );
};


const App: React.FC = () => {
    // App State
    const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Home);
    const [screenContext, setScreenContext] = useState<any>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null means initial check
    const [userType, setUserType] = useState<UserType | null>(null);
    const [astronautData, setAstronautData] = useState<AstronautData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [theme, setTheme] = useState<Theme>('dark');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [accentColor, setAccentColor] = useState('#06b6d4');
    const [activeMassProtocol, setActiveMassProtocol] = useState<MassProtocol | null>(null);
    const [isWorkoutTimerOpen, setIsWorkoutTimerOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showError, setShowError] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isSleepSessionActive, setIsSleepSessionActive] = useState(false);
    const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

    // Settings State
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [maitriVoice, setMaitriVoice] = useState('Zephyr'); // For Gemini Voice Assistant and all other TTS

    // Hooks
    const navigateTo = useCallback((screen: Screen, context: any = null) => {
        setCurrentScreen(screen);
        setScreenContext(context);
        setIsVoiceAssistantOpen(false); // Close assistant on navigation
    }, []);
    const { speak } = useTTS();

    const displayError = (message: string) => {
        setErrorMessage(message);
        setShowError(true);
    }

    const handleLogout = useCallback(() => {
        maitriService.logout();
        setIsAuthenticated(false);
        setUserType(null);
        setAstronautData(null);
        setCurrentScreen(Screen.Home);
    }, []);

    const refreshAstronautData = useCallback(async () => {
        // Don't set loading for background refreshes
        // setIsLoading(true);
        try {
            const data = await maitriService.getAstronautData();
            setAstronautData(data);
        } catch (error) {
            console.error("Failed to refresh astronaut data:", error);
            if ((error as Error).message.includes("No astronaut data")) {
                 displayError("No astronaut data found for logged in user.");
            } else {
                displayError("Could not sync with mission control. Please check connection.");
            }
            // Don't auto-logout on a failed background refresh
            // handleLogout();
        } finally {
            // setIsLoading(false);
        }
    }, []);
    
    // Add polling for data refresh to simulate real-time updates
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (isAuthenticated && userType === 'astronaut') {
                refreshAstronautData();
            }
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(intervalId);
    }, [isAuthenticated, userType, refreshAstronautData]);

    // Initial Auth Check
    useEffect(() => {
        const checkAuthStatus = async () => {
            const userSession = maitriService.getLoggedInUserFromToken();
            if (userSession) {
                setIsAuthenticated(true);
                setUserType(userSession.type);
                if (userSession.type === 'astronaut') {
                    setIsLoading(true);
                    await refreshAstronautData();
                    setIsLoading(false);
                } else {
                    setIsLoading(false); // Admin doesn't need astronaut data
                }
            } else {
                setIsAuthenticated(false);
                setIsLoading(false);
            }
        };
        checkAuthStatus();
    }, [refreshAstronautData]);


    // Theming Effect
    useEffect(() => {
        document.documentElement.style.setProperty('--accent-color', accentColor);
        document.documentElement.classList.remove('light', 'dark', 'circadian');
        document.documentElement.classList.add(theme);
        if (theme === 'circadian') {
            document.documentElement.classList.add('dark');
        }
    }, [theme, accentColor]);

    // Global keyboard listener for Voice Assistant
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'm' && !isVoiceAssistantOpen) {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName.toLowerCase() === 'input' || activeEl.tagName.toLowerCase() === 'textarea')) {
                return; // Don't open if user is typing
            }
            event.preventDefault();
            setIsVoiceAssistantOpen(true);
        } else if (event.key === 'Escape' && isVoiceAssistantOpen) {
            event.preventDefault();
            setIsVoiceAssistantOpen(false);
        }
    }, [isVoiceAssistantOpen]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
    
    const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : current === 'light' ? 'circadian' : 'dark');

    // Mission Alert Logic
    useEffect(() => {
        if (!astronautData) return;
    }, [astronautData]);


    // Handlers
    const handleLogin = async (name: string, pass: string, type: UserType): Promise<boolean> => {
        setIsLoading(true);
        try {
            await maitriService.login(name, pass, type);
            setIsAuthenticated(true);
            setUserType(type);
            if (type === 'astronaut') {
                await refreshAstronautData();
            }
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            displayError((error as Error).message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRegister = async (name: string, data: UserData) => {
       try {
            const newAstronaut = await maitriService.register(name, data);
            return { success: true, registeredName: newAstronaut.name, registeredPassword: data.password ?? '' };
        } catch (error) {
            console.error("Registration failed:", error);
            return { success: false, error: (error as Error).message };
        }
    };
    
    const handleDailyCheckIn = async (mood: Mood, sleep: SleepQuality) => {
      try {
        await maitriService.addDailyCheckIn({ mood, sleep });
        refreshAstronautData();
      } catch (error) { displayError("Failed to log daily check-in."); }
    };
    
    const handleSymptomLog = async (log: Omit<SymptomLog, 'id' | 'date'>) => {
        try {
            await maitriService.addSymptomLog(log);
            await refreshAstronautData();
            // We can add a success alert here if needed
        } catch (error) { displayError("Failed to log symptom."); }
    };

    const handleCaptainLog = async (log: Omit<CaptainLog, 'id' | 'date'>) => {
        try {
            await maitriService.addCaptainLog(log);
            await refreshAstronautData();
        } catch(error) { displayError("Failed to save captain's log."); }
    };

    const handleTasksUpdate = async (newTasks: MissionTask[]) => {
        try {
            await maitriService.updateMissionTasks(newTasks);
            await refreshAstronautData();
        } catch (error) { displayError("Failed to update mission tasks."); }
    };
    
    const handleAddTask = async (task: Omit<MissionTask, 'id' | 'completed'>) => {
        if (!astronautData) return;
        const newTask: MissionTask = { ...task, id: Date.now(), completed: false };
        const sortedTasks = [...astronautData.missionTasks, newTask].sort((a, b) => a.time.localeCompare(b.time));
        await handleTasksUpdate(sortedTasks);
    };

    const handleTaskComplete = async (taskId: number) => {
        if (!astronautData) return;
        let taskToComplete: MissionTask | undefined;
        const newTasks = astronautData.missionTasks.map(task => {
            if (task.id === taskId) {
                const updatedTask = { ...task, completed: !task.completed };
                if (updatedTask.completed) taskToComplete = updatedTask;
                return updatedTask;
            }
            return task;
        });
        await handleTasksUpdate(newTasks);
        if (taskToComplete) {
            navigateTo(Screen.Chat, `Captain, I see you've completed the '${taskToComplete.name}'. I need to ask a few questions for the log. First, how did the procedure go?`);
        }
    };
    
    const handleMassProtocolClick = (protocol: MassProtocol) => {
        setActiveMassProtocol(protocol);
        setIsWorkoutTimerOpen(true);
    };

    const handleToggleSleepSession = () => {
        setIsSleepSessionActive(prev => {
            const nextState = !prev;
            setTheme(nextState ? 'circadian' : 'dark');
            if (nextState) {
                speak("Beginning sleep session.", maitriVoice);
            } else {
                speak("Sleep session ended.", maitriVoice);
            }
            return nextState;
        });
    };
    
    const handleSensoryColorChange = useCallback((color: string) => {
        setAccentColor(color);
    }, []);

    const handleOpenCameraRequest = (mediaType: 'photo' | 'video') => {
        navigateTo(Screen.Guardian, { openCameraForMostRecentLog: mediaType });
    };

    // Render Logic
    if (isLoading || isAuthenticated === null) {
        return <div className="h-screen w-screen flex items-center justify-center bg-space-dark text-white">Loading MAITRI...</div>;
    }

    if (!isAuthenticated) {
        return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
    }
    
    if (userType === 'admin') {
        return <AdminDashboardScreen onLogout={handleLogout} />;
    }
    
    if (!astronautData) {
        return <div className="h-screen w-screen flex items-center justify-center bg-space-dark text-white">Error: Could not load astronaut data.</div>;
    }

    const renderScreen = () => {
        const commonProps = { onClose: () => navigateTo(Screen.Home), navigateTo, screenContext };
        switch (currentScreen) {
            case Screen.Guardian: return <GuardianScreen {...commonProps} symptomLogs={astronautData.symptomLogs} doctorAdvice={astronautData.doctorAdvice} dailyLogs={astronautData.dailyCheckInLogs} onSymptomLog={handleSymptomLog} onToggleSleepSession={handleToggleSleepSession} isSleepSessionActive={isSleepSessionActive} massProtocols={astronautData.massProtocols} onMassProtocolClick={handleMassProtocolClick} onDataRefresh={refreshAstronautData} />;
            case Screen.CoPilot: return <CoPilotScreen {...commonProps} procedures={astronautData.procedures} tasks={astronautData.missionTasks} onTasksUpdate={handleTasksUpdate} onTaskComplete={handleTaskComplete} isTtsEnabled={isTtsEnabled} ttsVoice={maitriVoice} />;
            case Screen.Storyteller: return <StorytellerScreen {...commonProps} onSaveLog={handleCaptainLog} pastLogs={astronautData.captainLogs} />;
            case Screen.Recreation: return <RecreationScreen {...commonProps} />;
            case Screen.Chat: return <ChatScreen {...commonProps} astronautName={astronautData.name} initialMessage={screenContext} isTtsEnabled={isTtsEnabled} ttsVoice={maitriVoice} onSensoryColorChange={handleSensoryColorChange} onSymptomLog={handleSymptomLog} onAddTask={handleAddTask} />;
            case Screen.Home:
            default:
                return <HomeScreen navigateTo={navigateTo} astronautData={astronautData} onDailyCheckIn={handleDailyCheckIn} missionTasks={astronautData.missionTasks} onDataRefresh={refreshAstronautData} />;
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div className={`flex h-screen overflow-hidden text-gray-800 dark:text-gray-200 font-sans transition-colors duration-500`}>
                <Sidebar currentScreen={currentScreen} navigateTo={navigateTo} />
                <div className="flex-1 flex flex-col relative bg-white/50 dark:bg-black/20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23a0aec0\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}>
                    <TopRightControls onOpenSettings={() => setIsSettingsOpen(true)} onOpenProfile={() => setIsProfileOpen(true)} onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)} />
                    <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                        {renderScreen()}
                    </main>
                </div>

                {/* Modals & Overlays */}
                <Toast message={alertMessage} show={showAlert} onDismiss={() => setShowAlert(false)} />
                <Toast message={errorMessage} show={showError} onDismiss={() => setShowError(false)} type="error" />
                <SettingsPanel 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)} 
                    accentColor={accentColor} 
                    onAccentColorChange={setAccentColor}
                    onLogout={handleLogout}
                    isTtsEnabled={isTtsEnabled}
                    onTtsToggle={() => setIsTtsEnabled(p => !p)}
                    maitriVoice={maitriVoice}
                    onMaitriVoiceChange={setMaitriVoice}
                />
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} name={astronautData.name} photoUrl={astronautData.photoUrl} designation={astronautData.designation} />
                <WorkoutTimer 
                    isOpen={isWorkoutTimerOpen} 
                    onClose={() => setIsWorkoutTimerOpen(false)} 
                    protocol={activeMassProtocol}
                    isTtsEnabled={isTtsEnabled}
                    ttsVoice={maitriVoice}
                    speak={speak}
                />
                <VoiceAssistantModal 
                    isOpen={isVoiceAssistantOpen} 
                    onClose={() => setIsVoiceAssistantOpen(false)} 
                    navigateTo={navigateTo}
                    onSymptomLog={handleSymptomLog}
                    onAddTask={handleAddTask}
                    onOpenCameraRequest={handleOpenCameraRequest}
                    voiceName={maitriVoice}
                />
            </div>
        </ThemeContext.Provider>
    );
};

export default App;