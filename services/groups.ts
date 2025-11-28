import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    arrayUnion,
    arrayRemove,
    increment,
    runTransaction,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, getUserProfile, ComposerMedia } from './social';

export type ChannelType = 'text' | 'voice';

export interface Group {
    id: string;
    name: string;
    iconUrl?: string;
    ownerId: string;
    members: string[]; // List of user IDs
    createdAt: number;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
}

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
    type: ChannelType;
    createdAt: number;
    order?: number;
    activeUsers?: string[]; // For voice channels: list of user IDs currently in the channel
}

export interface GroupMessage {
    id: string;
    channelId: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    content: string;
    timestamp: number;
    attachments?: ComposerMedia[];
    replyTo?: string; // ID of message being replied to
    reactions?: Record<string, string[]>; // emoji -> array of user IDs
    editedAt?: number;
    deletedAt?: number;
    isDeleted?: boolean;
    pinned?: boolean;
    readBy?: string[]; // List of user IDs who have read this message
}

// --- GROUP OPERATIONS ---

export const createGroup = async (groupData: Omit<Group, 'id' | 'createdAt'>): Promise<Group> => {
    const groupRef = doc(collection(db, 'groups'));
    const group: Group = {
        ...groupData,
        id: groupRef.id,
        createdAt: Date.now()
    };

    await setDoc(groupRef, group);
    
    // Add owner as member
    await addGroupMember(groupRef.id, groupData.ownerId, 'owner');
    
    return group;
};

export const updateGroup = async (groupId: string, updates: Partial<Group>): Promise<void> => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { ...updates, updatedAt: Date.now() });
};

export const deleteGroup = async (groupId: string): Promise<void> => {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
};

export const getGroup = async (groupId: string): Promise<Group | null> => {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    return groupDoc.exists() ? groupDoc.data() as Group : null;
};

export const joinGroup = async (groupId: string, userId: string): Promise<void> => {
    await addGroupMember(groupId, userId, 'member');
};

export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    await deleteDoc(memberRef);
    
    // Update group members list
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId)
    });
};

export const addGroupMember = async (groupId: string, userId: string, role: GroupMember['role'] = 'member'): Promise<void> => {
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    const member: GroupMember = {
        userId,
        role,
        joinedAt: Date.now(),
        displayName: '', // Will be hydrated
        lastActiveAt: Date.now()
    };

    await setDoc(memberRef, member);
    
    // Update group members list
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayUnion(userId)
    });
};

export const updateMemberRole = async (groupId: string, userId: string, role: GroupMember['role']): Promise<void> => {
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    await updateDoc(memberRef, { role, lastActiveAt: Date.now() });
};

export const removeGroupMember = async (groupId: string, userId: string): Promise<void> => {
    const memberRef = doc(db, 'groups', groupId, 'members', userId);
    await deleteDoc(memberRef);
    
    // Update group members list
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId)
    });
};

// --- CHANNEL OPERATIONS ---

export const createChannel = async (groupId: string, channelData: Omit<Channel, 'id' | 'groupId' | 'createdAt'>): Promise<Channel> => {
    const channelRef = doc(collection(db, 'groups', groupId, 'channels'));
    const channel: Channel = {
        ...channelData,
        id: channelRef.id,
        groupId,
        createdAt: Date.now()
    };

    await setDoc(channelRef, channel);
    return channel;
};

export const updateChannel = async (groupId: string, channelId: string, updates: Partial<Channel>): Promise<void> => {
    const channelRef = doc(db, 'groups', groupId, 'channels', channelId);
    await updateDoc(channelRef, updates);
};

export const deleteChannel = async (groupId: string, channelId: string): Promise<void> => {
    const channelRef = doc(db, 'groups', groupId, 'channels', channelId);
    await deleteDoc(channelRef);
};

// --- MESSAGE OPERATIONS ---

export const sendGroupMessage = async (channelId: string, messageData: Omit<GroupMessage, 'id' | 'timestamp'>): Promise<GroupMessage> => {
    const messageRef = doc(collection(db, 'channels', channelId, 'messages'));
    const message: GroupMessage = {
        ...messageData,
        id: messageRef.id,
        timestamp: Date.now()
    };

    await setDoc(messageRef, message);
    return message;
};

export const editGroupMessage = async (channelId: string, messageId: string, newContent: string): Promise<void> => {
    const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
    await updateDoc(messageRef, {
        content: newContent,
        editedAt: Date.now()
    });
};

export const deleteGroupMessage = async (channelId: string, messageId: string): Promise<void> => {
    const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
    await updateDoc(messageRef, {
        isDeleted: true,
        deletedAt: Date.now(),
        content: '[message removed]'
    });
};

export const toggleGroupMessagePin = async (channelId: string, messageId: string, shouldPin: boolean): Promise<void> => {
    const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
    await updateDoc(messageRef, { pinned: shouldPin });
};

export const setGroupMessageReadReceipt = async (channelId: string, messageId: string, userId: string): Promise<void> => {
    const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) return;
        
        const message = messageDoc.data() as GroupMessage;
        const readBy = message.readBy || [];
        
        if (!readBy.includes(userId)) {
            transaction.update(messageRef, { readBy: [...readBy, userId] });
        }
    });
};

