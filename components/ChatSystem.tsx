import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Group,
    Channel,
    GroupMessage,
    GroupMember,
    subscribeToUserGroups,
    subscribeToGroupChannels,
    subscribeToChannelMessages,
    subscribeToGroupMembers,
    createGroup,
    createChannel,
    sendGroupMessage,
    ChannelType
} from '../services/groups';
import {
    subscribeToUserChats,
    subscribeToChat,
    sendMessage,
    createOrGetDirectChat,
    getUserProfile,
    ChatRoom,
    UserProfile,
    getAllUsers
} from '../services/social';
import { GroupRail } from './chat/GroupRail';
import { ChannelList } from './chat/ChannelList';
import { MessagePane } from './chat/MessagePane';
import { MemberSidebar } from './chat/MemberSidebar';
import { NewGroupModal } from './chat/NewGroupModal';
import { CreateChannelModal } from './chat/CreateChannelModal';
import { NewDmModal } from './chat/NewDmModal';
import { Menu, X } from 'lucide-react';

export function ChatSystem() {
    const { currentUser } = useAuth();
    
    // State
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    
    // Data State
    const [groups, setGroups] = useState<Group[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [members, setMembers] = useState<(GroupMember & Partial<UserProfile>)[]>([]);
    const [messages, setMessages] = useState<GroupMessage[] | any[]>([]);
    const [dmChats, setDmChats] = useState<ChatRoom[]>([]);
import { Send, Plus, Users, MessageCircle, Search, MoreVertical, Loader2, AlertCircle } from 'lucide-react';
import { useVoiceChannel } from '../hooks/useVoiceChannel';
import { VoiceChannelPanel } from './chat/VoiceChannelPanel';

const ChatPresenceIndicator = ({ userId }: { userId: string }) => {
    const [presence, setPresence] = useState<UserPresence | null>(null);
    useEffect(() => {
        return subscribeToPresence(userId, setPresence);
    }, [userId]);
    
    if (!presence?.online) return null;
    return (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
    );
};

const ActiveChatPresenceText = ({ userId }: { userId: string }) => {
    const [presence, setPresence] = useState<UserPresence | null>(null);
    useEffect(() => {
        return subscribeToPresence(userId, setPresence);
    }, [userId]);
    
    if (presence?.online) return <p className="text-xs text-green-500 font-medium">Online</p>;
    return <p className="text-xs text-slate-500">Offline</p>;
};

export function ChatSystem() {
    const { currentUser } = useAuth();
    const voice = useVoiceChannel();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);

    // UI State
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    const [showNewDmModal, setShowNewDmModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Initial Load
    useEffect(() => {
        if (currentUser) {
            getUserProfile(currentUser.uid).then(setUserProfile);
            getAllUsers().then(setUsers);

            // Subscribe to Groups
            const unsubGroups = subscribeToUserGroups(currentUser.uid, setGroups);
            
            // Subscribe to DMs
            const unsubDMs = subscribeToUserChats(currentUser.uid, setDmChats);
            
            return () => {
                unsubGroups();
                unsubDMs();
            };
        }
    }, [currentUser]);

    // Group Selection Effect
    useEffect(() => {
        if (!activeGroupId) {
            setChannels([]);
            setMembers([]);
            return;
        }

        const unsubChannels = subscribeToGroupChannels(activeGroupId, (fetchedChannels) => {
            setChannels(fetchedChannels);
            // Auto-select first text channel if no channel selected
            if (!activeChannelId && fetchedChannels.length > 0) {
                 const currentChannelExists = fetchedChannels.some(c => c.id === activeChannelId);
                 if (!currentChannelExists) {
                     const general = fetchedChannels.find(c => c.name === 'general') || fetchedChannels.find(c => c.type === 'text');
                     if (general) setActiveChannelId(general.id);
                 }
            }
        });

        const unsubMembers = subscribeToGroupMembers(activeGroupId, async (groupMembers) => {
             // Enrich members with user profiles
             const enriched = await Promise.all(groupMembers.map(async m => {
                 const profile = await getUserProfile(m.userId);
                 return { ...m, ...profile };
             }));
             setMembers(enriched);
        });

        return () => {
            unsubChannels();
            unsubMembers();
        };
    }, [activeGroupId]);

    // Message Subscription
    useEffect(() => {
        if (!activeChannelId) {
            setMessages([]);
            return;
        }

        if (activeGroupId) {
            // Group Channel
            const unsub = subscribeToChannelMessages(activeGroupId, activeChannelId, setMessages);
            return () => unsub();
        } else {
            // DM Chat
            const unsub = subscribeToChat(activeChannelId, (msgs) => {
                setMessages(msgs);
            });
            return () => unsub();
        }
    }, [activeGroupId, activeChannelId]);

    // Actions
    const handleCreateGroup = async (name: string, description: string) => {
        if (!currentUser) return;
        try {
            const groupId = await createGroup(name, currentUser.uid, description);
            setActiveGroupId(groupId);
        } catch (error) {
            console.error("Failed to create group", error);
        }
    };

    const handleCreateChannel = async (name: string, type: ChannelType) => {
        if (!activeGroupId) return;
        try {
            await createChannel(activeGroupId, name, type);
        } catch (error) {
            console.error("Failed to create channel", error);
        }
    };
    
    const handleCreateDm = async (participantId: string) => {
        if (!currentUser) return;
        try {
            const otherUser = users.find(u => u.uid === participantId);
            if (!otherUser) return;
            
            const myProfile = userProfile || { 
                displayName: currentUser.displayName || 'User',
                photoURL: currentUser.photoURL || undefined
            };

            const chatId = await createOrGetDirectChat(
                currentUser.uid,
                { displayName: myProfile.displayName, photoURL: myProfile.photoURL },
                participantId,
                { displayName: otherUser.displayName, photoURL: otherUser.photoURL }
            );
            
            setActiveGroupId(null);
            setActiveChannelId(chatId);
            setShowNewDmModal(false);
        } catch (error) {
            console.error("Failed to create DM", error);
        }
    };

    const handleSendMessage = async (content: string) => {
        if (!currentUser || !activeChannelId) return;

        try {
             const senderName = userProfile?.displayName || currentUser.displayName || 'User';
             const senderPhoto = userProfile?.photoURL || currentUser.photoURL || undefined;

             if (activeGroupId) {
                 await sendGroupMessage(activeGroupId, activeChannelId, currentUser.uid, senderName, senderPhoto, content);
             } else {
                 await sendMessage(activeChannelId, currentUser.uid, senderName, content);
             }
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    // Helper for DM metadata
    const getChatMetadata = (chat: ChatRoom) => {
        if (chat.type === 'group') {
            return {
                name: chat.name || 'Group Chat',
                avatar: null,
            };
        }
        if (currentUser && chat.participantsInfo) {
            const otherId = chat.participants.find(id => id !== currentUser.uid);
            if (otherId && chat.participantsInfo[otherId]) {
                const info = chat.participantsInfo[otherId];
                return {
                    name: info.displayName,
                    avatar: info.photoURL || null,
                };
            }
        }
        return { name: 'Chat', avatar: null };
    };
    
    const activeGroup = groups.find(g => g.id === activeGroupId);
    const activeChannel = activeGroupId 
        ? channels.find(c => c.id === activeChannelId) 
        : dmChats.find(c => c.id === activeChannelId);
    
    let channelName = 'Chat';
    let channelType = activeGroupId ? 'text' : 'dm';

    if (activeGroupId) {
        if (activeChannel) {
            channelName = (activeChannel as Channel).name;
            channelType = (activeChannel as Channel).type;
        }
    } else {
        if (activeChannel) {
            channelName = getChatMetadata(activeChannel as ChatRoom).name;
        }
    }

    return (
        <div className="h-[calc(100vh-6rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex overflow-hidden relative">
            {/* Mobile Menu Button */}
            <button 
                className="lg:hidden absolute top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Group Rail */}
            <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} lg:flex h-full z-40`}>
                 <GroupRail 
                    groups={groups}
                    selectedGroupId={activeGroupId}
                    onSelectGroup={(id) => {
                        setActiveGroupId(id);
                        setActiveChannelId(null); // Reset channel
                        setMobileMenuOpen(false);
                    }}
                    onCreateGroup={() => setShowNewGroupModal(true)}
                 />
            </div>

            {/* Channel List */}
            <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} lg:flex h-full z-30`}>
                <ChannelList
                    mode={activeGroupId ? 'group' : 'dm'}
                    group={activeGroup}
                    channels={channels}
                    dmChats={dmChats}
                    selectedChannelId={activeChannelId}
                    onSelectChannel={(id) => {
                        setActiveChannelId(id);
                        setMobileMenuOpen(false);
                    }}
                    onCreateChannel={() => setShowCreateChannelModal(true)}
                    onCreateDM={() => setShowNewDmModal(true)}
                    currentUserId={currentUser?.uid}
                    getChatMetadata={getChatMetadata}
                />
            </div>

            {/* Message Pane */}
            <MessagePane
                channelName={channelName}
                channelType={channelType as any}
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUser={userProfile}
            />
                        {/* Voice Channel Panel */}
                        <VoiceChannelPanel channelId={activeChatId} voice={voice} />

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderId === currentUser?.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] rounded-2xl p-4 ${isMe
                                                ? 'bg-indigo-600 text-white rounded-br-none'
                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                                            }`}>
                                            {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.senderName}</p>}
                                            <p>{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

            {/* Member Sidebar (Only for groups) */}
            {activeGroupId && (
                <MemberSidebar members={members} />
            )}

            {/* Modals */}
            {showNewGroupModal && (
                <NewGroupModal 
                    onClose={() => setShowNewGroupModal(false)}
                    onCreate={handleCreateGroup}
                />
            )}
            
            {showCreateChannelModal && (
                <CreateChannelModal
                    onClose={() => setShowCreateChannelModal(false)}
                    onCreate={handleCreateChannel}
                />
            )}

            {showNewDmModal && (
                <NewDmModal
                    onClose={() => setShowNewDmModal(false)}
                    onSelectUser={handleCreateDm}
                    currentUserId={currentUser?.uid}
                />
            )}
        </div>
    );
}
