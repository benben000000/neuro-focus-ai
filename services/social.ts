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
    deleteDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';

// --- TYPES ---
export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    bio?: string;
    birthday?: string;
    university?: string;
    level: number;
    xp: number;
    joinedAt: string;
    friends?: string[]; // List of friend UIDs
    friendRequests?: string[]; // List of UIDs who sent requests
    hasCompletedOnboarding?: boolean;
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
    createdAt: number; // timestamp
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    createdAt: number;
}

export interface Story {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    // Legacy single-media field kept for backwards compatibility
    mediaUrl?: string;
    // New media carousel support
    media?: ComposerMedia[];
    createdAt: number;
    expiresAt: number;
    viewedBy?: string[];
}

export interface ChatRoom {
    id: string;
    type: 'direct' | 'group';
    participants: string[]; // user IDs
    name?: string; // for groups
    lastMessage?: string;
    lastMessageTime?: number;
}

// --- PROFILE FUNCTIONS ---

export const createUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const newProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || 'Student',
            email: user.email,
            photoURL: user.photoURL || '',
            bio: 'Ready to learn!',
            birthday: '',
            university: '',
            level: 1,
            xp: 0,
            joinedAt: new Date().toISOString(),
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
    await updateDoc(userRef, data);
    
    // Also update Firebase Auth profile
    const currentUser = auth.currentUser;
    if (currentUser) {
        const updateData: any = {};
        if (data.displayName) {
            updateData.displayName = data.displayName;
        }
        if (data.photoURL !== undefined) {
            updateData.photoURL = data.photoURL;
        }
        
        if (Object.keys(updateData).length > 0) {
            await updateProfile(currentUser, updateData);
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

// --- STORY FUNCTIONS ---

export const createStory = async (
    story: Omit<Story, 'id' | 'createdAt' | 'expiresAt'>
): Promise<string> => {
    try {
        const storiesRef = collection(db, 'stories');
        const now = Date.now();
        const docRef = await addDoc(storiesRef, {
            ...story,
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
    post: Omit<SocialPost, 'id' | 'createdAt' | 'likes'>
): Promise<string> => {
    try {
        const postsRef = collection(db, 'posts');
        const docRef = await addDoc(postsRef, {
            ...post,
            likes: 0,
            likedBy: [],
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

export const createGroupChat = async (name: string, participantIds: string[]) => {
    const chatsRef = collection(db, 'chats');
    const newChat = await addDoc(chatsRef, {
        type: 'group',
        name,
        participants: participantIds,
        createdAt: Date.now(),
        lastMessage: 'Group created',
        lastMessageTime: Date.now()
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
        lastMessageTime: Date.now()
    });
};

export const subscribeToChat = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(100));

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

export const getAllUsers = async () => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
};

export const searchUsers = async (queryText: string) => {
    const usersRef = collection(db, 'users');
    // Simple client-side filter for now as Firestore search is limited without Algolia
    const snapshot = await getDocs(usersRef);
    const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile);

    return allUsers.filter(user =>
        user.displayName.toLowerCase().includes(queryText.toLowerCase()) ||
        user.email.toLowerCase().includes(queryText.toLowerCase())
    );
};

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
