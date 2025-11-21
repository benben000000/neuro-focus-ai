import React, { useState } from 'react';
import { Music, X, ChevronDown, ChevronUp, ListMusic } from 'lucide-react';

const PLAYLISTS = [
    { name: "Deep Focus", id: "37i9dQZF1DWZeKCadgRdKQ" },
    { name: "Lo-Fi Beats", id: "37i9dQZF1DWWQRwui0ExPn" },
    { name: "Classical Study", id: "37i9dQZF1DWV9sdMWL3Msl" },
    { name: "Brain Food", id: "37i9dQZF1DWXLeA8Omikj7" }
];

export const MusicPlayer: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentPlaylist, setCurrentPlaylist] = useState(PLAYLISTS[0].id);
    const [isMinimized, setIsMinimized] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
                <Music size={24} />
                <span className="hidden md:inline font-bold text-sm">Focus Music</span>
            </button>
        );
    }

    return (
        <div className={`fixed right-4 md:right-8 z-40 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ${isMinimized ? 'bottom-20 md:bottom-8 w-72 h-16' : 'bottom-20 md:bottom-8 w-80 h-96'}`}>
            {/* Header */}
            <div className="h-16 bg-slate-900 flex items-center justify-between px-4 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-slate-900">
                        <Music size={16} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Focus Player</h3>
                        <p className="text-xs text-slate-400">{isMinimized ? 'Click to expand' : 'Select a vibe'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="text-slate-400 hover:text-white">
                        {isMinimized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-slate-400 hover:text-red-400">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <div className="p-4 h-[calc(100%-4rem)] flex flex-col">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-1">
                            <ListMusic size={12} /> Select Playlist
                        </label>
                        <select
                            value={currentPlaylist}
                            onChange={(e) => setCurrentPlaylist(e.target.value)}
                            className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {PLAYLISTS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 bg-black rounded-xl overflow-hidden relative">
                        <iframe
                            style={{ borderRadius: '12px' }}
                            src={`https://open.spotify.com/embed/playlist/${currentPlaylist}?utm_source=generator&theme=0`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
