import React, { useEffect, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { GroupMessage } from '../../services/groups';
import { ChatMessage } from '../../services/social';
import { getUserProfile, UserProfile } from '../../services/social';

interface ReadReceiptsProps {
    message: GroupMessage | ChatMessage;
    participants?: string[];
    isDM?: boolean;
}

export const ReadReceipts: React.FC<ReadReceiptsProps> = ({
    message,
    participants = [],
    isDM = false
}) => {
    const [readUsers, setReadUsers] = useState<UserProfile[]>([]);

    useEffect(() => {
        const loadReadUsers = async () => {
            if (!message.readBy || message.readBy.length === 0) return;

            const users = await Promise.all(
                message.readBy.map(async (userId) => {
                    try {
                        return await getUserProfile(userId);
                    } catch {
                        return null;
                    }
                })
            );
            setReadUsers(users.filter((u) => u !== null) as UserProfile[]);
        };

        loadReadUsers();
    }, [message.readBy]);

    if (!message.readBy || message.readBy.length === 0) {
        return null;
    }

    if (isDM) {
        // For DMs: show single/double checkmarks
        const readCount = message.readBy.length;
        return (
            <div className="mt-1 flex items-center gap-1">
                {readCount === 1 ? (
                    <Check size={12} className="text-slate-400" />
                ) : (
                    <CheckCheck size={12} className="text-slate-400" />
                )}
                <span className="text-xs text-slate-400">{readCount > 1 ? 'Read' : 'Sent'}</span>
            </div>
        );
    }

    // For groups: show avatar stack of most recent readers
    const maxAvatars = 3;
    const displayUsers = readUsers.slice(-maxAvatars);
    const extraCount = Math.max(0, readUsers.length - maxAvatars);

    return (
        <div className="mt-2 flex items-center gap-1">
            <div className="flex -space-x-2">
                {displayUsers.map((user) => (
                    <div
                        key={user.uid}
                        className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 border border-white dark:border-slate-900 overflow-hidden"
                        title={user.displayName}
                    >
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                {user.displayName?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                ))}
                {extraCount > 0 && (
                    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-100 border border-white dark:border-slate-900">
                        +{extraCount}
                    </div>
                )}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
                {readUsers.length === 1 ? '1 read' : `${readUsers.length} read`}
            </span>
        </div>
    );
};
