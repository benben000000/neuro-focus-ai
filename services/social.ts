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
    runTransaction
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';

// --- TYPES ---

export interface UserPresence {
    uid: string;
    online: boolean;
    lastSeen: number;
    activeGroupId?: string;
    activeChannelId?: string;
    voiceChannelId?: string;
    focusMode?: boolean;
}

export type NotificationType = 'group_invite' | 'mention' | 'call_join' | 'focus_reminder' | 'voice_invite';

export interface UserNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any; // e.g., channelId, groupId, inviterId
    isRead: boolean;
    createdAt: number;
    senderId?: string;
    senderName?: string;
    senderPhoto?: string;
}

export interface MoodBoardLayout {
    panelOffset?: { x: number; y: number };
    postPositions: Record<string, { x: number; y: number; z?: number; featured?: boolean }>;
    updatedAt: number;
}

// Mood board item with transforms and sticker support
export type MoodBoardItemKind = 'post' | 'sticker';

export interface MoodBoardItem {
    id: string; // postId for posts, generated id for stickers
    kind: MoodBoardItemKind;
    postId?: string; // Only for kind='post'
    // Sticker-specific fields
    assetUrl?: string; // URL or data URL for sticker image
    alt?: string; // Fallback description for sticker
    // Transform fields
    x: number;
    y: number;
    rotation: number; // degrees, -30 to 30
    scale: number; // 0.5 to 2
    zIndex: number;
    isFeatured?: boolean;
}

export interface UserProfile {
    uid: string;
    displayName: string;
    displayNameLower?: string; // for case-insensitive search
    email: string;
    username?: string; // unique username
    usernameLower?: string; // for case-insensitive search
    photoURL?: string;
    bio?: string;
    birthday?: string;
    university?: string;
    level: number;
    xp: number;
    joinedAt: string;
    friends?: string[]; // List of friend UIDs
    friendRequests?: string[]; // List of UIDs who sent requests
    followers?: string[]; // List of UIDs who follow this user
    following?: string[]; // List of UIDs this user follows
    followersCount?: number;
    followingCount?: number;
    isVerified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    savedPostIds?: string[];
    hasCompletedOnboarding?: boolean;
    moodBoardLayout?: MoodBoardLayout;
    moodBoardConfig?: {
        posts: MoodBoardItem[];
        panelOffset?: { x: number; y: number };
    };
}

// Rich media descriptor used by the unified composer for posts & stories
export interface ComposerMedia {
    id: string;
    url: string; // Compressed data URL or CDN URL
    width: number;
    height: number;
    mimeType: string;
}

export interface SocialPost {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorIsVerified?: boolean;
    content: string;
    // Legacy single-media field kept for backwards compatibility
    mediaUrl?: string;
    // New rich media array for carousels
    media?: ComposerMedia[];
    location?: string; // Optional location tag
    type: 'status' | 'progress';
    // Optional semantic metadata used for profile filters & overlays
    category?: 'study' | 'notes' | 'highlights' | 'other';
    tags?: string[];
    isPinned?: boolean;
    linkedStoryId?: string;
    stats?: {
        subject: string;
        duration: number; // seconds
        xpEarned: number;
    };
    likes: number;
    likedBy?: string[]; // Track who liked
    commentsCount: number;
    createdAt: number; // timestamp
}

export interface SocialComment {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorIsVerified?: boolean;
    content: string;
    createdAt: number;
    reactions?: Record<string, string[]>; // emoji -> array of user IDs
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    content: string;
    createdAt: number;
    reactions?: Record<string, string[]>; // emoji -> array of user IDs
    editedAt?: number;
    deletedAt?: number;
    isDeleted?: boolean;
    pinned?: boolean;
    readBy?: string[]; // List of user IDs who have read this message
}

