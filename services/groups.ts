import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    increment,
    runTransaction,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, getUserProfile, ComposerMedia } from './social';

// --- TYPES ---

export interface FocusGroup {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    bannerUrl?: string;
    ownerId: string;
    createdAt: number;
    updatedAt: number;
    // Study metadata
    totalStudyMinutes: number;
    activeMembersCount: number;
    tags: string[];
    isPublic: boolean;
    inviteCode?: string;
    allowedDomains?: string[];
}

export interface GroupMember {
    userId: string;
    role: 'owner' | 'admin' | 'moderator' | 'member';
    joinedAt: number;
    lastActiveAt?: number;
    // Hydrated from UserProfile
    displayName: string;
    photoURL?: string;
    level?: number;
    isVerified?: boolean;
}

export interface Channel {
    id: string;
    groupId: string;
    name: string;
    type: 'text' | 'voice';
    description?: string;
    position: number;
    isPrivate: boolean;
    allowedRoles?: string[]; // e.g. ['admin', 'moderator']
    createdAt: number;
}

export interface ChannelPermission {
    id: string; // Composite: `${channelId}_${role}`
    channelId: string;
    role: string;
    allow: string[]; // e.g. ['send_messages', 'connect']
    deny: string[];
}

export interface ChannelMessage {
    id: string;
    channelId: string;
    groupId: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorRole?: string;
    content: string;
    attachments?: ComposerMedia[];
    createdAt: number;
    updatedAt?: number;
    isSystemMessage?: boolean;
    replyToId?: string;
    reactions?: Record<string, string[]>; // emoji -> list of userIds
}

export interface VoiceState {
    id: string; // userId
    userId: string;
    channelId: string;
    groupId: string;
    joinedAt: number;
    isMuted: boolean;
    isDeafened: boolean;
    isScreenSharing: boolean;
    cameraEnabled: boolean;
    user: {
        displayName: string;
        photoURL?: string;
    };
}

export interface CallHistoryEntry {
    id: string;
    groupId: string;
    channelId: string;
    channelName: string;
    startedAt: number;
    endedAt?: number;
    participants: string[]; // User IDs
    duration?: number;
}

// --- GROUP FUNCTIONS ---

export const createGroup = async (
    data: {
        name: string;
        description?: string;
        iconUrl?: string;
        isPublic: boolean;
        ownerId: string;
        tags?: string[];
    }
): Promise<string> => {
    try {
        const groupsRef = collection(db, 'groups');
        const now = Date.now();
        const groupData: Omit<FocusGroup, 'id'> = {
            name: data.name,
            description: data.description || '',
            iconUrl: data.iconUrl || '',
            ownerId: data.ownerId,
            createdAt: now,
            updatedAt: now,
            totalStudyMinutes: 0,
            activeMembersCount: 1, // Owner starts as member
            tags: data.tags || [],
            isPublic: data.isPublic,
            inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
        };

        const docRef = await addDoc(groupsRef, groupData);
        const groupId = docRef.id;

        // Add owner as member
        await addGroupMember(groupId, data.ownerId, 'owner');

        // Create default general channel
        await createChannel(groupId, {
            name: 'general',
            type: 'text',
            position: 0,
            isPrivate: false,
            groupId
        });

        // Create default voice channel
        await createChannel(groupId, {
            name: 'Study Room',
            type: 'voice',
            position: 1,
            isPrivate: false,
            groupId
        });

        return groupId;
    } catch (error: any) {
        console.error('createGroup failed', error);
        throw new Error(error?.message || 'Failed to create group.');
    }
};

export const updateGroup = async (groupId: string, data: Partial<FocusGroup>) => {
    try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
            ...data,
            updatedAt: Date.now()
        });
    } catch (error: any) {
        console.error('updateGroup failed', error);
        throw new Error('Failed to update group.');
    }
};

export const deleteGroup = async (groupId: string) => {
    // Note: Recursive delete is not supported client-side in Firestore efficiently.
    // In production, this should be done via Cloud Functions.
    // Here we will just delete the group doc and let a scheduled function handle subcollections,
    // or manually delete what we can. For now, just the group doc to "hide" it.
    try {
        const groupRef = doc(db, 'groups', groupId);
        await deleteDoc(groupRef);
    } catch (error: any) {
        console.error('deleteGroup failed', error);
        throw new Error('Failed to delete group.');
    }
};

export const getGroup = async (groupId: string): Promise<FocusGroup | null> => {
    const groupRef = doc(db, 'groups', groupId);
    const snap = await getDoc(groupRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as FocusGroup;
    }
    return null;
};

export const subscribeToGroup = (groupId: string, callback: (group: FocusGroup | null) => void) => {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(groupRef, (snap) => {
        if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() } as FocusGroup);
        } else {
            callback(null);
        }
    });
};

