import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { getAllUsers, UserProfile } from '../../services/social';

interface NewDmModalProps {
    onClose: () => void;
    onSelectUser: (userId: string) => void;
    currentUserId?: string;
}

export const NewDmModal: React.FC<NewDmModalProps> = ({ onClose, onSelectUser, currentUserId }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getAllUsers().then(allUsers => {
            setUsers(allUsers.filter(u => u.uid !== currentUserId));
        });
    }, [currentUserId]);

    const filteredUsers = users.filter(u => 
        u.displayName.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">New Message</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search users..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-1">
                        {filteredUsers.map(user => (
                            <button
                                key={user.uid}
                                onClick={() => onSelectUser(user.uid)}
                                className="w-full p-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        user.displayName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{user.displayName}</p>
                                    <p className="text-xs text-slate-500">{user.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
