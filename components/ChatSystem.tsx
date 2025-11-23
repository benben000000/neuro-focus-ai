import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    getAllUsers,
    subscribeToPresence,
    UserPresence
} from '../services/social';
import { GroupRail } from './chat/GroupRail';
import { ChannelList } from './chat/ChannelList';
import { MessagePane } from './chat/MessagePane';
import { MemberSidebar } from './chat/MemberSidebar';
import { NewGroupModal } from './chat/NewGroupModal';
import { CreateChannelModal } from './chat/CreateChannelModal';
import { NewDmModal } from './chat/NewDmModal';
import { Menu, X, Send, Plus, Users, MessageCircle, Search, MoreVertical, Loader2, AlertCircle } from 'lucide-react';
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
    
    if (!presence?.online) return <p className="text-xs text-green-500 font-medium">Online</p>;
    return <p className="text-xs text-slate-500">Offline</p>;
};

export function ChatSystem() {
    const { currentUser } = useAuth();
    const voice = useVoiceChannel();
    
    // State
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    
    // Data State
    const [groups, setGroups] = useState<Group[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [members, setMembers] = useState<(GroupMember & Partial<UserProfile>)[]>([]);
    const [messages, setMessages] = useState<GroupMessage[] | any[]>([]);
    const [dmChats, setDmChats] = useState<ChatRoom[]>([]);
    
    // Chat State
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
                const textChannel = fetchedChannels.find(c => c.type === 'text');
                if (textChannel) setActiveChannelId(textChannel.id);
            }
        });

        const unsubMembers = subscribeToGroupMembers(activeGroupId, setMembers);

        return () => {
            unsubChannels();
            unsubMembers();
        };
    }, [activeGroupId, activeChannelId]);

    // Channel Selection Effect
    useEffect(() => {
        if (!activeChannelId) {
            setMessages([]);
            return;
        }

        const unsub = subscribeToChannelMessages(activeChannelId, setMessages);
        return unsub;
    }, [activeChannelId]);

    // Chat Selection Effect
    useEffect(() => {
        if (!activeChatId) {
            setChatMessages([]);
            return;
        }

        const unsub = subscribeToChat(activeChatId, setChatMessages);
        return unsub;
    }, [activeChatId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatMessages]);

    const handleSendMessage = useCallback(async () => {
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            if (activeChannelId) {
                await sendGroupMessage(activeChannelId, newMessage.trim());
            } else if (activeChatId) {
                await sendMessage(activeChatId, newMessage.trim());
            }
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    }, [newMessage, isSending, activeChannelId, activeChatId]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const handleCreateGroup = useCallback(async (groupData: { name: string; description: string }) => {
        if (!currentUser) return;
        
        try {
            const newGroup = await createGroup({
                name: groupData.name,
                description: groupData.description,
                createdBy: currentUser.uid,
                members: [currentUser.uid],
                type: 'study'
            });
            
            // Create default channels
            await createChannel(newGroup.id, {
                name: 'general',
                type: 'text' as ChannelType,
                createdBy: currentUser.uid
            });
            
            await createChannel(newGroup.id, {
                name: 'voice',
                type: 'voice' as ChannelType,
                createdBy: currentUser.uid
            });
            
            setShowNewGroupModal(false);
            setActiveGroupId(newGroup.id);
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    }, [currentUser]);

    const handleCreateChannel = useCallback(async (channelData: { name: string; type: ChannelType }) => {
        if (!activeGroupId || !currentUser) return;
        
        try {
            await createChannel(activeGroupId, {
                name: channelData.name,
                type: channelData.type,
                createdBy: currentUser.uid
            });
            setShowCreateChannelModal(false);
        } catch (error) {
            console.error('Failed to create channel:', error);
        }
    }, [activeGroupId, currentUser]);

    const handleStartDM = useCallback(async (userId: string) => {
        if (!currentUser) return;
        
        try {
            const chatRoom = await createOrGetDirectChat(currentUser.uid, userId);
            setActiveChatId(chatRoom.id);
            setActiveGroupId(null);
            setActiveChannelId(null);
            setShowNewDmModal(false);
        } catch (error) {
            console.error('Failed to start DM:', error);
        }
    }, [currentUser]);

    return (
        <div className="flex h-full bg-white dark:bg-slate-900">
            {/* Mobile Menu Toggle */}
            <div className="md:hidden fixed top-4 left-4 z-10">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700"
                >
                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Sidebar */}
            <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative w-64 h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-transform duration-200 z-20`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Chat System</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {/* Groups Section */}
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Study Groups</h3>
                            <button
                                onClick={() => setShowNewGroupModal(true)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <GroupRail
                            groups={groups}
                            activeGroupId={activeGroupId}
                            onSelectGroup={setActiveGroupId}
                        />
                    </div>

                    {/* DMs Section */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Direct Messages</h3>
                            <button
                                onClick={() => setShowNewDmModal(true)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {dmChats.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() => {
                                        setActiveChatId(chat.id);
                                        setActiveGroupId(null);
                                        setActiveChannelId(null);
                                    }}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                                        activeChatId === chat.id
                                            ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                            : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                {chat.participantPhotoURL ? (
                                                    <img src={chat.participantPhotoURL} alt={chat.participantName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Users size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <ChatPresenceIndicator userId={chat.participantId} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">
                                                {chat.participantName}
                                            </p>
                                            <ActiveChatPresenceText userId={chat.participantId} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {activeGroupId ? (
                    <>
                        {/* Channel List */}
                        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <ChannelList
                                channels={channels}
                                activeChannelId={activeChannelId}
                                onSelectChannel={setActiveChannelId}
                                onCreateChannel={() => setShowCreateChannelModal(true)}
                            />
                        </div>

                        {/* Messages */}
                        {activeChannelId ? (
                            <MessagePane
                                messages={messages}
                                currentUser={currentUser}
                                onSendMessage={handleSendMessage}
                                isSending={isSending}
                                newMessage={newMessage}
                                setNewMessage={setNewMessage}
                                onKeyPress={handleKeyPress}
                                messagesEndRef={messagesEndRef}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                Select a channel to start messaging
                            </div>
                        )}

                        {/* Voice Channel Panel */}
                        {voice.channelId && (
                            <VoiceChannelPanel
                                channelId={voice.channelId}
                                participants={voice.participants}
                                isMuted={voice.isMuted}
                                isDeafened={voice.isDeafened}
                                onToggleMute={voice.toggleMute}
                                onToggleDeafen={voice.toggleDeafen}
                            />
                        )}
                    </>
                ) : activeChatId ? (
                    <MessagePane
                        messages={chatMessages}
                        currentUser={currentUser}
                        onSendMessage={handleSendMessage}
                        isSending={isSending}
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        onKeyPress={handleKeyPress}
                        messagesEndRef={messagesEndRef}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="text-center">
                            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Select a group or start a conversation</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Member Sidebar */}
            {activeGroupId && (
                <MemberSidebar
                    members={members}
                    onStartDM={handleStartDM}
                />
            )}

            {/* Modals */}
            {showNewGroupModal && (
                <NewGroupModal
                    onClose={() => setShowNewGroupModal(false)}
                    onCreateGroup={handleCreateGroup}
                />
            )}

            {showCreateChannelModal && (
                <CreateChannelModal
                    onClose={() => setShowCreateChannelModal(false)}
                    onCreateChannel={handleCreateChannel}
                />
            )}

            {showNewDmModal && (
                <NewDmModal
                    users={users}
                    onClose={() => setShowNewDmModal(false)}
                    onStartDM={handleStartDM}
                />
            )}
        </div>
    );
}