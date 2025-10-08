import React, { useState } from 'react';
import { Screen, AstronautData, Mood, SleepQuality, MissionTask, EarthlinkMessage } from '../types.ts';
import DailyBriefing from '../components/DailyBriefing.tsx';
import EarthlinkStatus from '../components/EarthlinkStatus.tsx';
import DailyCheckIn from '../components/DailyCheckIn.tsx';
import EarthlinkModal from '../components/EarthlinkModal.tsx';
import GlassCard from '../components/GlassCard.tsx';
import MissionForTheDay from '../components/MissionForTheDay.tsx';

interface HomeScreenProps {
  navigateTo: (screen: Screen, context?: any) => void;
  astronautData: AstronautData;
  onDailyCheckIn: (mood: Mood, sleep: SleepQuality) => void;
  missionTasks: MissionTask[];
  onDataRefresh: () => void;
}

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigateTo, astronautData, onDailyCheckIn, missionTasks, onDataRefresh }) => {
    const [isEarthlinkModalOpen, setIsEarthlinkModalOpen] = useState(false);
    const [activeMessage, setActiveMessage] = useState<EarthlinkMessage | null>(null);

    const today = getLocalDateString(new Date());
    const hasCheckedInToday = astronautData.dailyCheckInLogs.some(log => log.date === today);
    const lastCheckIn = astronautData.dailyCheckInLogs[astronautData.dailyCheckInLogs.length - 1];

    const unreadMessages = astronautData.earthlinkMessages.filter(m => !m.viewed);
    const hasNewMessage = unreadMessages.length > 0;

    const handleOpenMessage = () => {
        const latestUnread = unreadMessages.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (latestUnread) {
            setActiveMessage(latestUnread);
            setIsEarthlinkModalOpen(true);
        }
    };

    const CoreModuleButton: React.FC<{
        title: string;
        description: string;
        onClick: () => void;
        icon: React.ReactNode;
        screen: Screen;
    }> = ({ title, description, onClick, icon, screen }) => (
        <GlassCard onClick={onClick} className="p-6 text-center group flex flex-col items-center justify-center">
            <div className="mb-3 text-accent-cyan">{icon}</div>
            <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-white group-hover:text-accent-cyan transition-colors">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </GlassCard>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {!hasCheckedInToday ? (
                <DailyCheckIn
                    isOpen={true}
                    onClose={() => {}} // Cannot be closed without submitting
                    onSubmit={onDailyCheckIn}
                />
            ) : (
                <DailyBriefing
                    astronautName={astronautData.name}
                    mood={lastCheckIn.mood}
                    sleep={lastCheckIn.sleep}
                    lastSymptom={astronautData.symptomLogs[astronautData.symptomLogs.length - 1]?.symptom}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: 'calc(100vh - 26rem)'}}>
                {/* Left Column: Chat with MAITRI */}
                <GlassCard 
                    onClick={() => navigateTo(Screen.Chat)}
                    className="p-8 flex flex-col items-center justify-center text-center group transition-all duration-300 hover:scale-[1.02]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white group-hover:text-accent-cyan transition-colors">
                        Chat with MAITRI
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 max-w-xs">
                        Open a direct-line communication channel for any questions or assistance.
                    </p>
                </GlassCard>

                {/* Right Column: Mission & Earthlink */}
                <div className="flex flex-col gap-6">
                    <div className="flex-grow">
                        <MissionForTheDay tasks={missionTasks} />
                    </div>
                    <EarthlinkStatus hasNewMessage={hasNewMessage} onOpenMessage={handleOpenMessage} />
                </div>
            </div>
            
            {/* Bottom Section: Core Modules */}
            <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">Core Modules</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CoreModuleButton
                        screen={Screen.Guardian}
                        title="Guardian"
                        description="Monitor health & log symptoms."
                        onClick={() => navigateTo(Screen.Guardian)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                    />
                    <CoreModuleButton
                        screen={Screen.CoPilot}
                        title="Co-Pilot"
                        description="Manage mission tasks & procedures."
                        onClick={() => navigateTo(Screen.CoPilot)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    />
                    <CoreModuleButton
                        screen={Screen.Storyteller}
                        title="Storyteller"
                        description="Record captain's logs & reflections."
                        onClick={() => navigateTo(Screen.Storyteller)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    />
                     <CoreModuleButton
                        screen={Screen.Recreation}
                        title="Recreation"
                        description="Engage in creative and leisure activities."
                        onClick={() => navigateTo(Screen.Recreation)}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                </div>
            </GlassCard>

            <EarthlinkModal isOpen={isEarthlinkModalOpen} onClose={() => setIsEarthlinkModalOpen(false)} message={activeMessage} onMessageViewed={onDataRefresh} />
        </div>
    );
};

export default HomeScreen;