import React, { useEffect, useState } from 'react';
import { getUserProfile, UserProfile } from '../../services/social';

interface TypingIndicatorProps {
    typingUserIds: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUserIds }) => {
    const [typingUsers, setTypingUsers] = useState<(UserProfile | null)[]>([]);

    useEffect(() => {
        const loadUsers = async () => {
            const users = await Promise.all(
                typingUserIds.map(async (userId) => {
                    try {
                        return await getUserProfile(userId);
                    } catch {
                        return null;
                    }
                })
            );
            setTypingUsers(users);
        };

        loadUsers();
    }, [typingUserIds]);

    if (typingUserIds.length === 0) return null;

    const names = typingUsers
        .filter((u) => u !== null)
        .map((u) => u!.displayName)
        .slice(0, 2);

    const displayText =
        names.length === 1
            ? `${names[0]} is typing…`
            : names.length === 2
            ? `${names[0]} and ${names[1]} are typing…`
            : `${names.length} people are typing…`;

    return (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 px-4 py-2">
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{displayText}</span>
        </div>
    );
};
