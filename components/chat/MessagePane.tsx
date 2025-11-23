import React, { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Hash, AtSign, Loader2, BookOpen, BarChart2, Volume2, Plus } from 'lucide-react';
import { GroupMessage } from '../../services/groups';
import { UserProfile } from '../../services/social';

interface MessagePaneProps {
    channelName: string;
    channelType?: 'text' | 'voice' | 'dm';
    messages: GroupMessage[] | any[]; // any for DM compatibility if needed
    onSendMessage: (content: string) => void;
    currentUser: UserProfile | null;
    isLoading?: boolean;
}

export const MessagePane: React.FC<MessagePaneProps> = ({
    channelName,
    channelType = 'text',
    messages,
    onSendMessage,
    currentUser,
    isLoading
}) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
            {/* Header */}
            <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                    {channelType === 'text' && <Hash size={20} className="text-slate-400" />}
                    {channelType === 'voice' && <Volume2 size={20} className="text-slate-400" />}
                    {channelType === 'dm' && <AtSign size={20} className="text-slate-400" />}
                    <h3 className="font-bold text-slate-900 dark:text-white">{channelName}</h3>
                </div>
                <div className="flex items-center gap-4">
                    {/* Placeholder for toolbar */}
                    <button className="text-slate-400 hover:text-slate-600">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                        <Hash size={48} className="mb-2" />
                        <p>Welcome to #{channelName}!</p>
                        <p className="text-sm">This is the start of the channel.</p>
                    </div>
                )}
                
                {messages.map((msg, index) => {
                    const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId || (msg.createdAt - messages[index-1].createdAt > 60000 * 5);
                    
                    return (
                        <div key={msg.id} className={`group flex gap-3 ${showHeader ? 'mt-4' : 'mt-1'}`}>
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
                                    </div>
                                )}
                                <p className={`text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed`}>
                                    {msg.content}
                                </p>
                             </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex flex-col gap-2">
                    {/* Input */}
                     <form onSubmit={handleSubmit} className="flex items-center gap-2">
                         <button type="button" className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Plus size={20} />
                         </button>
                         <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Message #${channelName}`}
                            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white px-2 py-1 placeholder-slate-500"
                            disabled={isLoading}
                        />
                         <button type="button" className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Smile size={20} />
                         </button>
                        {newMessage.trim() && (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        )}
                     </form>
                     
                     {/* Quick Actions (Study-oriented) */}
                     <div className="flex gap-2 px-2 pb-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <BookOpen size={14} />
                            Link Post
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                            <BarChart2 size={14} />
                            Share Stats
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};