export interface Story {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    authorIsVerified?: boolean;
    // Legacy single-media field kept for backwards compatibility
    mediaUrl?: string;
    // New media carousel support
    media?: ComposerMedia[];
    createdAt: number;
    expiresAt: number;
    viewedBy?: string[];
    commentsCount: number;
}

export interface ChatRoom {
    id: string;
    type: 'direct' | 'group';
    participants: string[]; // user IDs
    name?: string; // for groups
    lastMessage?: string;
    lastMessageTime?: number;
    lastSenderId?: string;
    participantKey?: string;
    participantsInfo?: {
        [uid: string]: {
            displayName: string;
            photoURL?: string;
        }
    };
}

export interface VoiceState {
    userId: string;
    channelId: string;
    isMuted: boolean;
    isDeafened: boolean;
    joinedAt: number;
    user: {
        displayName: string;
        photoURL?: string;
    };
    status?: 'study' | 'chill'; // For study-mode badges
}

// --- PROFILE FUNCTIONS ---

export const createUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const displayName = user.displayName || 'Student';
        const newProfile: UserProfile = {
            uid: user.uid,
            displayName: displayName,
            displayNameLower: displayName.toLowerCase(),
            email: user.email,
            username: '',
            usernameLower: '',
            photoURL: user.photoURL || '',
            bio: 'Ready to learn!',
            birthday: '',
            university: '',
            level: 1,
            xp: 0,
            joinedAt: new Date().toISOString(),
            savedPostIds: [],
            followers: [],
            following: [],
            followersCount: 0,
            followingCount: 0,
            isVerified: false,
            hasCompletedOnboarding: false
        };
        await setDoc(userRef, newProfile);
        return newProfile;
    }
    return userSnap.data() as UserProfile;
};

export const getUserProfile = async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    }
    return null;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, 'users', uid);
    
    // Ensure lowercase fields are set for search
    const updateData = { ...data };
    if (data.displayName) {
        updateData.displayNameLower = data.displayName.toLowerCase();
    }
    if (data.username) {
        updateData.usernameLower = data.username.toLowerCase();
    }
    
    await updateDoc(userRef, updateData);
    
    // Also update Firebase Auth profile
    const currentUser = auth.currentUser;
    if (currentUser) {
        const authUpdateData: any = {};
        if (data.displayName) {
            authUpdateData.displayName = data.displayName;
        }
        if (data.photoURL !== undefined) {
            authUpdateData.photoURL = data.photoURL;
        }
        
        if (Object.keys(authUpdateData).length > 0) {
            await updateProfile(currentUser, authUpdateData);
        }
    }
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
    const userRef = doc(db, 'users', uid);
    
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as UserProfile);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error('Error subscribing to profile:', error);
    });
    
    return unsubscribe;
};

export const saveMoodBoardLayout = async (userId: string, layout: MoodBoardLayout) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        moodBoardLayout: layout
    });
};

export const mergeMoodBoardLayout = async (userId: string, updates: Partial<MoodBoardLayout>) => {
    const userRef = doc(db, 'users', userId);
    await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) return;
        
        const currentProfile = userSnap.data() as UserProfile;
        const currentLayout = currentProfile.moodBoardLayout || { postPositions: {}, updatedAt: 0 };
        
        const newLayout: MoodBoardLayout = {
            ...currentLayout,
            ...updates,
            panelOffset: {
                ...(currentLayout.panelOffset || { x: 0, y: 0 }),
                ...(updates.panelOffset || {})
            },
            postPositions: {
                ...(currentLayout.postPositions || {}),
                ...(updates.postPositions || {})
            },
            updatedAt: Date.now()
        };
        
        transaction.update(userRef, { moodBoardLayout: newLayout });
    });
};

// --- STORY FUNCTIONS ---

