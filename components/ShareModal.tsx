import React, { useState, useEffect } from 'react';
import { X, Search, Send, Check, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { searchUsers, shareContent, UserProfile, getAllUsers } from '../services/social';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: { type: 'post' | 'story', id: string };
}

export function ShareModal({ isOpen, onClose, content }: ShareModalProps) {
    const { currentUser } = useAuth();
    const { profile } = useProfile();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadInitialUsers();
            setNote('');
            setSelectedUsers([]);
            setSearchQuery('');
        }
    }, [isOpen]);

    const loadInitialUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await getAllUsers();
            // Filter out current user
            setRecentUsers(allUsers.filter(u => u.uid !== currentUser?.uid).slice(0, 10));
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const queryText = e.target.value;
        setSearchQuery(queryText);
        
        if (queryText.trim().length > 1) {
            const results = await searchUsers(queryText);
            setSearchResults(results.filter(u => u.uid !== currentUser?.uid));
        } else {
            setSearchResults([]);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleShare = async () => {
        if (!currentUser || selectedUsers.length === 0) return;

        setSending(true);
        try {
            const sender = {
                uid: currentUser.uid,
                displayName: profile?.displayName || 'User',
                photoURL: profile?.photoURL
            };

            await shareContent(selectedUsers, content, sender, note);
            onClose();
        } catch (error) {
            console.error('Failed to share', error);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    const displayUsers = searchQuery ? searchResults : recentUsers;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">Share</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearch}
                            placeholder="Search people..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-4 text-center text-slate-400 text-sm">Loading people...</div>
                    ) : displayUsers.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">No people found</div>
                    ) : (
                        <div className="space-y-1">
                            {displayUsers.map(user => {
                                const isSelected = selectedUsers.includes(user.uid);
                                return (
                                    <div
                                        key={user.uid}
                                        onClick={() => toggleUser(user.uid)}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                                            isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <User size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                                                    {user.displayName}
                                                </p>
                                                {user.level && <p className="text-xs text-slate-500">Lvl {user.level}</p>}
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            isSelected 
                                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                            {isSelected && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-3 bg-white dark:bg-slate-900">
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a message (optional)..."
                        className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 placeholder:text-slate-400 text-slate-900 dark:text-white"
                    />
                    <button
                        onClick={handleShare}
                        disabled={selectedUsers.length === 0 || sending}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        {sending ? 'Sending...' : `Send to ${selectedUsers.length > 0 ? `${selectedUsers.length} people` : ''}`} 
                        {!sending && <Send size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
