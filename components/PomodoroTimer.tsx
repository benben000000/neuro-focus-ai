import React, { useState, useEffect, useRef } from 'react';
import { Clock, Coffee, Play, Pause, RotateCcw } from 'lucide-react';
import { playSuccess } from '../services/sound';

const STORAGE_KEY = 'pomodoro-timer-state';
const DEFAULT_WORK_DURATION = 25; // minutes
const DEFAULT_BREAK_DURATION = 5; // minutes

type TimerMode = 'classic' | 'timer';

interface ClassicState {
  workDuration: number; // minutes
  breakDuration: number; // minutes
  timeRemaining: number; // seconds
  isWorkPhase: boolean;
  isRunning: boolean;
}

interface TimerState {
  totalSeconds: number;
  isRunning: boolean;
  suggestedBreak: number | null;
}

interface StoredState {
  mode: TimerMode;
  classicState: ClassicState;
  timerState: TimerState;
  soundEnabled: boolean;
}

export const PomodoroTimer: React.FC = () => {
  const [mode, setMode] = useState<TimerMode>('classic');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [classicState, setClassicState] = useState<ClassicState>({
    workDuration: DEFAULT_WORK_DURATION,
    breakDuration: DEFAULT_BREAK_DURATION,
    timeRemaining: DEFAULT_WORK_DURATION * 60,
    isWorkPhase: true,
    isRunning: false
  });
  
  const [timerState, setTimerState] = useState<TimerState>({
    totalSeconds: 0,
    isRunning: false,
    suggestedBreak: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredState = JSON.parse(saved);
        setMode(parsed.mode);
        setClassicState(parsed.classicState);
        setTimerState(parsed.timerState);
        setSoundEnabled(parsed.soundEnabled);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save state when it changes
  useEffect(() => {
    const stateToSave: StoredState = {
      mode,
      classicState,
      timerState,
      soundEnabled
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [mode, classicState, timerState, soundEnabled]);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Play sound when enabled
  const playNotification = () => {
    if (soundEnabled) {
      playSuccess();
    }
  };

  // Classic pomodoro timer logic
  useEffect(() => {
    if (mode === 'classic' && classicState.isRunning) {
      intervalRef.current = setInterval(() => {
        setClassicState(prev => {
          if (prev.timeRemaining <= 1) {
            // Phase complete
            const newPhase = !prev.isWorkPhase;
            const newDuration = newPhase ? prev.workDuration : prev.breakDuration;
            playNotification();
            return {
              ...prev,
              timeRemaining: newDuration * 60,
              isWorkPhase: newPhase
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mode, classicState.isRunning, soundEnabled]);

  // Free-form timer logic
  useEffect(() => {
    if (mode === 'timer' && timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          totalSeconds: prev.totalSeconds + 1
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mode, timerState.isRunning]);

  const handleClassicStartPause = () => {
    setClassicState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleClassicReset = () => {
    setClassicState(prev => ({
      ...prev,
      timeRemaining: prev.isWorkPhase ? prev.workDuration * 60 : prev.breakDuration * 60,
      isRunning: false
    }));
  };

  const handleTimerStartPause = () => {
    if (timerState.isRunning) {
      // Stopping - calculate suggested break
      const workMinutes = timerState.totalSeconds / 60;
      const suggestedBreak = Math.max(5, Math.round(workMinutes * 0.2));
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        suggestedBreak
      }));
    } else {
      // Starting - clear previous suggestion
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        suggestedBreak: null
      }));
    }
  };

  const handleTimerReset = () => {
    setTimerState({
      totalSeconds: 0,
      isRunning: false,
      suggestedBreak: null
    });
  };

  const handleModeSwitch = (newMode: TimerMode) => {
    // Pause current timer
    if (mode === 'classic') {
      setClassicState(prev => ({ ...prev, isRunning: false }));
    } else {
      setTimerState(prev => ({ ...prev, isRunning: false }));
    }
    setMode(newMode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateClassicDuration = (type: 'work' | 'break', value: number) => {
    setClassicState(prev => {
      const newState = { ...prev };
      if (type === 'work') {
        newState.workDuration = value;
        if (prev.isWorkPhase) {
          newState.timeRemaining = value * 60;
        }
      } else {
        newState.breakDuration = value;
        if (!prev.isWorkPhase) {
          newState.timeRemaining = value * 60;
        }
      }
      return newState;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock size={20} className="text-indigo-500" />
          Pomodoro Timer
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled 
                ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200' 
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
          >
            <Clock size={16} />
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-6">
        <button
          onClick={() => handleModeSwitch('classic')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'classic'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Classic
        </button>
        <button
          onClick={() => handleModeSwitch('timer')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'timer'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Timer
        </button>
      </div>

      {mode === 'classic' ? (
        <div className="space-y-6">
          {/* Phase Indicator */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              classicState.isWorkPhase 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {classicState.isWorkPhase ? <Clock size={16} /> : <Coffee size={16} />}
              {classicState.isWorkPhase ? 'Work Time' : 'Break Time'}
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center">
            <div className="text-5xl font-mono font-bold text-slate-900 dark:text-white mb-2">
              {formatTime(classicState.timeRemaining)}
            </div>
          </div>

          {/* Duration Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Work (min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={classicState.workDuration}
                onChange={(e) => updateClassicDuration('work', Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={classicState.isRunning}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Break (min)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={classicState.breakDuration}
                onChange={(e) => updateClassicDuration('break', Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={classicState.isRunning}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClassicStartPause}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                classicState.isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {classicState.isRunning ? <Pause size={18} /> : <Play size={18} />}
              {classicState.isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={handleClassicReset}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-5xl font-mono font-bold text-slate-900 dark:text-white mb-2">
              {formatTime(timerState.totalSeconds)}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total work time
            </div>
          </div>

          {/* Break Suggestion */}
          {timerState.suggestedBreak !== null && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Coffee size={18} className="text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  Time for a break!
                </span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {timerState.suggestedBreak} minutes
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                Suggested rest time
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTimerStartPause}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                timerState.isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {timerState.isRunning ? <Pause size={18} /> : <Play size={18} />}
              {timerState.isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={handleTimerReset}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};