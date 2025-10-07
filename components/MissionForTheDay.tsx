import React from 'react';
import { MissionTask } from '../types';
import GlassCard from './GlassCard';

interface MissionForTheDayProps {
  tasks: MissionTask[];
}

const MissionForTheDay: React.FC<MissionForTheDayProps> = ({ tasks }) => {
  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Mission for the Day</h2>
      <ul className="space-y-3 overflow-y-auto pr-2 scrollbar-thin flex-grow">
        {tasks.length > 0 ? (
          tasks.map(task => (
            <li key={task.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50">
              <span className="font-mono text-accent-cyan">{task.time}</span>
              <span className={`flex-grow text-gray-700 dark:text-gray-300 ${task.completed ? 'line-through' : ''}`}>
                {task.name}
              </span>
            </li>
          ))
        ) : (
          <li className="text-gray-500 italic">No tasks scheduled for today.</li>
        )}
      </ul>
    </GlassCard>
  );
};

export default MissionForTheDay;