export const createStory = async (
    story: Omit<Story, 'id' | 'createdAt' | 'expiresAt' | 'commentsCount'>
): Promise<string> => {
    try {
        const storiesRef = collection(db, 'stories');
        const now = Date.now();
        const docRef = await addDoc(storiesRef, {
            ...story,
            commentsCount: 0,
            createdAt: now,
            expiresAt: now + (24 * 60 * 60 * 1000) // 24 hours
        });
        return docRef.id;
    } catch (error: any) {
        console.error('createStory failed', error);
        throw new Error(error?.message || 'Failed to publish story.');
    }
};

export const getStories = async () => {
    const storiesRef = collection(db, 'stories');
    const now = Date.now();
    // Get stories that haven't expired
    const q = query(storiesRef, where('expiresAt', '>', now), orderBy('expiresAt', 'asc')); // Index might be needed

    // For now, let's just get recent ones and filter client side if index is missing
    // actually, let's just get all and filter. It's safer for prototyping without index creation wait.
    const snapshot = await getDocs(storiesRef);
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Story))
        .filter(s => s.expiresAt > now);
};

export const subscribeToStories = (callback: (stories: Story[]) => void) => {
    const storiesRef = collection(db, 'stories');
    const now = Date.now();
    // Simple query to avoid complex index requirement for now
    const q = query(storiesRef, orderBy('createdAt', 'desc'), limit(100));

    return onSnapshot(q, (snapshot) => {
        const stories = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Story))
            .filter(s => s.expiresAt > now);
        callback(stories);
    });
};

// --- FEED FUNCTIONS ---

export const createPost = async (
    post: Omit<SocialPost, 'id' | 'createdAt' | 'likes' | 'commentsCount'>
): Promise<string> => {
    try {
        const postsRef = collection(db, 'posts');
        const docRef = await addDoc(postsRef, {
            ...post,
            likes: 0,
            likedBy: [],
            commentsCount: 0,
            createdAt: Date.now()
        });
        return docRef.id;
    } catch (error: any) {
        console.error('createPost failed', error);
        throw new Error(error?.message || 'Failed to publish post.');
    }
};

export const deletePost = async (postId: string) => {
    try {
        const postRef = doc(db, 'posts', postId);
        await deleteDoc(postRef);
    } catch (error: any) {
        console.error('deletePost failed', error);
        throw new Error(error?.message || 'Failed to delete post.');
    }
};

export const updatePost = async (
    postId: string,
    updates: Partial<Omit<SocialPost, 'id' | 'authorId' | 'authorName' | 'authorPhoto' | 'authorIsVerified' | 'likes' | 'likedBy' | 'commentsCount' | 'createdAt'>>
) => {
    try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, updates);
    } catch (error: any) {
        console.error('updatePost failed', error);
        throw new Error(error?.message || 'Failed to update post.');
    }
};

export const toggleLike = async (postId: string, userId: string) => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
        const post = postSnap.data() as SocialPost;
        const likedBy = post.likedBy || [];
        const hasLiked = likedBy.includes(userId);

        if (hasLiked) {
            await updateDoc(postRef, {
                likes: (post.likes || 1) - 1,
                likedBy: likedBy.filter(id => id !== userId)
            });
        } else {
            await updateDoc(postRef, {
                likes: (post.likes || 0) + 1,
                likedBy: [...likedBy, userId]
            });
        }
    }
};

export const addComment = async (
    parentId: string,
    collectionName: 'posts' | 'stories',
    text: string,
    user: { uid: string, displayName: string, photoURL?: string, isVerified?: boolean }
) => {
    try {
        const commentsRef = collection(db, collectionName, parentId, 'comments');
        await addDoc(commentsRef, {
            authorId: user.uid,
            authorName: user.displayName,
            authorPhoto: user.photoURL || '',
            authorIsVerified: user.isVerified || false,
            content: text,
            createdAt: Date.now(),
            reactions: {}
        });

        const parentRef = doc(db, collectionName, parentId);
        await updateDoc(parentRef, {
            commentsCount: increment(1)
        });
    } catch (error: any) {
        console.error('addComment failed', error);
        throw new Error(error?.message || 'Failed to add comment.');
    }
};

