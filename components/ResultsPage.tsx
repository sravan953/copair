import React from 'react';
import { AnalysisResult } from '../types';

interface ResultsPageProps {
  result: AnalysisResult;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ result }) => {
  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Overall Score Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Overall Performance</h2>
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-4xl font-bold ${getScoreColor(result.overallScore.percentage)}`}>
                {result.overallScore.percentage}%
              </span>
              <span className="text-gray-600 text-lg">
                ({result.overallScore.correct}/{result.overallScore.total} correct)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  result.overallScore.percentage >= 80
                    ? 'bg-green-500'
                    : result.overallScore.percentage >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${result.overallScore.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {result.summary && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Summary</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result.summary}</p>
        </div>
      )}

      {/* Weak Areas Section */}
      {result.weakAreas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Areas for Improvement</h2>
          <div className="space-y-4">
            {result.weakAreas.map((area, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-5 ${getSeverityColor(area.severity)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{area.topic}</h3>
                    <p className="text-sm opacity-80">
                      {area.incorrectCount} incorrect out of {area.totalQuestions} questions
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(area.severity)}`}>
                    {area.severity.toUpperCase()}
                  </span>
                </div>
                
                {area.commonMistakes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-sm">Common Mistakes:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm opacity-90">
                      {area.commonMistakes.map((mistake, idx) => (
                        <li key={idx}>{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {area.recommendations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-sm">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm opacity-90">
                      {area.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths Section */}
      {result.strengths.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Strengths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.strengths.map((strength, index) => (
              <div
                key={index}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <h3 className="text-lg font-semibold text-green-900 mb-1">{strength.topic}</h3>
                <p className="text-sm text-green-700">
                  {strength.correctCount} correct out of {strength.totalQuestions} questions
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Recommendations Section */}
      {result.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Study Recommendations</h2>
          <div className="space-y-4">
            {result.recommendations.map((rec, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-4 py-2">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`font-semibold text-sm ${getPriorityColor(rec.priority)}`}>
                    {rec.priority.toUpperCase()} PRIORITY
                  </span>
                </div>
                <p className="text-gray-900 font-medium mb-1">{rec.action}</p>
                {rec.reason && (
                  <p className="text-gray-600 text-sm">{rec.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;

