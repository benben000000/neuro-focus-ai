import React, { useEffect, useState } from 'react';
import { UserProfile, UserPresence, followUser, unfollowUser, subscribeToPresence } from '../../services/social';
import { BadgeCheck, MapPin, Zap, Users, MessageCircle } from 'lucide-react';
import { createOrGetDirectChat } from '../../services/social';

interface UserPreviewCardProps {
    user: UserProfile;
    currentUserProfile: UserProfile | null;
    onViewProfile?: (uid: string) => void;
    onStartDM?: (chatId: string) => void;
    isCurrentUser?: boolean;
}

export const UserPreviewCard: React.FC<UserPreviewCardProps> = ({
    user,
    currentUserProfile,
    onViewProfile,
    onStartDM,
    isCurrentUser = false
}) => {
    const [presence, setPresence] = useState<UserPresence | null>(null);
    const [isFollowing, setIsFollowing] = useState(currentUserProfile?.following?.includes(user.uid) || false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        return subscribeToPresence(user.uid, setPresence);
    }, [user.uid]);

    useEffect(() => {
        setIsFollowing(currentUserProfile?.following?.includes(user.uid) || false);
    }, [currentUserProfile?.following, user.uid]);

    const handleFollow = async () => {
        if (!currentUserProfile) return;
        setIsLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(currentUserProfile.uid, user.uid);
                setIsFollowing(false);
            } else {
                await followUser(currentUserProfile.uid, user.uid);
                setIsFollowing(true);
            }
        } catch (error) {
            console.error('Failed to toggle follow', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartDM = async () => {
        if (!currentUserProfile) return;
        setIsLoading(true);
        try {
            const chatId = await createOrGetDirectChat(
                currentUserProfile.uid,
                { displayName: currentUserProfile.displayName, photoURL: currentUserProfile.photoURL },
                user.uid,
                { displayName: user.displayName, photoURL: user.photoURL }
            );
            onStartDM?.(chatId);
        } catch (error) {
            console.error('Failed to create DM', error);
        } finally {
            setIsLoading(false);
        }
    };

    const followersCount = user.followersCount || 0;
    const followingCount = user.followingCount || 0;

    return (
        <div className="w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-4 z-50">
            {/* Header with avatar and online indicator */}
            <div className="flex gap-3 mb-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                        <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-white">
                            {user.photoURL ? (
                                <img src={user.photoURL} className="w-full h-full object-cover" alt={user.displayName} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                    {user.displayName[0]}
                                </div>
                            )}
                        </div>
                    </div>
                    {presence?.online && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white">{user.displayName}</h3>
                        {user.isVerified && <BadgeCheck size={16} className="text-blue-500 fill-blue-100 dark:fill-blue-900" />}
                    </div>
                    {user.username && <p className="text-xs text-slate-500">@{user.username}</p>}
                    {!presence?.online && (
                        <p className="text-xs text-slate-400">Offline</p>
                    )}
                </div>
            </div>

            {/* Bio */}
            {user.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {user.bio}
                </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1">
                    <Zap size={14} className="text-amber-500" />
                    <span className="font-medium text-slate-900 dark:text-white">
                        Level {user.level}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-900 dark:text-white">
                        {user.xp || 0} XP
                    </span>
                </div>
            </div>

            {/* Followers/Following */}
            <div className="flex gap-3 mb-4 text-xs">
                <button className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <Users size={14} />
                    <span className="font-medium">{followersCount}</span>
                </button>
                <button className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <span className="font-medium">Following {followingCount}</span>
                </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => onViewProfile?.(user.uid)}
                    className="flex-1 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    View Profile
                </button>
                {!isCurrentUser && (
                    <>
                        <button
                            onClick={handleFollow}
                            disabled={isLoading}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                isFollowing
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button
                            onClick={handleStartDM}
                            disabled={isLoading}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            title="Start DM"
                        >
                            <MessageCircle size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