export const subscribeToUserGroups = (userId: string, callback: (groups: FocusGroup[]) => void) => {
    // This is tricky because we store members in a subcollection.
    // A common pattern is to also store "joinedGroups" in the user's profile or a root collection "groupMembers".
    // Alternatively, for this scale, we might need to query 'groups' where 'members' contains userId? No, Firestore doesn't support subcollection queries easily like that across parents without collectionGroup queries which are broad.
    
    // For now, assuming we might need a `memberIds` array on the group for efficient querying if groups are small, 
    // OR we rely on a separate index. 
    // Given the constraints and "Discord-style", usually we have a 'users/{uid}/memberships' or similar.
    // However, I will implement a client-side filter or assume we add `memberIds` array to the group doc if we want to query "groups I am in".
    // BUT, the ticket didn't explicitly ask for "get user's groups".
    // It asked for "reference UserProfile to hydrate members".
    
    // Let's rely on the caller knowing which group to load or list public groups.
    // If we need to list my groups, we'd probably need `collectionGroup(db, 'members')` with `where('userId', '==', uid)`.
    
    // Let's implement `getUserGroups` using collection group query if needed, or leave it for now as it wasn't explicitly requested in the list of helpers.
    // The list was: "group CRUD", "invitations & role changes", "channel CRUD", "text message ...", "voice state ...", "call history ...".
    // "get user's groups" is not explicitly in the list, but it's implied for a UI.
    // I'll stick to the explicit list first.
};

// --- MEMBER FUNCTIONS ---

export const addGroupMember = async (groupId: string, userId: string, role: GroupMember['role'] = 'member') => {
    try {
        const userProfile = await getUserProfile(userId);
        if (!userProfile) throw new Error('User not found');

        const memberData: GroupMember = {
            userId,
            role,
            joinedAt: Date.now(),
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL,
            level: userProfile.level,
            isVerified: userProfile.isVerified
        };

        const memberRef = doc(db, 'groups', groupId, 'members', userId);
        await setDoc(memberRef, memberData);

        // Update count
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
            activeMembersCount: increment(1)
        });
    } catch (error: any) {
        console.error('addGroupMember failed', error);
        throw new Error('Failed to add member.');
    }
};

export const removeGroupMember = async (groupId: string, userId: string) => {
    try {
        const memberRef = doc(db, 'groups', groupId, 'members', userId);
        await deleteDoc(memberRef);

        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, {
            activeMembersCount: increment(-1)
        });
    } catch (error: any) {
        console.error('removeGroupMember failed', error);
        throw new Error('Failed to remove member.');
    }
};

export const updateMemberRole = async (groupId: string, userId: string, role: GroupMember['role']) => {
    try {
        const memberRef = doc(db, 'groups', groupId, 'members', userId);
        await updateDoc(memberRef, { role });
    } catch (error: any) {
        console.error('updateMemberRole failed', error);
        throw new Error('Failed to update role.');
    }
};

export const subscribeToMembers = (groupId: string, callback: (members: GroupMember[]) => void) => {
    const membersRef = collection(db, 'groups', groupId, 'members');
    return onSnapshot(membersRef, (snap) => {
        const members = snap.docs.map(d => d.data() as GroupMember);
        callback(members);
    });
};

// --- CHANNEL FUNCTIONS ---

export const createChannel = async (
    groupId: string, 
    data: {
        name: string;
        type: 'text' | 'voice';
        position?: number;
        isPrivate?: boolean;
        allowedRoles?: string[];
        description?: string;
        groupId?: string; // Optional in input, forced in impl
    }
) => {
    try {
        const channelsRef = collection(db, 'groups', groupId, 'channels');
        const channelData: Omit<Channel, 'id'> = {
            groupId,
            name: data.name,
            type: data.type,
            description: data.description || '',
            position: data.position || 0,
            isPrivate: data.isPrivate || false,
            allowedRoles: data.allowedRoles || [],
            createdAt: Date.now()
        };
        const docRef = await addDoc(channelsRef, channelData);
        return docRef.id;
    } catch (error: any) {
        console.error('createChannel failed', error);
        throw new Error('Failed to create channel.');
    }
};

export const updateChannel = async (groupId: string, channelId: string, data: Partial<Channel>) => {
    try {
        const channelRef = doc(db, 'groups', groupId, 'channels', channelId);
        await updateDoc(channelRef, data);
    } catch (error: any) {
        console.error('updateChannel failed', error);
        throw new Error('Failed to update channel.');
    }
};

export const deleteChannel = async (groupId: string, channelId: string) => {
    try {
        const channelRef = doc(db, 'groups', groupId, 'channels', channelId);
        await deleteDoc(channelRef);
    } catch (error: any) {
        console.error('deleteChannel failed', error);
        throw new Error('Failed to delete channel.');
    }
};

export const subscribeToChannels = (groupId: string, callback: (channels: Channel[]) => void) => {
    const channelsRef = collection(db, 'groups', groupId, 'channels');
    const q = query(channelsRef, orderBy('position', 'asc'));
    return onSnapshot(q, (snap) => {
        const channels = snap.docs.map(d => ({ id: d.id, ...d.data() } as Channel));
        callback(channels);
    });
};

