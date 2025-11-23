import React from 'react';
import { Hash, Volume2, Plus, Settings, Search, Mic, Headphones } from 'lucide-react';
import { Group, Channel } from '../../services/groups';
import { ChatRoom } from '../../services/social';

interface ChannelListProps {
    mode: 'dm' | 'group';
    group?: Group | null;
    channels?: Channel[];
    dmChats?: ChatRoom[];
    selectedChannelId: string | null;
    onSelectChannel: (id: string) => void;
    onCreateChannel?: () => void;
    onCreateDM?: () => void;
    currentUserId?: string;
    getChatMetadata?: (chat: ChatRoom) => { name: string; avatar: string | null };
}

export const ChannelList: React.FC<ChannelListProps> = ({
    mode,
    group,
    channels = [],
    dmChats = [],
    selectedChannelId,
    onSelectChannel,
    onCreateChannel,
    onCreateDM,
    currentUserId,
    getChatMetadata
}) => {
    if (mode === 'dm') {
        return (
             <div className="w-60 bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={onCreateDM}
                        className="w-full text-left px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
                    >
                        <Search size={14} />
                        Find or start a conversation
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex items-center justify-between px-2 pt-2 pb-1">
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direct Messages</p>
                         <button onClick={onCreateDM} className="text-slate-400 hover:text-slate-600">
                            <Plus size={14} />
                        </button>
                    </div>
                   
                    {dmChats.length === 0 && (
                        <p className="px-2 text-sm text-slate-400 italic">No conversations yet</p>
                    )}

                    {dmChats.map(chat => {
                         const metadata = getChatMetadata ? getChatMetadata(chat) : { name: 'Chat', avatar: null };
                         return (
                            <button
                                key={chat.id}
                                onClick={() => onSelectChannel(chat.id)}
                                className={`w-full px-2 py-2 flex items-center gap-3 rounded-lg transition-colors mb-1 ${
                                    selectedChannelId === chat.id
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {metadata.avatar ? (
                                        <img src={metadata.avatar} alt={metadata.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-slate-500">{metadata.name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <span className="truncate text-sm font-medium">{metadata.name}</span>
                            </button>
                         )
                    })}
                </div>
             </div>
        );
    }

    const textChannels = channels.filter(c => c.type === 'text');
    const voiceChannels = channels.filter(c => c.type === 'voice');

    return (
        <div className="w-60 bg-slate-50 dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
             {/* Group Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <h2 className="font-bold text-slate-900 dark:text-white truncate text-base">{group?.name}</h2>
                {group?.ownerId === currentUserId && (
                     <Settings size={16} className="text-slate-500 cursor-pointer hover:text-slate-700" />
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                 {/* Text Channels */}
                <div className="mb-4">
                    <div className="flex items-center justify-between px-2 pt-2 pb-1 group/header">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Text Channels</p>
                        <button onClick={onCreateChannel} className="text-slate-400 hover:text-slate-600 opacity-0 group-hover/header:opacity-100 transition-opacity">
                            <Plus size={14} />
                        </button>
                    </div>
                    {textChannels.map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => onSelectChannel(channel.id)}
                            className={`w-full px-2 py-1.5 flex items-center gap-2 rounded transition-colors mb-0.5 ${
                                selectedChannelId === channel.id
                                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <Hash size={18} className="opacity-70 flex-shrink-0" />
                            <span className="truncate text-sm">{channel.name}</span>
                        </button>
                    ))}
                </div>

                {/* Voice Channels */}
                <div>
                    <div className="flex items-center justify-between px-2 pt-2 pb-1 group/header">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Voice Channels</p>
                         <button onClick={onCreateChannel} className="text-slate-400 hover:text-slate-600 opacity-0 group-hover/header:opacity-100 transition-opacity">
                            <Plus size={14} />
                        </button>
                    </div>
                    {voiceChannels.map(channel => (
                        <div key={channel.id} className="mb-0.5">
                            <button
                                onClick={() => onSelectChannel(channel.id)}
                                className={`w-full px-2 py-1.5 flex items-center gap-2 rounded transition-colors ${
                                    selectedChannelId === channel.id
                                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <Volume2 size={18} className="opacity-70 flex-shrink-0" />
                                <span className="truncate text-sm">{channel.name}</span>
                            </button>
                            {/* Placeholder for active voice users */}
                            {channel.activeUsers && channel.activeUsers.length > 0 && (
                                <div className="pl-9 pb-2 space-y-1">
                                    {channel.activeUsers.map(uid => (
                                         <div key={uid} className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            <span className="text-xs text-slate-500">User</span>
                                         </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
             {/* User Control Panel (Bottom) */}
            <div className="p-2 bg-slate-100 dark:bg-slate-950/50 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800">
                 <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    ME
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">My Account</p>
                    <p className="text-[10px] text-slate-500 truncate">Online</p>
                 </div>
                 <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500">
                        <Mic size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500">
                        <Headphones size={14} />
                    </button>
                    <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500">
                        <Settings size={14} />
                    </button>
                 </div>
            </div>
        </div>
    );
};
