import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        {/* App Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 dark:from-white dark:via-purple-200 dark:to-white drop-shadow-sm">
            CoPair
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-light tracking-wide">
            Your AI Pair Programmer for Interview Prep
          </p>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:ring-2 hover:ring-purple-500 hover:ring-offset-2 dark:hover:ring-offset-slate-900"
        >
          <span>Start Interview Prep</span>
          <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
      
      {/* Footer text */}
      <div className="absolute bottom-8 z-10 flex flex-col items-center gap-3">
        <div className="text-gray-600 dark:text-gray-300 font-medium">
          Built by{' '}
          <a 
            href="https://github.com/aakaashjois" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:underline hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-semibold"
          >
            @aakaashjois
          </a>{' '}
          and{' '}
          <a 
            href="https://github.com/sravan953" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 dark:text-purple-400 hover:underline hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-semibold"
          >
            @sravan953
          </a>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 transition-colors hover:bg-white/70 dark:hover:bg-black/30">
          <span>Powered by</span>
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
            Gemini
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

