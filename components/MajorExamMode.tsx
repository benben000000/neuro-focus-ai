import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Save, Loader2 } from 'lucide-react';
import { FileAttachment, QuizQuestion } from '../types';
import { generateExam } from '../services/gemini';
import { Button } from './ui/Button';
import { playSuccess, playError } from '../services/sound';

interface MajorExamModeProps {
    attachments: FileAttachment[];
    onClose: () => void;
}

export const MajorExamMode: React.FC<MajorExamModeProps> = ({ attachments, onClose }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [score, setScore] = useState(0);

    useEffect(() => {
        const loadExam = async () => {
            setIsLoading(true);
            const q = await generateExam(attachments);
            setQuestions(q);
            setIsLoading(false);
        };
        loadExam();
    }, [attachments]);

    useEffect(() => {
        if (isLoading || isSubmitted) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isLoading, isSubmitted]);

    const handleOptionSelect = (qIndex: number, optIndex: number) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
    };

    const handleSubmit = () => {
        let correctCount = 0;
        questions.forEach((q, i) => {
            if (answers[i] === q.correctIndex) correctCount++;
        });
        setScore(correctCount);
        setIsSubmitted(true);
        if (correctCount / questions.length > 0.7) playSuccess();
        else playError();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col items-center justify-center">
                <Loader2 size={48} className="animate-spin text-indigo-600 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Generating Major Exam...</h2>
                <p className="text-slate-500">Analyzing documents and crafting questions.</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Generation Failed</h2>
                <p className="text-slate-500 mb-6">Could not generate an exam from these documents. Try adding more text content.</p>
                <Button onClick={onClose}>Close</Button>
            </div>
        );
    }

    const currentQ = questions[currentQIndex];

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={onClose} icon={<ArrowLeft size={20} />}>Exit</Button>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden md:block">Major Exam Mode</h1>
                </div>
                <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-200'}`}>
                    <Clock size={24} />
                    {formatTime(timeLeft)}
                </div>
                {!isSubmitted && (
                    <Button variant="primary" onClick={handleSubmit} icon={<Save size={18} />}>Submit Exam</Button>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Sidebar / Question Navigator */}
                <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
                    <h3 className="font-bold text-slate-500 text-xs uppercase mb-4">Questions</h3>
                    <div className="grid grid-cols-5 md:grid-cols-3 gap-2">
                        {questions.map((_, i) => {
                            const isAnswered = answers[i] !== undefined;
                            const isCorrect = isSubmitted && answers[i] === questions[i].correctIndex;
                            const isWrong = isSubmitted && answers[i] !== questions[i].correctIndex;

                            let bgClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                            if (i === currentQIndex) bgClass = "ring-2 ring-indigo-500 bg-white dark:bg-slate-700";
                            else if (isSubmitted) {
                                if (isCorrect) bgClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                                else if (isWrong) bgClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                            } else if (isAnswered) {
                                bgClass = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => setCurrentQIndex(i)}
                                    className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-all ${bgClass}`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Question Area */}
                <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Question {currentQIndex + 1}</span>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2 leading-relaxed">{currentQ.question}</h2>
                        </div>

                        <div className="space-y-4">
                            {currentQ.options.map((opt, idx) => {
                                const isSelected = answers[currentQIndex] === idx;
                                const isCorrect = idx === currentQ.correctIndex;
                                const showCorrect = isSubmitted && isCorrect;
                                const showWrong = isSubmitted && isSelected && !isCorrect;

                                let borderClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-400";
                                let bgClass = "bg-white dark:bg-slate-800";

                                if (isSubmitted) {
                                    if (showCorrect) { borderClass = "border-green-500"; bgClass = "bg-green-50 dark:bg-green-900/20"; }
                                    else if (showWrong) { borderClass = "border-red-500"; bgClass = "bg-red-50 dark:bg-red-900/20"; }
                                    else if (isSelected) { borderClass = "border-slate-300"; opacity: 0.5; }
                                } else if (isSelected) {
                                    borderClass = "border-indigo-600";
                                    bgClass = "bg-indigo-50 dark:bg-indigo-900/20";
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionSelect(currentQIndex, idx)}
                                        disabled={isSubmitted}
                                        className={`w-full text-left p-5 rounded-xl border-2 transition-all flex justify-between items-center ${borderClass} ${bgClass}`}
                                    >
                                        <span className="text-lg text-slate-800 dark:text-slate-200">{opt}</span>
                                        {showCorrect && <CheckCircle2 className="text-green-500" />}
                                        {showWrong && <AlertCircle className="text-red-500" />}
                                    </button>
                                );
                            })}
                        </div>

                        {isSubmitted && (
                            <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-800 rounded-xl border-l-4 border-indigo-500 animate-in fade-in">
                                <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">Explanation</h4>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                            </div>
                        )}

                        <div className="mt-10 flex justify-between">
                            <Button
                                variant="secondary"
                                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQIndex === 0}
                                icon={<ChevronLeft size={20} />}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                disabled={currentQIndex === questions.length - 1}
                                icon={<ChevronRight size={20} />}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Modal Overlay */}
            {isSubmitted && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center pointer-events-auto animate-in zoom-in-95">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Exam Completed!</h2>
                        <div className="text-6xl font-black text-indigo-600 dark:text-indigo-400 my-6">
                            {Math.round((score / questions.length) * 100)}%
                        </div>
                        <p className="text-slate-500 mb-8">
                            You got {score} out of {questions.length} questions correct.
                            {score / questions.length > 0.7 ? " Great job!" : " Keep studying!"}
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button onClick={onClose} variant="secondary">Close Exam</Button>
                            <Button onClick={() => { setIsSubmitted(false); /* Ideally close modal but keep state to review */ document.querySelector('.absolute.inset-0')?.remove(); }} variant="primary">Review Answers</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
