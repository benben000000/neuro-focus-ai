import React, { useState, useEffect, useRef } from 'react';
import { usePomodoro } from '../contexts/PomodoroContext';
import { Play, Pause, RotateCcw, Coffee, Brain, X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';

export function PomodoroOverlay() {
    const { 
        timeLeft, 
        isActive, 
        mode, 
        toggleTimer, 
        resetTimer, 
        setMode, 
        formatTime,
        isWidgetVisible,
        setWidgetVisible
    } = usePomodoro();

    const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 200 });
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const widgetRef = useRef<HTMLDivElement>(null);

    // Load persisted state
    useEffect(() => {
        const saved = localStorage.getItem('pomodoroWidgetState');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validate coordinates are within bounds roughly
                const x = Math.min(Math.max(0, parsed.x), window.innerWidth - 50);
                const y = Math.min(Math.max(0, parsed.y), window.innerHeight - 50);
                setPosition({ x, y });
                setIsMinimized(parsed.isMinimized);
            } catch (e) {
                console.error("Failed to parse saved widget state", e);
            }
        } else {
            // Default position bottom right
             setPosition({ x: window.innerWidth - 340, y: window.innerHeight - 250 });
        }
    }, []);

    // Save state
    useEffect(() => {
        localStorage.setItem('pomodoroWidgetState', JSON.stringify({ ...position, isMinimized }));
    }, [position, isMinimized]);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        // Only drag if clicking the handle or background, not buttons
        if ((e.target as HTMLElement).closest('button')) return;
        
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        dragStartRef.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            e.preventDefault(); // Prevent scrolling on touch
            
            const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
            
            const newX = clientX - dragStartRef.current.x;
            const newY = clientY - dragStartRef.current.y;
            
            // Boundary checks
            const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 0);
            const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 0);
            
            setPosition({
                x: Math.min(Math.max(0, newX), maxX),
                y: Math.min(Math.max(0, newY), maxY)
            });
        };

        const handleUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleUp);
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);
        };
    }, [isDragging]);

    if (!isWidgetVisible) return null;

    const getBgColor = () => {
        switch (mode) {
            case 'work': return 'bg-indigo-600';
            case 'shortBreak': return 'bg-emerald-500';
            case 'longBreak': return 'bg-blue-500';
        }
    };

    return (
        <div 
            ref={widgetRef}
            style={{ 
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                position: 'fixed',
                left: 0,
                top: 0,
                touchAction: 'none'
            }}
            className="z-50 transition-shadow duration-300"
        >
            <div 
                className={`rounded-2xl shadow-xl text-white backdrop-blur-lg bg-opacity-90 ${getBgColor()} transition-all duration-300 overflow-hidden ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'} ${isMinimized ? 'w-48 p-2' : 'w-72 p-4'}`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
            >
                {/* Drag Handle & Controls */}
                <div className="flex items-center justify-between mb-2 opacity-50 hover:opacity-100 transition-opacity">
                    <div className="flex items-center text-white/70">
                        <GripHorizontal size={16} className="ml-1" />
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                            className="p-1 hover:bg-white/20 rounded"
                            title={isMinimized ? "Expand" : "Minimize"}
                        >
                            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setWidgetVisible(false); }}
                            className="p-1 hover:bg-white/20 rounded"
                            title="Close"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {isMinimized ? (
                     <div className="flex items-center justify-between px-1 pb-1">
                        <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                            className="p-1.5 bg-white text-indigo-900 rounded-full hover:scale-105 transition-transform"
                        >
                            {isActive ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                        </button>
                     </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMode('work'); }}
                                    className={`p-1.5 rounded-lg transition-colors ${mode === 'work' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                    title="Work"
                                >
                                    <Brain size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMode('shortBreak'); }}
                                    className={`p-1.5 rounded-lg transition-colors ${mode === 'shortBreak' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                                    title="Short Break"
                                >
                                    <Coffee size={16} />
                                </button>
                            </div>
                            <span className="font-mono text-3xl font-bold tabular-nums tracking-wider">
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium opacity-90 uppercase tracking-wider truncate">
                                {mode === 'work' ? 'Focus Time' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                                    className="p-3 bg-white text-indigo-900 rounded-full hover:scale-105 transition-transform active:scale-95 shadow-sm"
                                >
                                    {isActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); resetTimer(); }}
                                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
