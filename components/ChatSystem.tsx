import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    subscribeToUserChats,
    subscribeToChat,
    sendMessage,
    createGroupChat,
    createOrGetDirectChat,
    getAllUsers,
    getUserProfile,
    ChatRoom,
    ChatMessage,
    UserProfile
} from '../services/social';
import { Send, Plus, Users, MessageCircle, Search, MoreVertical, Loader2, AlertCircle } from 'lucide-react';

export function ChatSystem() {
    const { currentUser } = useAuth();
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isSending, setIsSending] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (currentUser) {
            const unsubscribe = subscribeToUserChats(currentUser.uid, setChats);
            loadUsers();
            getUserProfile(currentUser.uid).then(setUserProfile);
            return () => unsubscribe();
        }
    }, [currentUser]);

    useEffect(() => {
        if (activeChatId) {
            const unsubscribe = subscribeToChat(activeChatId, setMessages);
            return () => unsubscribe();
        }
    }, [activeChatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadUsers = async () => {
        const allUsers = await getAllUsers();
        setUsers(allUsers.filter(u => u.uid !== currentUser?.uid));
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const getChatMetadata = (chat: ChatRoom) => {
        if (chat.type === 'group') {
            return {
                name: chat.name || 'Group Chat',
                avatar: null,
                isGroup: true
            };
        }
        
        // For direct chats, find the other participant
        if (currentUser && chat.participantsInfo) {
            const otherId = chat.participants.find(id => id !== currentUser.uid);
            if (otherId && chat.participantsInfo[otherId]) {
                const info = chat.participantsInfo[otherId];
                return {
                    name: info.displayName,
                    avatar: info.photoURL,
                    isGroup: false
                };
            }
        }
        
        // Fallback for legacy chats or missing info
        return {
            name: 'Chat',
            avatar: null,
            isGroup: false
        };
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !activeChatId || !newMessage.trim() || isSending) return;

        try {
            setIsSending(true);
            const senderName = userProfile?.displayName || currentUser.displayName || currentUser.email || 'User';
            
            await sendMessage(activeChatId, currentUser.uid, senderName, newMessage);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
            alert("Failed to send message. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    const handleCreateChat = async (participantId: string) => {
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
            
            setActiveChatId(chatId);
            setShowNewChatModal(false);
        } catch (error) {
            console.error("Failed to create chat", error);
            alert("Failed to create chat. Please try again.");
        }
    };

    const activeChat = chats.find(c => c.id === activeChatId);
    const activeChatMetadata = activeChat ? getChatMetadata(activeChat) : { name: 'Chat', avatar: null, isGroup: false };

    return (
        <div className="h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Messages</h2>
                    <button
                        onClick={() => setShowNewChatModal(true)}
                        className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {chats.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No chats yet</p>
                        </div>
                    ) : (
                        chats.map(chat => {
                            const metadata = getChatMetadata(chat);
                            return (
                                <button
                                    key={chat.id}
                                    onClick={() => setActiveChatId(chat.id)}
                                    className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 ${activeChatId === chat.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                        {metadata.avatar ? (
                                            <img src={metadata.avatar} alt={metadata.name} className="w-full h-full object-cover" />
                                        ) : (
                                            metadata.isGroup ? <Users size={20} /> : metadata.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                            {metadata.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 truncate">
                                            {chat.lastMessage || 'No messages yet'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/50">
                {activeChatId ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                                    {activeChatMetadata.avatar ? (
                                        <img src={activeChatMetadata.avatar} alt={activeChatMetadata.name} className="w-full h-full object-cover" />
                                    ) : (
                                        activeChatMetadata.isGroup ? <Users size={20} /> : activeChatMetadata.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{activeChatMetadata.name}</h3>
                                    <p className="text-xs text-slate-500">Online</p>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <MoreVertical size={20} />
                            </button>
                        </div>

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

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={isSending}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <MessageCircle size={48} className="mb-4 opacity-20" />
                        <p>Select a chat to start messaging</p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg">New Chat</h3>
                            <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            <p className="text-sm text-slate-500 mb-4">Select a user to chat with:</p>
                            <div className="space-y-2">
                                {users.map(user => (
                                    <button
                                        key={user.uid}
                                        onClick={() => handleCreateChat(user.uid)}
                                        className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                            ) : (
                                                user.displayName?.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{user.displayName}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