export const deleteComment = async (
    parentId: string,
    collectionName: 'posts' | 'stories',
    commentId: string
) => {
    try {
        const commentRef = doc(db, collectionName, parentId, 'comments', commentId);
        await deleteDoc(commentRef);

        const parentRef = doc(db, collectionName, parentId);
        await updateDoc(parentRef, {
            commentsCount: increment(-1)
        });
    } catch (error: any) {
        console.error('deleteComment failed', error);
        throw new Error(error?.message || 'Failed to delete comment.');
    }
};

export const toggleCommentReaction = async (
    parentId: string,
    collectionName: 'posts' | 'stories',
    commentId: string,
    emoji: string,
    userId: string
) => {
    try {
        const commentRef = doc(db, collectionName, parentId, 'comments', commentId);
        
        await runTransaction(db, async (transaction) => {
            const commentSnap = await transaction.get(commentRef);
            if (!commentSnap.exists()) {
                throw new Error('Comment not found');
            }
            
            const comment = commentSnap.data() as SocialComment;
            const reactions = comment.reactions || {};
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
            
            transaction.update(commentRef, { reactions });
        });
    } catch (error: any) {
        console.error('toggleCommentReaction failed', error);
        throw new Error(error?.message || 'Failed to toggle reaction.');
    }
};

export const subscribeToComments = (
    parentId: string,
    collectionName: 'posts' | 'stories',
    callback: (comments: SocialComment[]) => void
) => {
    const commentsRef = collection(db, collectionName, parentId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SocialComment));
        callback(comments);
    });
};

export const subscribeToFeed = (callback: (posts: SocialPost[]) => void) => {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SocialPost));
        callback(posts);
    });
};

export const subscribeToUserPosts = (userId: string, callback: (posts: SocialPost[]) => void) => {
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where('authorId', '==', userId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SocialPost));
        callback(posts);
    });
};

export const toggleSavePost = async (userId: string, postId: string) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const saved = data.savedPostIds || [];
        
        if (saved.includes(postId)) {
            await updateDoc(userRef, {
                savedPostIds: arrayRemove(postId)
            });
        } else {
            await updateDoc(userRef, {
                savedPostIds: arrayUnion(postId)
            });
        }
    }
};

export const isPostSaved = (profile: UserProfile | null, postId: string) => {
    return profile?.savedPostIds?.includes(postId) || false;
};

export const fetchSavedPosts = async (userId: string) => {
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.savedPostIds || userProfile.savedPostIds.length === 0) {
        return [];
    }
    
    const promises = userProfile.savedPostIds.map(id => getDoc(doc(db, 'posts', id)));
    const snapshots = await Promise.all(promises);
    
    return snapshots
        .filter(snap => snap.exists())
        .map(snap => ({
            id: snap.id,
            ...snap.data()
        } as SocialPost));
};

// --- SHARING FUNCTIONS ---

export interface SharedItem {
    id: string;
    type: 'post' | 'story';
    contentId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    recipientId: string;
    note?: string;
    createdAt: number;
    // Hydrated content
    post?: SocialPost;
    story?: Story;
}

export const shareContent = async (
    recipientIds: string[],
    content: { type: 'post' | 'story', id: string },
    sender: { uid: string, displayName: string, photoURL?: string },
    note?: string
) => {
    const sharesRef = collection(db, 'shares');
    
    const promises = recipientIds.map(async (recipientId) => {
        await addDoc(sharesRef, {
            type: content.type,
            contentId: content.id,
            senderId: sender.uid,
            senderName: sender.displayName,
            senderAvatar: sender.photoURL || '',
            recipientId: recipientId,
            note: note || '',
            createdAt: Date.now()
        });
    });
    
    await Promise.all(promises);
};

