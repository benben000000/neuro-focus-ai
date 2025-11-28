import React, { useState } from 'react';
import { ActiveRecallQuestionSummary } from '../../types';
import { ChevronLeft, ChevronRight, RotateCw, Eye, EyeOff, Check, X } from 'lucide-react';

interface ActiveRecallDeckProps {
    questions: ActiveRecallQuestionSummary[];
}

export const ActiveRecallDeck: React.FC<ActiveRecallDeckProps> = ({ questions }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const currentQuestion = questions[currentIndex];

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % questions.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            case 'Hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="relative perspective-1000 h-[300px] w-full">
                <div
                    className={`
            relative w-full h-full transition-all duration-500 transform preserve-3d cursor-pointer
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden">
                        <div className="h-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                            <span className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                                {currentQuestion.difficulty}
                            </span>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                                {currentQuestion.question}
                            </h3>
                            <p className="text-sm text-slate-400 mt-4 flex items-center gap-2">
                                <RotateCw size={14} /> Click to reveal answer
                            </p>
                        </div>
                    </div>

                    {/* Back */}
                    <div className="absolute w-full h-full backface-hidden rotate-y-180">
                        <div className="h-full bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                            <h4 className="text-sm uppercase tracking-wider text-indigo-500 font-semibold mb-4">Answer</h4>
                            <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                                {currentQuestion.expectedAnswer}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={handlePrev}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="text-sm font-medium text-slate-500">
                    {currentIndex + 1} / {questions.length}
                </div>

                <button
                    onClick={handleNext}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};
