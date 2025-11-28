import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePresence, UserPresence, subscribeToPresence } from '../services/social';

export const usePresence = () => {
    const { currentUser } = useAuth();
    const [presence, setPresence] = useState<UserPresence | null>(null);

    // Subscribe to own presence to keep local state updated
    useEffect(() => {
        if (!currentUser) {
            setPresence(null);
            return;
        }

        const unsubscribe = subscribeToPresence(currentUser.uid, (data) => {
            setPresence(data);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Update presence on mount/interval
    useEffect(() => {
        if (!currentUser) return;

        const uid = currentUser.uid;

        // Set online status
        updatePresence(uid, {
            online: true,
            lastSeen: Date.now()
        });

        // Heartbeat to update lastSeen every minute
        const interval = setInterval(() => {
            updatePresence(uid, {
                online: true,
                lastSeen: Date.now()
            });
        }, 60000); // 1 minute

        // Handle visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updatePresence(uid, {
                    online: true,
                    lastSeen: Date.now()
                });
            } else {
                 // Optional: mark as away or offline immediately? 
                 // Usually we just let the lastSeen age.
                 // But we can update lastSeen one last time.
                 updatePresence(uid, {
                    lastSeen: Date.now()
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Cleanup: set online to false
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            // This might not always fire reliably on browser close, but works for component unmount
            updatePresence(uid, {
                online: false,
                lastSeen: Date.now()
            });
        };
    }, [currentUser]);

    return presence;
};
