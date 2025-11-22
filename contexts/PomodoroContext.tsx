import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { logSession } from '../services/learning';
import { StudySessionStats } from '../types';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroContextType {
    timeLeft: number;
    isActive: boolean;
    mode: TimerMode;
    toggleTimer: () => void;
    resetTimer: () => void;
    setMode: (mode: TimerMode) => void;
    formatTime: (seconds: number) => string;
    sessionSubject: string;
    setSessionSubject: (subject: string) => void;
    isWidgetVisible: boolean;
    setWidgetVisible: (visible: boolean) => void;
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
    const [sessionSubject, setSessionSubject] = useState('General Knowledge');
    const [isWidgetVisible, setWidgetVisible] = useState(true);
    
    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

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
            if (timerRef.current === null) {
                // Timer just started/resumed
                if (startTimeRef.current === 0) {
                     startTimeRef.current = Date.now();
                }
            }
            
            timerRef.current = window.setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Timer finished
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;

            // Log session if it was work mode
            if (mode === 'work') {
                const duration = getDuration('work');
                const endTime = Date.now();
                // Approximate start time based on duration if we didn't track it perfectly or pauses happened
                // But for log, we can use current time - duration.
                // Or use startTimeRef if we want to capture the actual span including pauses?
                // Usually Pomodoro logs the *work duration* (e.g. 25 mins), not the wall clock time.
                
                const newSession: StudySessionStats = {
                    id: Date.now().toString(),
                    subject: sessionSubject,
                    startTime: endTime - (duration * 1000), 
                    endTime,
                    durationSeconds: duration,
                    toolsUsed: ['Pomodoro Timer'],
                    xpEarned: Math.floor(duration / 60) * 10,
                    mastery: 0,
                    lastStudied: new Date().toISOString(),
                    hoursSpent: duration / 3600
                };
                logSession(newSession);
                
                // Notify user
                new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(e => console.log('Audio play failed', e));
                // We can use a toast or notification here instead of alert in future
            } else {
                // Break finished
                 new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(e => console.log('Audio play failed', e));
            }
            
            startTimeRef.current = 0;
        } else {
             // Paused
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft, mode, sessionSubject]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(getDuration(mode));
        startTimeRef.current = 0;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <PomodoroContext.Provider value={{ 
            timeLeft, 
            isActive, 
            mode, 
            toggleTimer, 
            resetTimer, 
            setMode, 
            formatTime,
            sessionSubject,
            setSessionSubject,
            isWidgetVisible,
            setWidgetVisible
        }}>
            {children}
        </PomodoroContext.Provider>
    );
}
