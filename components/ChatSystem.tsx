import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Group,
    Channel,
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
import { ConversationList } from './chat/ConversationList';
import { MessagePane } from './chat/MessagePane';
import { MemberSidebar } from './chat/MemberSidebar';
import { NewGroupModal } from './chat/NewGroupModal';
import { CreateChannelModal } from './chat/CreateChannelModal';
import { NewDmModal } from './chat/NewDmModal';
import { Menu, X, MessageCircle } from 'lucide-react';
import { useVoiceChannel } from '../hooks/useVoiceChannel';
import { VoiceChannelPanel } from './chat/VoiceChannelPanel';
import { ConversationNode } from '../types';

export function ChatSystem() {
    const { currentUser } = useAuth();
    const voice = useVoiceChannel();

    // Unified state
    const [activeConversation, setActiveConversation] = useState<ConversationNode | null>(null);

    // Data State
    const [groups, setGroups] = useState<Group[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [members, setMembers] = useState<(GroupMember & Partial<UserProfile>)[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [dmChats, setDmChats] = useState<ChatRoom[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});

    // UI State
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    const [showNewDmModal, setShowNewDmModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        if (!currentUser) return;

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
    }, [currentUser]);

    // Subscribe to presence for DM participants
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        for (const chat of dmChats) {
            if (chat.participants) {
                for (const participantId of chat.participants) {
                    if (participantId !== currentUser?.uid) {
                        const unsub = subscribeToPresence(participantId, (presence: UserPresence | null) => {
                            if (presence) {
                                setPresenceMap((prev: Record<string, boolean>) => ({
                                    ...prev,
                                    [participantId]: presence.online
                                }));
                            }
                        });
                        unsubscribers.push(unsub);
                    }
                }
            }
        }

        return () => unsubscribers.forEach(u => u());
    }, [dmChats, currentUser?.uid]);

    // Group Selection Effect
    useEffect(() => {
        if (!activeConversation?.groupId) {
            setChannels([]);
            setMembers([]);
            return;
        }

        const unsubChannels = subscribeToGroupChannels(activeConversation.groupId, setChannels);
        const unsubMembers = subscribeToGroupMembers(activeConversation.groupId, setMembers);

        return () => {
            unsubChannels();
            unsubMembers();
        };
    }, [activeConversation?.groupId]);

    // Message Subscription Effect
    useEffect(() => {
        if (!activeConversation) {
            setMessages([]);
            return;
        }

        let unsub: (() => void) | null = null;

        if (activeConversation.type === 'group-text' || activeConversation.type === 'group-voice') {
            // Subscribe to group channel messages
            if (activeConversation.channelId) {
                unsub = subscribeToChannelMessages(activeConversation.channelId, setMessages);
            }
        } else if (activeConversation.type === 'dm') {
            // Subscribe to DM messages
            unsub = subscribeToChat(activeConversation.id, setMessages);
        }

        return () => unsub?.();
    }, [activeConversation]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Build unified conversation list
    const conversations = useCallback((): ConversationNode[] => {
        const result: ConversationNode[] = [];

        // Add DMs
        dmChats.forEach((chat: ChatRoom) => {
            const otherUserId = chat.participants?.find((id: string) => id !== currentUser?.uid);
            const otherUserInfo = chat.participantsInfo?.[otherUserId || ''];
            const isOnline = presenceMap[otherUserId || ''] || false;

            result.push({
                id: chat.id,
                type: 'dm',
                label: otherUserInfo?.displayName || 'User',
                subtitle: isOnline ? 'Online' : 'Offline',
                avatar: otherUserInfo?.photoURL || undefined,
                participants: chat.participants,
                lastMessage: chat.lastMessage,
                lastMessageTime: chat.lastMessageTime
            });
        });

        // Add Group Channels
        groups.forEach((group: Group) => {
            channels.forEach((channel: Channel) => {
                result.push({
                    id: channel.id,
                    type: channel.type === 'voice' ? 'group-voice' : 'group-text',
                    label: channel.name,
                    subtitle: `Group: ${group.name}`,
                    avatar: group.iconUrl || undefined,
                    groupId: group.id,
                    channelId: channel.id,
                    lastMessage: '',
                    participants: group.members
                });
            });
        });

        return result;
    }, [dmChats, groups, channels, currentUser?.uid, presenceMap]);

    const handleSendMessage = useCallback(async () => {
        if (!newMessage.trim() || isSending || !activeConversation) return;

        setIsSending(true);
        try {
            if (activeConversation.type === 'group-text' || activeConversation.type === 'group-voice') {
                if (activeConversation.channelId && currentUser && userProfile) {
                    await sendGroupMessage(activeConversation.channelId, {
                        channelId: activeConversation.channelId,
                        senderId: currentUser.uid,
                        senderName: userProfile.displayName,
                        senderPhoto: userProfile.photoURL,
                        content: newMessage.trim()
                    });
                }
            } else if (activeConversation.type === 'dm') {
                if (currentUser && userProfile) {
                    await sendMessage(activeConversation.id, currentUser.uid, userProfile.displayName, newMessage.trim());
                }
            }
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    }, [newMessage, isSending, activeConversation, currentUser, userProfile]);

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
                ownerId: currentUser.uid,
                members: [currentUser.uid]
            });

            // Create default channels
            const generalChannel = await createChannel(newGroup.id, {
                name: 'general',
                type: 'text' as ChannelType
            });

            await createChannel(newGroup.id, {
                name: 'voice',
                type: 'voice' as ChannelType
            });

            setShowNewGroupModal(false);

            // Automatically select the new group's general channel
            const newConversation: ConversationNode = {
                id: generalChannel.id,
                type: 'group-text',
                label: generalChannel.name,
                subtitle: `Group: ${newGroup.name}`,
                avatar: newGroup.iconUrl || undefined,
                groupId: newGroup.id,
                channelId: generalChannel.id,
                participants: [currentUser.uid]
            };
            setActiveConversation(newConversation);
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    }, [currentUser]);

    const handleCreateChannel = useCallback(async (channelData: { name: string; type: ChannelType }) => {
        if (!activeConversation?.groupId || !currentUser) return;

        try {
            const newChannel = await createChannel(activeConversation.groupId, {
                name: channelData.name,
                type: channelData.type
            });

            // Find the group for subtitle
            const group = groups.find((g: Group) => g.id === activeConversation.groupId);

            setShowCreateChannelModal(false);

            // Automatically select the new channel
            const newConversation: ConversationNode = {
                id: newChannel.id,
                type: channelData.type === 'voice' ? 'group-voice' : 'group-text',
                label: newChannel.name,
                subtitle: `Group: ${group?.name || 'Unknown'}`,
                avatar: group?.iconUrl || undefined,
                groupId: activeConversation.groupId,
                channelId: newChannel.id,
                participants: group?.members
            };
            setActiveConversation(newConversation);
        } catch (error) {
            console.error('Failed to create channel:', error);
        }
    }, [activeConversation?.groupId, currentUser, groups]);

    const handleStartDM = useCallback(async (userId: string) => {
        if (!currentUser || !userProfile) return;

        try {
            const otherUserProfile = users.find((u: UserProfile) => u.uid === userId);
            if (!otherUserProfile) return;

            const chatRoomId = await createOrGetDirectChat(
                currentUser.uid,
                { displayName: userProfile.displayName, photoURL: userProfile.photoURL },
                userId,
                { displayName: otherUserProfile.displayName, photoURL: otherUserProfile.photoURL }
            );

            setShowNewDmModal(false);

            // Automatically select the new DM
            const newConversation: ConversationNode = {
                id: chatRoomId,
                type: 'dm',
                label: otherUserProfile.displayName,
                subtitle: presenceMap[userId] ? 'Online' : 'Offline',
                avatar: otherUserProfile.photoURL || undefined,
                participants: [currentUser.uid, userId]
            };
            setActiveConversation(newConversation);
        } catch (error) {
            console.error('Failed to start DM:', error);
        }
    }, [currentUser, userProfile, users, presenceMap]);

    const handleSelectConversation = useCallback((conversation: ConversationNode) => {
        setActiveConversation(conversation);
        setMobileMenuOpen(false);
    }, []);

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

            {/* Unified Conversation Sidebar */}
            <div className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative w-64 h-full transition-transform duration-200 z-20`}>
                <ConversationList
                    conversations={conversations()}
                    activeConversationId={activeConversation?.id || null}
                    onSelectConversation={handleSelectConversation}
                    onCreateGroup={() => setShowNewGroupModal(true)}
                    onCreateDm={() => setShowNewDmModal(true)}
                    onCreateChannel={() => setShowCreateChannelModal(true)}
                    presenceMap={presenceMap}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {activeConversation ? (
                    <>
                        {/* Messages */}
                        <MessagePane
                            messages={messages}
                            currentUser={userProfile}
                            onSendMessage={handleSendMessage}
                            isSending={isSending}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            onKeyPress={handleKeyPress}
                            messagesEndRef={messagesEndRef}
                            conversation={activeConversation}
                        />

                        {/* Voice Channel Panel */}
                        {voice.currentChannelId && (activeConversation.type === 'group-voice' || activeConversation.type === 'group-text') && (
                            <VoiceChannelPanel
                                channelId={voice.currentChannelId}
                                voice={voice}
                            />
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="text-center">
                            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Select a conversation to start messaging</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Member Sidebar - only show for group conversations */}
            {activeConversation && (activeConversation.type === 'group-text' || activeConversation.type === 'group-voice') && (
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
