import React, { useEffect, useState } from 'react';
import { UseVoiceChannelReturn } from '../../hooks/useVoiceChannel';
import { Mic, MicOff, Headphones, PhoneOff, Volume2 } from 'lucide-react';
import { subscribeToVoiceStates, VoiceState } from '../../services/social';

interface VoiceChannelPanelProps {
    channelId: string;
    voice: UseVoiceChannelReturn;
}

export function VoiceChannelPanel({ channelId, voice }: VoiceChannelPanelProps) {
    const { 
        isConnected, 
        currentChannelId, 
        joinChannel, 
        leaveChannel, 
        isMuted, 
        toggleMute,
        isDeafened, 
        toggleDeafen,
        activeSpeakers,
        isConnecting
    } = voice;

    const [voiceStates, setVoiceStates] = useState<VoiceState[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToVoiceStates(channelId, setVoiceStates);
        return () => unsubscribe();
    }, [channelId]);

    const isCurrentChannel = isConnected && currentChannelId === channelId;
    
    const handleJoin = () => {
        joinChannel(channelId);
    };

    if (!isCurrentChannel) {
        // Show Join Button and list of people currently in the channel (from Firestore)
        return (
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Volume2 size={16} />
                        Voice Channel
                    </h3>
                    {voiceStates.length > 0 && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
                            {voiceStates.length} online
                        </span>
                    )}
                </div>
                
                {voiceStates.length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden mb-3 pl-2">
                        {voiceStates.slice(0, 5).map((state) => (
                            <img
                                key={state.userId}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                                src={state.user.photoURL || `https://ui-avatars.com/api/?name=${state.user.displayName}`}
                                alt={state.user.displayName}
                                title={state.user.displayName}
                            />
                        ))}
                         {voiceStates.length > 5 && (
                             <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium ring-2 ring-white">
                                 +{voiceStates.length - 5}
                             </div>
                         )}
                    </div>
                )}

                <button
                    onClick={handleJoin}
                    disabled={isConnecting}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Headphones size={18} />
                    {isConnecting && currentChannelId === channelId ? 'Connecting...' : 'Join Voice'}
                </button>
            </div>
        );
    }

    // Connected View
    return (
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
                 <h3 className="text-green-400 font-bold flex items-center gap-2">
                    <Volume2 size={16} />
                    Connected
                </h3>
                <span className="text-xs text-slate-400">
                    {/* Duration could go here if we tracked it in component state or passed it */}
                </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
                {voiceStates.map((state) => {
                    const isSpeaking = activeSpeakers.includes(state.userId);
                    return (
                        <div key={state.userId} className="flex flex-col items-center relative group">
                            <div className={`relative rounded-full p-0.5 transition-all duration-200 ${isSpeaking ? 'bg-green-500 scale-105' : 'bg-transparent'}`}>
                                <img
                                    src={state.user.photoURL || `https://ui-avatars.com/api/?name=${state.user.displayName}`}
                                    alt={state.user.displayName}
                                    className={`w-12 h-12 rounded-full border-2 object-cover ${isSpeaking ? 'border-transparent' : 'border-slate-700'}`}
                                />
                                {state.isMuted && (
                                    <div className="absolute bottom-0 right-0 bg-slate-800 rounded-full p-1 text-red-500 border border-slate-900">
                                        <MicOff size={10} />
                                    </div>
                                )}
                            </div>
                            <span className="text-xs mt-1 truncate max-w-full text-slate-300">
                                {state.user.displayName}
                            </span>
                             {state.status === 'study' && (
                                 <span className="absolute -top-1 -right-1 text-xs bg-indigo-500 text-white px-1 rounded-full border border-slate-900">
                                     📚
                                 </span>
                             )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-center gap-4">
                <button 
                    onClick={() => toggleMute()}
                    className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-700 hover:bg-slate-600'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <button 
                    onClick={leaveChannel}
                    className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="Disconnect"
                >
                    <PhoneOff size={20} />
                </button>

                 <button 
                    onClick={toggleDeafen}
                    className={`p-3 rounded-full transition-colors ${isDeafened ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-700 hover:bg-slate-600'}`}
                    title={isDeafened ? "Undeafen" : "Deafen"}
                >
                    <Headphones size={20} />
                </button>
            </div>
        </div>
    );
}
