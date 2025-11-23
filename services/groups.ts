import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    increment,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './social';

export type ChannelType = 'text' | 'voice';

export interface Group {
    id: string;
    name: string;
    iconUrl?: string;
    ownerId: string;
    members: string[]; // List of user IDs
    createdAt: number;
    description?: string;
}

export interface Channel {
    id: string;
    groupId: string;
    name: string;
    type: ChannelType;
    createdAt: number;
    order?: number;
    activeUsers?: string[]; // For voice channels: list of user IDs currently in the channel
}

export interface GroupMessage {
    id: string;
    channelId: string;
    groupId: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    content: string;
    createdAt: number;
    attachments?: any[];
    isSystemMessage?: boolean;
}

export interface GroupMember {
    userId: string;
    groupId: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: number;
}

// --- Group Functions ---

export const createGroup = async (
    name: string,
    ownerId: string,
    description?: string,
    iconUrl?: string
): Promise<string> => {
    try {
        const groupsRef = collection(db, 'groups');
        const now = Date.now();
        
        // Create the group document
        const groupData: Omit<Group, 'id'> = {
            name,
            ownerId,
            members: [ownerId],
            createdAt: now,
            description,
            iconUrl
        };
        
        const docRef = await addDoc(groupsRef, groupData);
        const groupId = docRef.id;

        // Add owner as a member
        await setDoc(doc(db, 'groups', groupId, 'members', ownerId), {
            userId: ownerId,
            groupId,
            role: 'owner',
            joinedAt: now
        });

        // Create default channels
        await createChannel(groupId, 'general', 'text');
        await createChannel(groupId, 'voice-lounge', 'voice');

        return groupId;
    } catch (error: any) {
        console.error('createGroup failed', error);
        throw new Error(error?.message || 'Failed to create group.');
    }
};

export const subscribeToUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', userId));

    return onSnapshot(q, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Group));
        callback(groups);
    });
};

export const getGroup = async (groupId: string): Promise<Group | null> => {
    const docRef = doc(db, 'groups', groupId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Group;
    }
    return null;
};

// --- Channel Functions ---

export const createChannel = async (
    groupId: string,
    name: string,
    type: ChannelType,
    order: number = 0
): Promise<string> => {
    const channelsRef = collection(db, 'groups', groupId, 'channels');
    const docRef = await addDoc(channelsRef, {
        groupId,
        name,
        type,
        createdAt: Date.now(),
        order,
        activeUsers: []
    });
    return docRef.id;
};

export const subscribeToGroupChannels = (groupId: string, callback: (channels: Channel[]) => void) => {
    const channelsRef = collection(db, 'groups', groupId, 'channels');
    const q = query(channelsRef, orderBy('createdAt', 'asc')); // Order by creation or a specific order field

    return onSnapshot(q, (snapshot) => {
        const channels = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Channel));
        // Sort manually if needed, or rely on orderBy
        callback(channels);
    });
};

// --- Message Functions ---

export const sendGroupMessage = async (
    groupId: string,
    channelId: string,
    userId: string,
    userName: string,
    userPhoto: string | undefined,
    content: string
): Promise<string> => {
    const messagesRef = collection(db, 'groups', groupId, 'channels', channelId, 'messages');
    const docRef = await addDoc(messagesRef, {
        channelId,
        groupId,
        senderId: userId,
        senderName: userName,
        senderPhoto: userPhoto || null,
        content,
        createdAt: Date.now()
    });
    return docRef.id;
};

export const subscribeToChannelMessages = (
    groupId: string,
    channelId: string,
    callback: (messages: GroupMessage[]) => void
) => {
    const messagesRef = collection(db, 'groups', groupId, 'channels', channelId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as GroupMessage));
        callback(messages);
    });
};

// --- Member Functions ---

export const joinGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    
    await updateDoc(groupRef, {
        members: arrayUnion(userId)
    });

    await setDoc(doc(db, 'groups', groupId, 'members', userId), {
        userId,
        groupId,
        role: 'member',
        joinedAt: Date.now()
    });
};

export const subscribeToGroupMembers = (groupId: string, callback: (members: GroupMember[]) => void) => {
    const membersRef = collection(db, 'groups', groupId, 'members');
    
    return onSnapshot(membersRef, (snapshot) => {
        const members = snapshot.docs.map(doc => doc.data() as GroupMember);
        callback(members);
    });
};