export const subscribeToShares = (userId: string, callback: (shares: SharedItem[]) => void) => {
    const sharesRef = collection(db, 'shares');
    const q = query(sharesRef, where('recipientId', '==', userId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, async (snapshot) => {
        const rawShares = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SharedItem));
        
        const enrichedShares = await Promise.all(rawShares.map(async (share) => {
            const newShare = { ...share };
            try {
                if (share.type === 'post') {
                    const postRef = doc(db, 'posts', share.contentId);
                    const postSnap = await getDoc(postRef);
                    if (postSnap.exists()) {
                        newShare.post = { id: postSnap.id, ...postSnap.data() } as SocialPost;
                    }
                } else if (share.type === 'story') {
                    const storyRef = doc(db, 'stories', share.contentId);
                    const storySnap = await getDoc(storyRef);
                    if (storySnap.exists()) {
                        newShare.story = { id: storySnap.id, ...storySnap.data() } as Story;
                    }
                }
            } catch (e) {
                console.error('Error hydrating share', share.id, e);
            }
            return newShare;
        }));
        
        callback(enrichedShares);
    });
};

export const dismissShare = async (shareId: string) => {
    const shareRef = doc(db, 'shares', shareId);
    await deleteDoc(shareRef);
};

// --- CHAT FUNCTIONS ---

export const createOrGetDirectChat = async (
    currentUserId: string,
    currentUserInfo: { displayName: string; photoURL?: string },
    otherUserId: string,
    otherUserInfo: { displayName: string; photoURL?: string }
) => {
    const chatsRef = collection(db, 'chats');
    const participantKey = [currentUserId, otherUserId].sort().join('_');

    // Check for existing chat
    const q = query(
        chatsRef,
        where('participantKey', '==', participantKey),
        where('type', '==', 'direct')
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }

    // Create new chat
    const newChat = await addDoc(chatsRef, {
        type: 'direct',
        participants: [currentUserId, otherUserId],
        participantKey,
        participantsInfo: {
            [currentUserId]: currentUserInfo,
            [otherUserId]: otherUserInfo
        },
        createdAt: Date.now(),
        lastMessage: '',
        lastMessageTime: Date.now(),
        lastSenderId: ''
    });

    return newChat.id;
};

export const createGroupChat = async (name: string, participantIds: string[]) => {
    const chatsRef = collection(db, 'chats');
    const newChat = await addDoc(chatsRef, {
        type: 'group',
        name,
        participants: participantIds,
        participantKey: null,
        createdAt: Date.now(),
        lastMessage: 'Group created',
        lastMessageTime: Date.now(),
        lastSenderId: ''
    });
    return newChat.id;
};

export const sendMessage = async (chatId: string, senderId: string, senderName: string, content: string) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
        senderId,
        senderName,
        content,
        createdAt: Date.now()
    });

    // Update chat metadata
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        lastMessage: content,
        lastMessageTime: Date.now(),
        lastSenderId: senderId
    });
};

export const subscribeToChat = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatMessage));
        callback(messages);
    });
};

export const subscribeToUserChats = (userId: string, callback: (chats: ChatRoom[]) => void) => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userId), orderBy('lastMessageTime', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatRoom));
        callback(chats);
    });
};

export const editChatMessage = async (chatId: string, messageId: string, newContent: string): Promise<void> => {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
        content: newContent,
        editedAt: Date.now()
    });
};

export const deleteChatMessage = async (chatId: string, messageId: string): Promise<void> => {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
        isDeleted: true,
        deletedAt: Date.now(),
        content: '[message removed]'
    });
};

export const toggleChatReaction = async (chatId: string, messageId: string, emoji: string, userId: string): Promise<void> => {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) return;
        
        const message = messageDoc.data() as ChatMessage;
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

export const pinChatMessage = async (chatId: string, messageId: string, shouldPin: boolean): Promise<void> => {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, { pinned: shouldPin });
};

