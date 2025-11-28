import React, { useState, useMemo, FC } from 'react';
import { Search, Plus, Users, Loader2 } from 'lucide-react';
import { ConversationNode } from '../../types';

interface ConversationListProps {
    conversations: ConversationNode[];
    activeConversationId: string | null;
    onSelectConversation: (conversation: ConversationNode) => void;
    onCreateGroup?: () => void;
    onCreateDm?: () => void;
    onCreateChannel?: () => void;
    isLoading?: boolean;
    presenceMap?: Record<string, boolean>; // userId -> online status
}

export const ConversationList: FC<ConversationListProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    onCreateGroup,
    onCreateDm,
    onCreateChannel,
    isLoading = false,
    presenceMap = {}
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Group conversations by type
    const grouped = useMemo(() => {
        const filtered = conversations.filter((conv: ConversationNode) =>
            conv.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
            dms: filtered.filter((c: ConversationNode) => c.type === 'dm'),
            groupText: filtered.filter((c: ConversationNode) => c.type === 'group-text'),
            groupVoice: filtered.filter((c: ConversationNode) => c.type === 'group-voice')
        };
    }, [conversations, searchTerm]);

    const ConversationRow = ({ conv }: { conv: ConversationNode }) => {
        const isActive = activeConversationId === conv.id;
        const isOnline = conv.type === 'dm' && conv.participants ? presenceMap[conv.participants[0]] : false;

        return (
            <button
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 mb-1 ${
                    isActive
                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
            >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden text-xs font-bold text-slate-500">
                        {conv.avatar ? (
                            <img src={conv.avatar} alt={conv.label} className="w-full h-full object-cover" />
                        ) : (
                            conv.label.charAt(0).toUpperCase()
                        )}
                    </div>
                    {/* Presence dot for DMs */}
                    {conv.type === 'dm' && isOnline && (
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white dark:border-slate-800 rounded-full" />
                    )}
                    {/* Badge for group channels */}
                    {conv.type !== 'dm' && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-full text-[10px] text-white flex items-center justify-center">
                            {conv.type === 'group-voice' ? '🔊' : '#'}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.label}</p>
                    {conv.subtitle && (
                        <p className="text-xs text-slate-400 truncate">{conv.subtitle}</p>
                    )}
                </div>

                {/* Unread badge */}
                {conv.unreadCount && conv.unreadCount > 0 && (
                    <div className="text-xs font-bold bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </div>
                )}
            </button>
        );
    };

    return (
        <div className="w-64 bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-700 flex-shrink-0 h-full">
            {/* Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        placeholder="Find conversations..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                    />
                </div>

                <div className="flex gap-2">
                    {onCreateGroup && (
                        <button
                            onClick={onCreateGroup}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                            title="Create Group"
                        >
                            <Plus size={14} />
                            Group
                        </button>
                    )}
                    {onCreateDm && (
                        <button
                            onClick={onCreateDm}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded text-xs font-medium transition-colors"
                            title="Start DM"
                        >
                            <Plus size={14} />
                            DM
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && (
                    <div className="p-4 flex items-center justify-center text-slate-400">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                )}

                {!isLoading && conversations.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-sm">
                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No conversations yet</p>
                    </div>
                )}

                {!isLoading && conversations.length > 0 && (
                    <>
                        {/* Direct Messages Section */}
                        {grouped.dms.length > 0 && (
                            <div className="px-3 pt-3 pb-2">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                                    Direct Messages
                                </p>
                                <div className="space-y-0.5">
                                     {grouped.dms.map((conv: ConversationNode) => (
                                         <ConversationRow key={conv.id} conv={conv} />
                                     ))}
                                </div>
                            </div>
                        )}

                        {/* Group Text Channels Section */}
                        {grouped.groupText.length > 0 && (
                            <div className="px-3 py-3 pb-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Group Channels
                                    </p>
                                    {onCreateChannel && (
                                        <button
                                            onClick={onCreateChannel}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Create Channel"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                     {grouped.groupText.map((conv: ConversationNode) => (
                                         <ConversationRow key={conv.id} conv={conv} />
                                     ))}
                                </div>
                            </div>
                        )}

                        {/* Group Voice Channels Section */}
                        {grouped.groupVoice.length > 0 && (
                            <div className="px-3 py-3 pb-2 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                                    Voice Channels
                                </p>
                                <div className="space-y-0.5">
                                     {grouped.groupVoice.map((conv: ConversationNode) => (
                                         <ConversationRow key={conv.id} conv={conv} />
                                     ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
