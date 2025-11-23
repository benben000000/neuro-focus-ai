import { UserProfile } from './social';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

const TOKEN_ENDPOINT = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT;

export const fetchToken = async (roomName: string, user: UserProfile): Promise<string> => {
    if (!TOKEN_ENDPOINT) {
        console.warn("VITE_LIVEKIT_TOKEN_ENDPOINT is not set. RTC features will not work.");
        // Return a dummy token for UI testing if needed, but it won't connect.
        return "";
    }

    try {
        const response = await fetch(`${TOKEN_ENDPOINT}?roomName=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(user.uid)}&name=${encodeURIComponent(user.displayName)}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch token: ${response.statusText}`);
        }

        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error("Error fetching LiveKit token:", error);
        throw error;
    }
};

export const logCallEvent = async (userId: string, event: 'START' | 'END', channelId: string, durationSeconds?: number) => {
    try {
        await addDoc(collection(db, 'callHistory'), {
            userId,
            event,
            channelId,
            timestamp: Date.now(),
            durationSeconds: durationSeconds || 0
        });
    } catch (error) {
        console.error("Failed to log call event", error);
    }
};