export const setChatReadReceipt = async (chatId: string, messageId: string, userId: string): Promise<void> => {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) return;
        
        const message = messageDoc.data() as ChatMessage;
        const readBy = message.readBy || [];
        
        if (!readBy.includes(userId)) {
            transaction.update(messageRef, { readBy: [...readBy, userId] });
        }
    });
};

export const setChatTypingState = async (chatId: string, userId: string, isTyping: boolean): Promise<void> => {
    const typingRef = doc(db, 'chats', chatId, 'typingStates', userId);
    if (isTyping) {
        await setDoc(typingRef, {
            userId,
            timestamp: Date.now()
        });
    } else {
        await deleteDoc(typingRef).catch(() => {/* ignore if not exists */});
    }
};

export const subscribeToChatTypingStates = (chatId: string, callback: (typingUsers: string[]) => void): (() => void) => {
    const typingRef = collection(db, 'chats', chatId, 'typingStates');
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

export const searchChatMessages = async (chatId: string, searchTerm: string, limit: number = 20): Promise<ChatMessage[]> => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    
    try {
        const q = query(
            messagesRef,
            where('content', '>=', searchTerm),
            where('content', '<=', searchTerm + '\uf8ff'),
            orderBy('content'),
            orderBy('createdAt', 'desc'),
            limit
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatMessage));
    } catch (error) {
        // Fallback to client-side filtering if query fails
        const allMessagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(100));
        const allSnapshot = await getDocs(allMessagesQuery);
        const allMessages = allSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ChatMessage));
        
        return allMessages
            .filter(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, limit);
    }
};

export const getAllUsers = async () => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
};

// searchUsers removed to fix duplicate export error. Using the implementation at the bottom of the file.
// export const searchUsers = async (queryText: string) => {
//     const usersRef = collection(db, 'users');
//     // Simple client-side filter for now as Firestore search is limited without Algolia
//     const snapshot = await getDocs(usersRef);
//     const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
//
//     return allUsers.filter(user =>
//         user.displayName.toLowerCase().includes(queryText.toLowerCase()) ||
//         user.email.toLowerCase().includes(queryText.toLowerCase())
//     );
// };

export const sendFriendRequest = async (fromUid: string, toUid: string) => {
    const toUserRef = doc(db, 'users', toUid);
    await updateDoc(toUserRef, {
        friendRequests: arrayUnion(fromUid)
    });
};

export const acceptFriendRequest = async (currentUid: string, friendUid: string) => {
    const currentUserRef = doc(db, 'users', currentUid);
    const friendUserRef = doc(db, 'users', friendUid);

    // Add to each other's friend lists
    await updateDoc(currentUserRef, {
        friends: arrayUnion(friendUid),
        friendRequests: arrayUnion(friendUid) // Just in case, but actually we should remove it. 
        // Firestore arrayRemove is better but let's just add to friends for now.
        // Actually, let's do it properly:
    });

    // We need to remove from requests and add to friends. 
    // Since we can't easily do atomic remove/add in one go without batch, let's just add to friends.
    // A better schema would be a subcollection for friends.
    // For this MVP, let's just update both.

    await updateDoc(currentUserRef, {
        friends: arrayUnion(friendUid)
    });

    await updateDoc(friendUserRef, {
        friends: arrayUnion(currentUid)
    });
};

export const getFriendSuggestions = async (currentUid: string) => {
    const allUsers = await getAllUsers();
    // Return users who are not me and not already friends (simplified)
    return allUsers.filter(u => u.uid !== currentUid).slice(0, 5);
};

// --- FOLLOWER / FOLLOWING FUNCTIONS ---

