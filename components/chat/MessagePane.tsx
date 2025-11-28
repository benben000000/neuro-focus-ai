import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Hash, AtSign, Loader2, BookOpen, BarChart2, Volume2, Plus, MessageSquareX } from 'lucide-react';
import { GroupMessage } from '../../services/groups';
import { UserProfile } from '../../services/social';
import { MessageActionMenu } from './MessageActionMenu';
import { ReactionBar } from './ReactionBar';
import { TypingIndicator } from './TypingIndicator';
import { MessageSearch } from './MessageSearch';
import { PinnedMessagesBanner } from './PinnedMessagesBanner';
import { ReadReceipts } from './ReadReceipts';

interface MessagePaneProps {
    channelName: string;
    channelType?: 'text' | 'voice' | 'dm';
    messages: GroupMessage[] | any[];
    onSendMessage: (content: string) => void;
    onEditMessage?: (messageId: string, newContent: string) => void;
    onDeleteMessage?: (messageId: string) => void;
    onToggleReaction?: (messageId: string, emoji: string) => void;
    onPinMessage?: (messageId: string, shouldPin: boolean) => void;
    onSetTypingState?: (isTyping: boolean) => void;
    typingUserIds?: string[];
    currentUser: UserProfile | null;
    isLoading?: boolean;
    participants?: string[];
    isChatMessage?: boolean;
}

export const MessagePane: React.FC<MessagePaneProps> = ({
    channelName,
    channelType = 'text',
    messages,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
    onPinMessage,
    onSetTypingState,
    typingUserIds = [],
    currentUser,
    isLoading,
    participants = [],
    isChatMessage = false
}) => {
    const [newMessage, setNewMessage] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<(GroupMessage | any)[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleComposerFocus = useCallback(() => {
        onSetTypingState?.(true);
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to clear typing state after inactivity
        typingTimeoutRef.current = setTimeout(() => {
            onSetTypingState?.(false);
        }, 3000);
    }, [onSetTypingState]);

    const handleComposerBlur = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        onSetTypingState?.(false);
    }, [onSetTypingState]);

    const handleComposerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        handleComposerFocus();
    }, [handleComposerFocus]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            if (editingMessageId) {
                onEditMessage?.(editingMessageId, newMessage);
                setEditingMessageId(null);
                setEditingContent('');
            } else {
                onSendMessage(newMessage);
            }
            setNewMessage('');
            onSetTypingState?.(false);
        }
    };

    const handleEditMessage = (message: GroupMessage | any) => {
        setEditingMessageId(message.id);
        setEditingContent(message.content);
        setNewMessage(message.content);
        composerRef.current?.focus();
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingContent('');
        setNewMessage('');
    };

    const displayMessages = searchResults.length > 0 ? searchResults : messages;

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
            {/* Header with Search */}
            <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                    {channelType === 'text' && <Hash size={20} className="text-slate-400" />}
                    {channelType === 'voice' && <Volume2 size={20} className="text-slate-400" />}
                    {channelType === 'dm' && <AtSign size={20} className="text-slate-400" />}
                    <h3 className="font-bold text-slate-900 dark:text-white">{channelName}</h3>
                </div>
                <div className="flex items-center gap-4">
                    <MessageSearch
                        messages={messages}
                        onSearchResults={setSearchResults}
                        onHighlightMessage={setHighlightedMessageId}
                        isChatMessage={isChatMessage}
                    />
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Pinned Messages Banner */}
            {messages.length > 0 && (
                <PinnedMessagesBanner
                    messages={messages}
                    onMessageClick={(messageId) => {
                        setHighlightedMessageId(messageId);
                        const element = document.getElementById(`msg-${messageId}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {displayMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                        <Hash size={48} className="mb-2" />
                        <p>Welcome to #{channelName}!</p>
                        <p className="text-sm">This is the start of the channel.</p>
                    </div>
                )}

                {displayMessages.map((msg, index) => {
                    const showHeader = index === 0 || displayMessages[index - 1].senderId !== msg.senderId || (msg.createdAt - displayMessages[index - 1].createdAt > 60000 * 5);
                    const isHighlighted = highlightedMessageId === msg.id;
                    const isDeleted = msg.isDeleted;

                    return (
                        <div
                            key={msg.id}
                            id={`msg-${msg.id}`}
                            className={`group flex gap-3 ${showHeader ? 'mt-4' : 'mt-1'} ${
                                isHighlighted ? 'bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg' : ''
                            }`}
                            onMouseEnter={() => setHoveredMessageId(msg.id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                        >
                            {showHeader ? (
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden mt-0.5">
                                    {msg.senderPhoto ? (
                                        <img src={msg.senderPhoto} alt={msg.senderName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                                            {msg.senderName?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-10 flex-shrink-0 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 text-right pt-1 select-none">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                {showHeader && (
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer">
                                            {msg.senderName}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                        {msg.editedAt && (
                                            <span className="text-xs text-slate-400">(edited)</span>
                                        )}
                                    </div>
                                )}

                                <div className="relative">
                                    <p className={`text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed ${isDeleted ? 'italic text-slate-400' : ''}`}>
                                        {msg.content}
                                    </p>

                                    {/* Reaction Bar */}
                                    {!isDeleted && (
                                        <ReactionBar
                                            message={msg}
                                            currentUserId={currentUser?.uid || ''}
                                            onToggleReaction={(emoji) => onToggleReaction?.(msg.id, emoji)}
                                        />
                                    )}

                                    {/* Read Receipts */}
                                    {!isDeleted && (
                                        <ReadReceipts
                                            message={msg}
                                            participants={participants}
                                            isDM={isChatMessage}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Message Action Menu */}
                            {hoveredMessageId === msg.id && !isDeleted && (
                                <MessageActionMenu
                                    message={msg}
                                    currentUserId={currentUser?.uid || ''}
                                    onEdit={() => handleEditMessage(msg)}
                                    onDelete={() => onDeleteMessage?.(msg.id)}
                                    onReaction={(emoji) => onToggleReaction?.(msg.id, emoji)}
                                    onPin={(shouldPin) => onPinMessage?.(msg.id, shouldPin)}
                                    isChatMessage={isChatMessage}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                <TypingIndicator typingUserIds={typingUserIds} />

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 flex-shrink-0 border-t border-slate-200 dark:border-slate-800">
                {/* Edit mode indicator */}
                {editingMessageId && (
                    <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-200">
                            <MessageSquareX size={16} />
                            <span>Editing message</span>
                        </div>
                        <button
                            onClick={handleCancelEdit}
                            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                        >
                            <span className="text-xs font-medium">Cancel</span>
                        </button>
                    </div>
                )}

                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex flex-col gap-2">
                    {/* Input */}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <button type="button" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Plus size={20} />
                        </button>
                        <input
                            ref={composerRef}
                            type="text"
                            value={newMessage}
                            onChange={handleComposerChange}
                            onFocus={handleComposerFocus}
                            onBlur={handleComposerBlur}
                            placeholder={`Message #${channelName}`}
                            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white px-2 py-1 placeholder-slate-500"
                            disabled={isLoading}
                        />
                        <button type="button" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Smile size={20} />
                        </button>
                        {newMessage.trim() && (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        )}
                    </form>

                    {/* Quick Actions (Study-oriented) */}
                    <div className="flex gap-2 px-2 pb-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <BookOpen size={14} />
                            Link Post
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <BarChart2 size={14} />
                            Share Stats
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