// --- MESSAGE FUNCTIONS ---

export const sendChannelMessage = async (groupId: string, channelId: string, data: {
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorRole?: string;
    content: string;
    attachments?: ComposerMedia[];
    replyToId?: string;
}) => {
    try {
        const messagesRef = collection(db, 'groups', groupId, 'channels', channelId, 'messages');
        const messageData: Omit<ChannelMessage, 'id'> = {
            channelId,
            groupId,
            authorId: data.authorId,
            authorName: data.authorName,
            authorPhoto: data.authorPhoto,
            authorRole: data.authorRole,
            content: data.content,
            attachments: data.attachments,
            replyToId: data.replyToId,
            createdAt: Date.now(),
            isSystemMessage: false
        };
        await addDoc(messagesRef, messageData);
    } catch (error: any) {
        console.error('sendMessage failed', error);
        throw new Error('Failed to send message.');
    }
};

export const subscribeToMessages = (
    groupId: string, 
    channelId: string, 
    callback: (messages: ChannelMessage[]) => void
) => {
    const messagesRef = collection(db, 'groups', groupId, 'channels', channelId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));
    
    return onSnapshot(q, (snap) => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChannelMessage));
        // Reverse to show oldest first in UI if needed, but typically UI handles it.
        // We return desc (newest first) for efficient querying, UI often reverses or handles scroll.
        callback(messages);
    });
};

// --- VOICE FUNCTIONS ---

export const joinVoiceChannel = async (
    groupId: string, 
    channelId: string, 
    userId: string, 
    user: { displayName: string, photoURL?: string }
) => {
    try {
        const voiceRef = doc(db, 'groups', groupId, 'voiceStates', userId);
        const state: VoiceState = {
            id: userId,
            userId,
            groupId,
            channelId,
            joinedAt: Date.now(),
            isMuted: false,
            isDeafened: false,
            isScreenSharing: false,
            cameraEnabled: false,
            user
        };
        await setDoc(voiceRef, state);
    } catch (error: any) {
        console.error('joinVoiceChannel failed', error);
        throw new Error('Failed to join voice.');
    }
};

export const leaveVoiceChannel = async (groupId: string, userId: string) => {
    try {
        const voiceRef = doc(db, 'groups', groupId, 'voiceStates', userId);
        
        // Log to history before leaving
        const snap = await getDoc(voiceRef);
        if (snap.exists()) {
            const state = snap.data() as VoiceState;
            // We'd ideally track call sessions. For now, we just remove the state.
            // Logging can happen on "session end" or periodically.
            // Let's log a simple entry if we knew when it started.
            // The ticket says "call history logging/reads".
            
            // To properly log history, we might want to track a "CallSession" object.
            // Or just log that user X was in channel Y from T1 to T2.
            await logCallHistory(groupId, state.channelId, [userId], state.joinedAt, Date.now());
        }

        await deleteDoc(voiceRef);
    } catch (error: any) {
        console.error('leaveVoiceChannel failed', error);
        throw new Error('Failed to leave voice.');
    }
};

export const updateVoiceState = async (groupId: string, userId: string, updates: Partial<VoiceState>) => {
    try {
        const voiceRef = doc(db, 'groups', groupId, 'voiceStates', userId);
        await updateDoc(voiceRef, updates);
    } catch (error: any) {
        console.error('updateVoiceState failed', error);
        throw new Error('Failed to update voice state.');
    }
};

export const subscribeToVoiceStates = (groupId: string, callback: (states: VoiceState[]) => void) => {
    const statesRef = collection(db, 'groups', groupId, 'voiceStates');
    return onSnapshot(statesRef, (snap) => {
        const states = snap.docs.map(d => d.data() as VoiceState);
        callback(states);
    });
};

// --- CALL HISTORY FUNCTIONS ---

export const logCallHistory = async (
    groupId: string,
    channelId: string,
    participants: string[],
    startedAt: number,
    endedAt: number
) => {
    try {
        const historyRef = collection(db, 'groups', groupId, 'callHistory');
        // We might want to look up channel name
        const channelRef = doc(db, 'groups', groupId, 'channels', channelId);
        const channelSnap = await getDoc(channelRef);
        const channelName = channelSnap.exists() ? channelSnap.data()?.name : 'Unknown Channel';

        const entry: Omit<CallHistoryEntry, 'id'> = {
            groupId,
            channelId,
            channelName,
            startedAt,
            endedAt,
            participants,
            duration: Math.floor((endedAt - startedAt) / 1000)
        };
        await addDoc(historyRef, entry);
    } catch (error) {
        console.error('logCallHistory failed', error);
        // non-blocking
    }
};

export const getCallHistory = async (groupId: string, limitCount = 20) => {
    const historyRef = collection(db, 'groups', groupId, 'callHistory');
    const q = query(historyRef, orderBy('startedAt', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CallHistoryEntry));
};
