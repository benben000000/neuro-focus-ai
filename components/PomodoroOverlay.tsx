import React from 'react';
import { usePomodoro } from '../contexts/PomodoroContext';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';

export function PomodoroOverlay() {
    const { timeLeft, isActive, mode, toggleTimer, resetTimer, setMode, formatTime } = usePomodoro();

    if (mode === 'work' && !isActive && timeLeft === 25 * 60) {
        // Minimized or hidden state if not active? 
        // For now, let's keep it visible but small, or maybe just a small floating button.
        // Let's make it a small floating card in the bottom right.
    }

    const getBgColor = () => {
        switch (mode) {
            case 'work': return 'bg-indigo-600';
            case 'shortBreak': return 'bg-emerald-500';
            case 'longBreak': return 'bg-blue-500';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            <div className={`p-4 rounded-2xl shadow-xl text-white transition-colors duration-300 ${getBgColor()} backdrop-blur-lg bg-opacity-90`}>
                <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setMode('work')}
                            className={`p-1.5 rounded-lg transition-colors ${mode === 'work' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                            title="Work"
                        >
                            <Brain size={16} />
                        </button>
                        <button
                            onClick={() => setMode('shortBreak')}
                            className={`p-1.5 rounded-lg transition-colors ${mode === 'shortBreak' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                            title="Short Break"
                        >
                            <Coffee size={16} />
                        </button>
                    </div>
                    <span className="font-mono text-2xl font-bold tabular-nums tracking-wider">
                        {formatTime(timeLeft)}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium opacity-90 uppercase tracking-wider">
                        {mode === 'work' ? 'Focus Time' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTimer}
                            className="p-2 bg-white text-indigo-900 rounded-full hover:scale-105 transition-transform active:scale-95 shadow-sm"
                        >
                            {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                        </button>
                        <button
                            onClick={resetTimer}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