export const toggleGroupReaction = async (channelId: string, messageId: string, emoji: string, userId: string): Promise<void> => {
    const messageRef = doc(db, 'channels', channelId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) return;
        
        const message = messageDoc.data() as GroupMessage;
        const reactions = message.reactions || {};
        const emojiReactors = reactions[emoji] || [];
        
        if (emojiReactors.includes(userId)) {
            // Remove reaction
            const updatedReactors = emojiReactors.filter(id => id !== userId);
            if (updatedReactors.length === 0) {
                delete reactions[emoji];
            } else {
                reactions[emoji] = updatedReactors;
            }
        } else {
            // Add reaction
            reactions[emoji] = [...emojiReactors, userId];
        }
        
        transaction.update(messageRef, { reactions });
    });
};

export const setGroupTypingState = async (channelId: string, userId: string, isTyping: boolean): Promise<void> => {
    const typingRef = doc(db, 'channels', channelId, 'typingStates', userId);
    if (isTyping) {
        await setDoc(typingRef, {
            userId,
            timestamp: Date.now()
        });
    } else {
        await deleteDoc(typingRef).catch(() => {/* ignore if not exists */});
    }
};

export const subscribeToGroupTypingStates = (channelId: string, callback: (typingUsers: string[]) => void): (() => void) => {
    const typingRef = collection(db, 'channels', channelId, 'typingStates');
    const now = Date.now();
    const timeout = 3000; // 3 seconds

    return onSnapshot(typingRef, (snapshot) => {
        const typingUsers = snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    userId: data.userId,
                    timestamp: data.timestamp
                };
            })
            .filter(user => now - user.timestamp < timeout)
            .map(user => user.userId);
        
        callback(typingUsers);
    });
};

export const searchGroupMessages = async (channelId: string, searchTerm: string, limit: number = 20): Promise<GroupMessage[]> => {
    const messagesRef = collection(db, 'channels', channelId, 'messages');
    const q = query(
        messagesRef,
        where('content', '>=', searchTerm),
        where('content', '<=', searchTerm + '\uf8ff'),
        orderBy('content'),
        orderBy('timestamp', 'desc'),
        limit
    );
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as GroupMessage));
    } catch (error) {
        // Fallback to client-side filtering if query fails
        const allMessagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));
        const allSnapshot = await getDocs(allMessagesQuery);
        const allMessages = allSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as GroupMessage));
        
        return allMessages
            .filter(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, limit);
    }
};

// --- SUBSCRIPTIONS ---

export const subscribeToUserGroups = (userId: string, callback: (groups: Group[]) => void): (() => void) => {
    const q = query(
        collection(db, 'groups'),
        where('members', 'array-contains', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const groups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Group[];
        callback(groups);
    });
};

export const subscribeToGroupChannels = (groupId: string, callback: (channels: Channel[]) => void): (() => void) => {
    const q = query(
        collection(db, 'groups', groupId, 'channels'),
        orderBy('order', 'asc'),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const channels = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Channel[];
        callback(channels);
    });
};

export const subscribeToChannelMessages = (channelId: string, callback: (messages: GroupMessage[]) => void): (() => void) => {
    const q = query(
        collection(db, 'channels', channelId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as GroupMessage[];
        callback(messages.reverse()); // Show oldest first
    });
};

export const subscribeToGroupMembers = (groupId: string, callback: (members: (GroupMember & Partial<UserProfile>)[]) => void): (() => void) => {
    return onSnapshot(
        collection(db, 'groups', groupId, 'members'),
        async (snapshot) => {
            const memberDocs = snapshot.docs;
            const members: (GroupMember & Partial<UserProfile>)[] = [];

            for (const memberDoc of memberDocs) {
                const member = memberDoc.data() as GroupMember;
                const profile = await getUserProfile(member.userId);
                
                members.push({
                    ...member,
                    displayName: profile?.displayName || member.displayName,
                    photoURL: profile?.photoURL,
                    level: profile?.level,
                    isVerified: profile?.isVerified
                });
            }

            callback(members);
        }
    );
};

// --- UTILITIES ---

export const getGroupStats = async (groupId: string): Promise<{
    memberCount: number;
    messageCount: number;
    totalStudyTime: number;
}> => {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
        return { memberCount: 0, messageCount: 0, totalStudyTime: 0 };
    }

    const group = groupDoc.data() as Group;
    const memberCount = group.members.length;

    // Count messages across all channels
    const channelsQuery = query(collection(db, 'groups', groupId, 'channels'));
    const channelsSnapshot = await getDocs(channelsQuery);
    let messageCount = 0;

    for (const channelDoc of channelsSnapshot.docs) {
        const messagesQuery = query(collection(db, 'channels', channelDoc.id, 'messages'));
        const messagesSnapshot = await getDocs(messagesQuery);
        messageCount += messagesSnapshot.size;
    }

    return {
        memberCount,
        messageCount,
        totalStudyTime: 0 // TODO: Implement study time tracking
    };
};

export const generateInviteCode = async (groupId: string): Promise<string> => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, { inviteCode: code });
    return code;
};

export const joinGroupByInvite = async (inviteCode: string, userId: string): Promise<Group | null> => {
    const q = query(
        collection(db, 'groups'),
        where('inviteCode', '==', inviteCode),
        limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const groupDoc = snapshot.docs[0];
    const group = { id: groupDoc.id, ...groupDoc.data() } as Group;
    
    await joinGroup(group.id, userId);
    return group;
};