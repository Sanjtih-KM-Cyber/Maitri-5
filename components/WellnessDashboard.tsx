
import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { DailyCheckInLog, SymptomLog, Mood } from '../types';
import { subDays, format, isWithinInterval, eachDayOfInterval, parseISO } from 'date-fns';

interface WellnessDashboardProps {
    dailyLogs: DailyCheckInLog[];
    symptomLogs: SymptomLog[];
}

const moodColors: { [key in Mood]: string } = {
    Excellent: 'bg-green-500',
    Good: 'bg-cyan-500',
    Okay: 'bg-yellow-500',
    Tired: 'bg-purple-500',
    Stressed: 'bg-red-500',
};

const WellnessDashboard: React.FC<WellnessDashboardProps> = ({ dailyLogs, symptomLogs }) => {
    const [days, setDays] = useState(7);
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    const filteredLogs = dailyLogs.filter(log => 
        isWithinInterval(parseISO(log.date), { start: startDate, end: endDate })
    );

    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    const dataByDate = dateRange.map(date => {
        const dateString = format(date, 'yyyy-MM-dd');
        const logsForDay = filteredLogs.filter(log => log.date === dateString);
        return {
            date: format(date, 'MMM d'),
            logs: logsForDay,
        };
    });
    
    const calendarDays = Array.from({ length: 35 }, (_, i) => subDays(endDate, 34 - i));
    
    return (
        <GlassCard className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Wellness Dashboard</h2>
                <div className="flex space-x-1 p-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg">
                    <button onClick={() => setDays(7)} className={`px-3 py-1 text-sm rounded-md ${days === 7 ? 'bg-white dark:bg-gray-700 shadow' : ''}`}>7D</button>
                    <button onClick={() => setDays(30)} className={`px-3 py-1 text-sm rounded-md ${days === 30 ? 'bg-white dark:bg-gray-700 shadow' : ''}`}>30D</button>
                </div>
            </div>
            
            <div className="flex-grow">
                <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Mood Overview ({days} Days)</h3>
                <div className="flex justify-between items-end h-32 bg-gray-200/30 dark:bg-gray-800/30 rounded-lg p-2 space-x-1">
                    {dataByDate.map(({ date, logs }) => (
                        <div key={date} className="w-full h-full flex flex-col-reverse items-center group relative">
                           {logs.length > 0 ? (
                                logs.map((log, index) => (
                                    <div key={index} className={`w-full ${moodColors[log.mood]}`} style={{ height: `${100 / logs.length}%` }}></div>
                                ))
                           ) : (
                                <div className="w-full h-full bg-transparent"></div>
                           )}
                           <span className="absolute -bottom-5 text-xs text-gray-500 dark:text-gray-400">{date}</span>
                           <div className="absolute bottom-full mb-2 w-max p-2 bg-black/70 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {logs.length > 0 ? logs.map(l => l.mood).join(', ') : 'No data'}
                           </div>
                        </div>
                    ))}
                </div>
            </div>
            
             <div className="mt-6">
                <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Symptom Calendar</h3>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                     {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day} className="font-bold text-gray-500">{day}</div>)}
                     {calendarDays.map(day => {
                        const dateString = format(day, 'yyyy-MM-dd');
                        const hasSymptom = symptomLogs.some(log => format(parseISO(log.date), 'yyyy-MM-dd') === dateString);
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        return (
                            <div key={dateString} className={`w-full aspect-square rounded-full flex items-center justify-center ${isToday ? 'border-2 border-accent-cyan' : ''} ${hasSymptom ? 'bg-red-500/50' : 'bg-gray-200/50 dark:bg-gray-700/50'}`}>
                                {format(day, 'd')}
                            </div>
                        )
                     })}
                </div>
            </div>

        </GlassCard>
    );
};

export default WellnessDashboard;