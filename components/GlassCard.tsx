
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-gray-200/30 dark:bg-slate-500/10 backdrop-blur-lg rounded-2xl border border-gray-300/50 dark:border-slate-500/20 shadow-lg transition-all duration-300 hover:border-accent-cyan ${onClick ? 'cursor-pointer hover:shadow-cyan-500/20' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
