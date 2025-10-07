
import React from 'react';
import GlassCard from './GlassCard';

interface EarthlinkStatusProps {
  hasNewMessage: boolean;
  onOpenMessage: () => void;
}

const EarthlinkStatus: React.FC<EarthlinkStatusProps> = ({ hasNewMessage, onOpenMessage }) => {
  return (
    <GlassCard className="p-8 flex flex-col justify-center items-center text-center">
        {!hasNewMessage ? (
            <>
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">Earthlink Status</h3>
                <p className="text-gray-500">No new messages from Earth.</p>
            </>
        ) : (
            <div className="animate-pulse">
                <h3 className="text-2xl font-bold mb-3 text-green-500 dark:text-green-400">Message Received</h3>
                <button onClick={onOpenMessage} className="px-6 py-2 bg-accent-cyan text-white font-bold rounded-lg hover:bg-cyan-500 transition-colors">
                    View Message
                </button>
            </div>
        )}
    </GlassCard>
  );
};

export default EarthlinkStatus;
