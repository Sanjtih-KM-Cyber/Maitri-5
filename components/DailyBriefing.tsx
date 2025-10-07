import React from 'react';
import GlassCard from './GlassCard';
import { Mood, SleepQuality } from '../types';

interface DailyBriefingProps {
    astronautName: string;
    mood: Mood;
    sleep: SleepQuality;
    lastSymptom?: string | null;
}

const DailyBriefing: React.FC<DailyBriefingProps> = ({ astronautName, mood, sleep, lastSymptom }) => {

    const generateBriefing = () => {
        const currentHour = new Date().getHours();
        let timeOfDayGreeting = 'Good morning';
        if (currentHour >= 12 && currentHour < 18) {
            timeOfDayGreeting = 'Good afternoon';
        } else if (currentHour >= 18) {
            timeOfDayGreeting = 'Good evening';
        }

        let greeting = `${timeOfDayGreeting}, Captain ${astronautName}. `;
        greeting += `I see you're feeling ${mood.toLowerCase()} today after getting ${sleep.toLowerCase()}. `;

        if(lastSymptom) {
            greeting += `I've noted the last symptom you logged was a ${lastSymptom}. Please let me know if it persists. `;
        } else {
            greeting += `There were no new symptoms logged yesterday, which is great to see. `;
        }

        greeting += `Let's make today a successful day. Your mission cadence is available in the Co-Pilot module.`;

        return greeting;
    }

    return (
        <GlassCard className="p-8 text-gray-800 dark:text-white animate-fade-in">
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white capitalize">
                Daily Briefing for {astronautName}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
                {generateBriefing()}
            </p>
        </GlassCard>
    );
};

export default DailyBriefing;