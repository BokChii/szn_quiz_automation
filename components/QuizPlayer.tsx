
import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onFinish: (score: number) => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ questions, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    setShowExplanation(true);
    if (idx === currentQuestion.correctIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedIdx(null);
      setShowExplanation(false);
    } else {
      onFinish(score);
    }
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">
            문제 {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-sm font-medium text-slate-400">
            진행률 {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">
        {currentQuestion.question}
      </h2>

      <div className="space-y-4">
        {currentQuestion.options.map((option, idx) => {
          let buttonClass = "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 text-lg font-medium ";
          if (selectedIdx === null) {
            buttonClass += "border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100";
          } else {
            if (idx === currentQuestion.correctIndex) {
              buttonClass += "border-green-500 bg-green-50 text-green-700";
            } else if (idx === selectedIdx) {
              buttonClass += "border-red-500 bg-red-50 text-red-700";
            } else {
              buttonClass += "border-slate-50 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={idx}
              disabled={selectedIdx !== null}
              onClick={() => handleSelect(idx)}
              className={buttonClass}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm shrink-0 border-2 ${
                  selectedIdx === null ? "border-slate-200" : (idx === currentQuestion.correctIndex ? "border-green-500" : "border-slate-100")
                }`}>
                  {idx + 1}
                </span>
                {option}
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2 duration-300">
          <p className="text-slate-700 leading-relaxed">
            <span className={`font-bold mr-2 ${selectedIdx === currentQuestion.correctIndex ? 'text-green-600' : 'text-red-600'}`}>
              {selectedIdx === currentQuestion.correctIndex ? '정답입니다!' : '아쉽네요!'}
            </span>
            <span className="text-indigo-600 font-bold">해설:</span> {currentQuestion.explanation}
          </p>
          <button
            onClick={nextQuestion}
            className="mt-6 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            {currentIndex === questions.length - 1 ? '결과 확인하기' : '다음 문제로'}
          </button>
        </div>
      )}
    </div>
  );
};