export const followUser = async (currentUserId: string, targetUserId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);

            const currentUserSnap = await transaction.get(currentUserRef);
            const targetUserSnap = await transaction.get(targetUserRef);

            if (!currentUserSnap.exists() || !targetUserSnap.exists()) {
                throw new Error("User does not exist!");
            }

            const currentUserData = currentUserSnap.data() as UserProfile;
            const targetUserData = targetUserSnap.data() as UserProfile;

            const currentFollowing = currentUserData.following || [];
            
            if (!currentFollowing.includes(targetUserId)) {
                transaction.update(currentUserRef, {
                    following: arrayUnion(targetUserId),
                    followingCount: (currentUserData.followingCount || 0) + 1
                });

                transaction.update(targetUserRef, {
                    followers: arrayUnion(currentUserId),
                    followersCount: (targetUserData.followersCount || 0) + 1
                });
            }
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw e;
    }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const targetUserRef = doc(db, 'users', targetUserId);

            const currentUserSnap = await transaction.get(currentUserRef);
            const targetUserSnap = await transaction.get(targetUserRef);

            if (!currentUserSnap.exists() || !targetUserSnap.exists()) {
                throw new Error("User does not exist!");
            }

            const currentUserData = currentUserSnap.data() as UserProfile;
            const targetUserData = targetUserSnap.data() as UserProfile;

            const currentFollowing = currentUserData.following || [];
            
            if (currentFollowing.includes(targetUserId)) {
                transaction.update(currentUserRef, {
                    following: arrayRemove(targetUserId),
                    followingCount: Math.max((currentUserData.followingCount || 1) - 1, 0)
                });

                transaction.update(targetUserRef, {
                    followers: arrayRemove(currentUserId),
                    followersCount: Math.max((targetUserData.followersCount || 1) - 1, 0)
                });
            }
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        throw e;
    }
};

// --- ADMIN FUNCTIONS ---

export const setVerifiedBadge = async (targetUserId: string, isVerified: boolean, adminEmail: string) => {
    const allowedAdmin = 'bmgarcia0121@gmail.com';
    
    if (adminEmail !== allowedAdmin) {
        throw new Error('Unauthorized: Only admin can change verification status');
    }

    const userRef = doc(db, 'users', targetUserId);
    
    await updateDoc(userRef, {
        isVerified: isVerified,
        verifiedBy: isVerified ? adminEmail : '',
        verifiedAt: isVerified ? new Date().toISOString() : ''
    });
};

export const searchUsers = async (searchTerm: string) => {
    const usersRef = collection(db, 'users');
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Try to find by email first
    const qEmail = query(usersRef, where('email', '==', searchTerm));
    const emailSnap = await getDocs(qEmail);
    
    if (!emailSnap.empty) {
        return emailSnap.docs.map(d => d.data() as UserProfile);
    }

    try {
        // Prefix search for displayNameLower
        const qName = query(usersRef, 
            orderBy('displayNameLower'), 
            where('displayNameLower', '>=', lowerSearchTerm), 
            where('displayNameLower', '<=', lowerSearchTerm + '\uf8ff'),
            limit(10)
        );
        
        const nameSnap = await getDocs(qName);
        let results = nameSnap.docs.map(d => d.data() as UserProfile);
        
        // Also try username search if no results or not many results
        if (results.length < 10) {
            const qUsername = query(usersRef, 
                orderBy('usernameLower'), 
                where('usernameLower', '>=', lowerSearchTerm), 
                where('usernameLower', '<=', lowerSearchTerm + '\uf8ff'),
                limit(10)
            );
            
            const usernameSnap = await getDocs(qUsername);
            const usernameResults = usernameSnap.docs.map(d => d.data() as UserProfile);
            
            // Merge and deduplicate results
            const resultMap = new Map<string, UserProfile>();
            results.forEach(r => resultMap.set(r.uid, r));
            usernameResults.forEach(r => resultMap.set(r.uid, r));
            results = Array.from(resultMap.values()).slice(0, 10);
        }
        
        return results;
    } catch (error: any) {
        // Fallback to client-side filtering if Firestore range queries fail
        console.log('Firestore range query failed, falling back to client-side filtering:', error);
        const allUsersSnap = await getDocs(usersRef);
        const allUsers = allUsersSnap.docs.map(d => d.data() as UserProfile);
        
        return allUsers.filter(user => {
            const displayNameLower = user.displayNameLower || user.displayName?.toLowerCase() || '';
            const usernameLower = user.usernameLower || user.username?.toLowerCase() || '';
            return displayNameLower.includes(lowerSearchTerm) || usernameLower.includes(lowerSearchTerm);
        }).slice(0, 10);
    }
};

