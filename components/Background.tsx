import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      
      {/* Animated swirls */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-200/40 dark:bg-purple-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-200/40 dark:bg-blue-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      <div className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-pink-200/40 dark:bg-pink-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
    </div>
  );
};

export default Background;

