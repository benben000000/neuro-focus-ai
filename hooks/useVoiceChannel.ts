import { useEffect, useState, useRef, useCallback } from 'react';
import { 
    Room, 
    RoomEvent, 
    Participant, 
    RemoteParticipant, 
    RemoteTrackPublication, 
    RemoteTrack, 
    Track,
    LocalTrackPublication
} from 'livekit-client';
import { useAuth } from '../contexts/AuthContext';
import { fetchToken, logCallEvent } from '../services/rtc';
import { updateVoiceState, subscribeToVoiceStates, VoiceState, getUserProfile } from '../services/social';

export interface UseVoiceChannelReturn {
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    currentChannelId: string | null;
    participants: Participant[]; // Local + Remote LiveKit participants
    activeSpeakers: string[]; // userIds of active speakers
    voiceStates: VoiceState[]; // Firestore state for the current channel
    joinChannel: (channelId: string) => Promise<void>;
    leaveChannel: () => Promise<void>;
    toggleMute: () => Promise<void>;
    toggleDeafen: () => void;
    isMuted: boolean;
    isDeafened: boolean;
}

export function useVoiceChannel(): UseVoiceChannelReturn {
    const { currentUser } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
    const [voiceStates, setVoiceStates] = useState<VoiceState[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    
    const roomRef = useRef<Room | null>(null);
    const joinTimeRef = useRef<number>(0);
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const currentChannelIdRef = useRef<string | null>(null);

    // Sync ref with state
    useEffect(() => {
        currentChannelIdRef.current = currentChannelId;
    }, [currentChannelId]);

    // Subscribe to Firestore voice states when channel changes
    useEffect(() => {
        if (!currentChannelId) {
            setVoiceStates([]);
            return;
        }
        
        const unsubscribe = subscribeToVoiceStates(currentChannelId, (states) => {
            setVoiceStates(states);
        });
        
        return () => unsubscribe();
    }, [currentChannelId]);

    // Initialize Room events
    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (roomRef.current) {
                roomRef.current.disconnect();
            }
        };
    }, []);

    const updateParticipants = useCallback(() => {
        if (!roomRef.current) return;
        const remote = Array.from(roomRef.current.participants.values());
        const local = roomRef.current.localParticipant;
        setParticipants([local, ...remote]);
    }, []);

    const handleTrackSubscribed = (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
    ) => {
        if (track.kind === Track.Kind.Audio) {
            // Attach audio track to a new audio element
            const element = track.attach();
            audioElementsRef.current.set(participant.identity, element);
            document.body.appendChild(element);
            
            if (isDeafened) {
                element.muted = true;
            }
        }
    };

    const handleTrackUnsubscribed = (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
    ) => {
        if (track.kind === Track.Kind.Audio) {
            track.detach();
            const element = audioElementsRef.current.get(participant.identity);
            if (element) {
                element.remove();
                audioElementsRef.current.delete(participant.identity);
            }
        }
    };

    const handleActiveSpeakersChanged = (speakers: Participant[]) => {
        setActiveSpeakers(speakers.map(p => p.identity));
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setParticipants([]);
        setActiveSpeakers([]);
        setRoom(null);
        roomRef.current = null;
        
        const channelId = currentChannelIdRef.current;
        
        // Sync with Firestore if we were in a channel
        if (channelId && currentUser) {
             updateVoiceState(channelId, currentUser.uid, null).catch(console.error);
             
             // Log end
             const duration = (Date.now() - joinTimeRef.current) / 1000;
             logCallEvent(currentUser.uid, 'END', channelId, duration);
             
             setCurrentChannelId(null);
        }
    };

    const joinChannel = useCallback(async (channelId: string) => {
        if (!currentUser) return;
        if (isConnected && currentChannelId === channelId) return;
        if (isConnected) await leaveChannel();

        setIsConnecting(true);
        setError(null);

        try {
            // 1. Get User Profile
            const profile = await getUserProfile(currentUser.uid);
            if (!profile) throw new Error("User profile not found");

            // 2. Get Token
            const token = await fetchToken(channelId, profile);
            if (!token) throw new Error("Failed to get connection token");

            // 3. Connect to LiveKit
            const newRoom = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            // Set up event listeners
            newRoom
                .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
                .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
                .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
                .on(RoomEvent.Disconnected, handleDisconnect)
                .on(RoomEvent.ParticipantConnected, () => {
                    const remote = Array.from(newRoom.participants.values());
                    const local = newRoom.localParticipant;
                    setParticipants([local, ...remote]);
                })
                .on(RoomEvent.ParticipantDisconnected, () => {
                    const remote = Array.from(newRoom.participants.values());
                    const local = newRoom.localParticipant;
                    setParticipants([local, ...remote]);
                });

            const wsUrl = import.meta.env.VITE_LIVEKIT_URL;
            if (!wsUrl) throw new Error("VITE_LIVEKIT_URL is missing");

            await newRoom.connect(wsUrl, token);
            
            // 4. Publish Microphone
            await newRoom.localParticipant.enableCameraAndMicrophone(false, true);
            
            roomRef.current = newRoom;
            setRoom(newRoom);
            setIsConnected(true);
            setCurrentChannelId(channelId);
            
            const remote = Array.from(newRoom.participants.values());
            const local = newRoom.localParticipant;
            setParticipants([local, ...remote]);

            joinTimeRef.current = Date.now();
            setIsMuted(false);
            setIsDeafened(false);

            // 5. Update Firestore
            await updateVoiceState(channelId, currentUser.uid, {
                isMuted: false,
                isDeafened: false,
                joinedAt: Date.now(),
                user: {
                    displayName: profile.displayName,
                    photoURL: profile.photoURL
                }
            });

            // 6. Log Start
            logCallEvent(currentUser.uid, 'START', channelId);

        } catch (err: any) {
            console.error("Failed to join voice channel:", err);
            setError(err);
            setIsConnecting(false); // Reset connecting state on error
        } finally {
             // Assuming successful connect sets isConnecting to false? 
             // Wait, we should set it false here regardless.
             if (isConnected) { 
                 // If we connected successfully, we are no longer connecting.
                 setIsConnecting(false);
             }
        }
        // Note: If join succeeds, isConnecting is set to false in finally block?
        // Actually, `isConnected` state update is async, so `isConnected` check in finally might be stale.
        // Better to just set isConnecting(false) in finally.
        setIsConnecting(false);

    }, [currentUser, isConnected, currentChannelId]);

    const leaveChannel = useCallback(async () => {
        if (roomRef.current) {
            await roomRef.current.disconnect();
            // handleDisconnect will be called by the event listener
        }
    }, []);

    const toggleMute = useCallback(async () => {
        if (!roomRef.current || !currentUser || !currentChannelId) return;
        
        const newMuted = !isMuted;
        
        try {
            await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
            setIsMuted(newMuted);
            
            // Update Firestore
            updateVoiceState(currentChannelId, currentUser.uid, {
                isMuted: newMuted
            });
        } catch (e) {
            console.error("Error toggling mute:", e);
        }
    }, [isMuted, currentUser, currentChannelId]);

    const toggleDeafen = useCallback(async () => {
         if (!currentUser || !currentChannelId) return;

         const newDeafened = !isDeafened;
         setIsDeafened(newDeafened);

         // Mute all audio elements
         audioElementsRef.current.forEach((element) => {
             element.muted = newDeafened;
         });

         // Also mute self if deafening (optional preference, but common)
         if (newDeafened && !isMuted) {
             await toggleMute(); // This will update Firestore for mute
         }

         // Update Firestore for deafen state
         updateVoiceState(currentChannelId, currentUser.uid, {
             isDeafened: newDeafened
         });

    }, [isDeafened, currentUser, currentChannelId, isMuted, toggleMute]);

    return {
        isConnected,
        isConnecting,
        error,
        currentChannelId,
        participants,
        activeSpeakers,
        voiceStates,
        joinChannel,
        leaveChannel,
        toggleMute,
        toggleDeafen,
        isMuted,
        isDeafened
    };
}
