import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, runTransaction, increment } from 'firebase/firestore';
import { UserProgress } from '../types';

interface ActivityContextType {
    isTracking: boolean;
    currentSubject: string;
    setSubject: (subject: string) => void;
    sessionDuration: number;
    stats: UserProgress;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function useActivity() {
    const context = useContext(ActivityContext);
    if (context === undefined) {
        throw new Error('useActivity must be used within an ActivityProvider');
    }
    return context;
}

const IDLE_TIMEOUT = 60 * 1000; // 60 seconds idle allowed
const SYNC_INTERVAL = 30 * 1000; // Sync every 30 seconds

const DEFAULT_STATS: UserProgress = {
    totalSessions: 0,
    streakDays: 0,
    retentionRate: 0,
    lastStudyDate: '',
    totalStudySeconds: 0,
    averageRetentionRate: 0,
    sessions: []
};

export function ActivityProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useAuth();
    const [isTracking, setIsTracking] = useState(false);
    const [currentSubject, setCurrentSubject] = useState('General Knowledge');
    const [sessionDuration, setSessionDuration] = useState(0); // Duration of current "session" (active block)
    const [stats, setStats] = useState<UserProgress>(DEFAULT_STATS);

    const lastActivityRef = useRef<number>(Date.now());
    const unsavedSecondsRef = useRef<number>(0);
    const isTrackingRef = useRef(false);

    // Load stats from Firestore on mount/auth
    useEffect(() => {
        if (!currentUser) {
            setStats(DEFAULT_STATS);
            return;
        }

        const loadStats = async () => {
            try {
                const docRef = doc(db, 'users', currentUser.uid);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const learningStats = data.learningStats || {};
                    setStats({ ...DEFAULT_STATS, ...learningStats });
                }
            } catch (err) {
                console.error("Failed to load stats", err);
            }
        };
        loadStats();
    }, [currentUser]);

    // Activity listeners
    useEffect(() => {
        const handleUserActivity = () => {
            // If we were idle/not tracking, and now we have activity, start tracking
            if (!isTrackingRef.current) {
                startTracking();
            }
            lastActivityRef.current = Date.now();
        };

        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
        // Throttle handler to avoid excessive calls
        let throttleTimer: NodeJS.Timeout | null = null;
        const throttledHandler = () => {
            if (!throttleTimer) {
                handleUserActivity();
                throttleTimer = setTimeout(() => {
                    throttleTimer = null;
                }, 1000);
            }
        };

        events.forEach(event => window.addEventListener(event, throttledHandler));

        return () => {
            events.forEach(event => window.removeEventListener(event, throttledHandler));
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, []);

    // Idle check interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (isTrackingRef.current) {
                const idleTime = Date.now() - lastActivityRef.current;
                if (idleTime > IDLE_TIMEOUT) {
                    stopTracking();
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Ticker and Sync
    useEffect(() => {
        const ticker = setInterval(() => {
            if (isTrackingRef.current) {
                unsavedSecondsRef.current += 1;
                setSessionDuration(prev => prev + 1);
            }
        }, 1000);

        const syncer = setInterval(() => {
            if (isTrackingRef.current && currentUser) {
                flushProgress();
            }
        }, SYNC_INTERVAL);

        return () => {
            clearInterval(ticker);
            clearInterval(syncer);
        };
    }, [currentUser]);

    // Save on unmount/stop
    useEffect(() => {
        return () => {
             if (unsavedSecondsRef.current > 0) {
                 flushProgress();
             }
        };
    }, []);

    const startTracking = () => {
        setIsTracking(true);
        isTrackingRef.current = true;
        // Don't reset sessionDuration here to show cumulative for the session until page refresh or manual reset?
        // Actually, typical behavior is "Focus time today" or "Current session". 
        // Let's keep sessionDuration as "current continuous active block" or "time since page load".
        // The dashboard shows "Focus Session Running".
    };

    const stopTracking = () => {
        flushProgress(); 
        setIsTracking(false);
        isTrackingRef.current = false;
        // setSessionDuration(0); // Optionally reset, or keep it visible as "Last session"
    };

    const flushProgress = async () => {
        if (!currentUser) return;
        
        const seconds = unsavedSecondsRef.current;
        if (seconds === 0) return;
        
        unsavedSecondsRef.current = 0; // Reset immediately
        
        // Optimistic update
        setStats(prev => {
            // Basic increment for UI responsiveness
            return {
                ...prev,
                totalStudySeconds: prev.totalStudySeconds + seconds
            };
        });

        try {
             const userRef = doc(db, 'users', currentUser.uid);
             
             await runTransaction(db, async (transaction) => {
                 const userDoc = await transaction.get(userRef);
                 if (!userDoc.exists()) return;
                 
                 const data = userDoc.data();
                 const learningStats = data.learningStats || DEFAULT_STATS;
                 
                 const newTotalSeconds = (learningStats.totalStudySeconds || 0) + seconds;
                 const lastDateStr = learningStats.lastStudyDate;
                 const todayStr = new Date().toISOString();
                 const todayDate = todayStr.split('T')[0];
                 const lastDateDate = lastDateStr ? lastDateStr.split('T')[0] : null;
                 
                 let newStreak = learningStats.streakDays || 0;
                 
                 if (lastDateDate !== todayDate) {
                     if (lastDateDate) {
                         const d1 = Date.parse(lastDateDate);
                         const d2 = Date.parse(todayDate);
                         const oneDay = 24 * 60 * 60 * 1000;
                         const diffDays = Math.round((d2 - d1) / oneDay);
                         
                         if (diffDays === 1) newStreak += 1;
                         else if (diffDays > 1) newStreak = 1; // Reset if missed a day
                         else if (diffDays === 0) { /* same day */ }
                         else newStreak = 1; // Fallback
                     } else {
                         newStreak = 1; // First day ever
                     }
                 }
                 
                 transaction.update(userRef, {
                     'learningStats.totalStudySeconds': newTotalSeconds,
                     'learningStats.lastStudyDate': todayStr,
                     'learningStats.streakDays': newStreak,
                     [`learningStats.daily.${todayDate}`]: increment(seconds)
                 });
                 
                 // Update local stats with grounded truth from calculation
                 setStats(prev => ({
                     ...prev,
                     streakDays: newStreak,
                     lastStudyDate: todayStr,
                     totalStudySeconds: newTotalSeconds
                 }));
             });
        } catch (e) {
            console.error("Sync failed", e);
            unsavedSecondsRef.current += seconds; // Restore if failed
        }
    };

    return (
        <ActivityContext.Provider value={{ 
            isTracking, 
            currentSubject, 
            setSubject: setCurrentSubject,
            sessionDuration,
            stats
        }}>
            {children}
        </ActivityContext.Provider>
    );
}