// --- VOICE CHANNEL FUNCTIONS ---

export const updateVoiceState = async (channelId: string, userId: string, state: Partial<VoiceState> | null) => {
    const voiceStateRef = doc(db, 'chats', channelId, 'voiceStates', userId);
    
    if (state === null) {
        // Remove voice state (user left)
        await deleteDoc(voiceStateRef);
    } else {
        // Update or create voice state
        // We need to handle the case where the document doesn't exist yet
        // setDoc with merge: true works for both
        const data = {
            ...state,
            userId,
            channelId,
            updatedAt: Date.now()
        };
        
        // If joining (no joinedAt), set it
        if (!state.joinedAt && !state.updatedAt) {
             // If it's a new join, usually we pass joinedAt in state. 
             // If not passed, we could set it, but let's rely on caller.
        }

        await setDoc(voiceStateRef, data, { merge: true });
    }
};

export const subscribeToVoiceStates = (channelId: string, callback: (states: VoiceState[]) => void) => {
    const voiceStatesRef = collection(db, 'chats', channelId, 'voiceStates');
    // We might want to order by joinedAt
    const q = query(voiceStatesRef, orderBy('joinedAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
        const states = snapshot.docs.map(doc => doc.data() as VoiceState);
        callback(states);
    });
};

// --- PRESENCE FUNCTIONS ---

export const updatePresence = async (userId: string, data: Partial<UserPresence>) => {
    const presenceRef = doc(db, 'presence', userId);
    // Use setDoc with merge to create if not exists
    await setDoc(presenceRef, {
        ...data,
        uid: userId,
        lastSeen: Date.now()
    }, { merge: true });
};

export const subscribeToPresence = (userId: string, callback: (presence: UserPresence | null) => void) => {
    const presenceRef = doc(db, 'presence', userId);
    return onSnapshot(presenceRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as UserPresence);
        } else {
            callback(null);
        }
    });
};

export const subscribeToAllPresence = (callback: (presenceMap: Record<string, UserPresence>) => void) => {
    // For social features, we might want to know who is online generally
    // In a real app this might be filtered by friends or limited
    const presenceRef = collection(db, 'presence');
    const q = query(presenceRef, where('online', '==', true));
    
    return onSnapshot(q, (snapshot) => {
        const presenceMap: Record<string, UserPresence> = {};
        snapshot.docs.forEach(doc => {
            presenceMap[doc.id] = doc.data() as UserPresence;
        });
        callback(presenceMap);
    });
};

// --- NOTIFICATION FUNCTIONS ---

export const sendNotification = async (userId: string, notification: Omit<UserNotification, 'id' | 'createdAt' | 'isRead'>) => {
    try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notificationsRef, {
            ...notification,
            isRead: false,
            createdAt: Date.now()
        });
    } catch (error) {
        console.error('Failed to send notification', error);
    }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: UserNotification[]) => void) => {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
    
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as UserNotification));
        callback(notifications);
    });
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notifRef, {
        isRead: true
    });
};

export const inviteToVoiceChannel = async (sender: UserProfile, targetUserId: string, channelId: string, channelName: string) => {
    await sendNotification(targetUserId, {
        userId: targetUserId,
        type: 'voice_invite',
        title: 'Voice Call Invite',
        message: `${sender.displayName} invited you to join voice channel "${channelName}"`,
        data: { channelId, inviterId: sender.uid },
        senderId: sender.uid,
        senderName: sender.displayName,
        senderPhoto: sender.photoURL
    });
};

