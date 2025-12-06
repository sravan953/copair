import React from 'react';
import { QuestionCompletion, AnalysisResult } from '../types';
import { Check, Trophy, BookOpen, Clock, TrendingUp } from 'lucide-react';

interface SummaryPageProps {
  completions: QuestionCompletion[];
  weakAreas: AnalysisResult['weakAreas'];
  onBack: () => void;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ completions, weakAreas, onBack }) => {
  const completedTopics = completions
    .filter(c => c.completed)
    .map(c => c.topic);

  const uniqueTopics = Array.from(new Set(completedTopics));

  const totalTimeSpent = completions
    .filter(c => c.completedAt)
    .reduce((acc, c) => {
      // Estimate time - you might want to track actual time spent
      return acc + 5; // 5 minutes per question estimate
    }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full mb-4 shadow-lg">
              <Trophy size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              Congratulations! 🎉
            </h1>
            <p className="text-xl text-gray-600 dark:text-slate-400">
              You've completed all practice questions
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Topics Mastered</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{uniqueTopics.length}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Different concepts practiced</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <Check className="text-green-600 dark:text-green-400" size={24} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Questions Solved</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{completions.filter(c => c.completed).length}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">All test cases passed</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200">Progress</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">100%</p>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Complete mastery achieved</p>
          </div>
        </div>

        {/* Topics Learned */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-slate-800 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
            Topics You've Mastered
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {uniqueTopics.map((topic, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3"
              >
                <Check size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-900 dark:text-slate-200 font-medium">{topic}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Journey */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Trophy size={24} className="text-yellow-600 dark:text-yellow-400" />
            Your Learning Journey
          </h2>
          <div className="space-y-4">
            {weakAreas.map((area, index) => {
              const relatedCompletions = completions.filter(c =>
                c.completed && c.topic.toLowerCase().includes(area.topic.toLowerCase())
              );
              return (
                <div
                  key={index}
                  className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-slate-200 mb-1">
                    {area.topic}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    Started with {area.incorrectCount} incorrect answers, now mastered through practice!
                  </p>
                  {relatedCompletions.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ {relatedCompletions.length} question{relatedCompletions.length > 1 ? 's' : ''} completed
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
