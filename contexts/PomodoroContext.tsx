import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroContextType {
    timeLeft: number;
    isActive: boolean;
    mode: TimerMode;
    toggleTimer: () => void;
    resetTimer: () => void;
    setMode: (mode: TimerMode) => void;
    formatTime: (seconds: number) => string;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function usePomodoro() {
    const context = useContext(PomodoroContext);
    if (context === undefined) {
        throw new Error('usePomodoro must be used within a PomodoroProvider');
    }
    return context;
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<TimerMode>('work');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const timerRef = useRef<number | null>(null);

    const getDuration = (currentMode: TimerMode) => {
        switch (currentMode) {
            case 'work': return 25 * 60;
            case 'shortBreak': return 5 * 60;
            case 'longBreak': return 15 * 60;
            default: return 25 * 60;
        }
    };

    useEffect(() => {
        setTimeLeft(getDuration(mode));
        setIsActive(false);
    }, [mode]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play sound or notify here
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(e => console.log('Audio play failed', e));
            alert(mode === 'work' ? 'Time for a break!' : 'Back to work!');
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft, mode]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(getDuration(mode));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <PomodoroContext.Provider value={{ timeLeft, isActive, mode, toggleTimer, resetTimer, setMode, formatTime }}>
            {children}
        </PomodoroContext.Provider>
    );
}
