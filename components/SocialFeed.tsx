import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { subscribeToFeed, SocialPost, toggleLike, searchUsers, sendFriendRequest, getFriendSuggestions, UserProfile, toggleSavePost, isPostSaved, followUser, unfollowUser, subscribeToPresence, UserPresence } from '../services/social';
import { MessageCircle, Heart, Share2, Bookmark, MoreHorizontal, Search, UserPlus, PlusSquare, BadgeCheck } from 'lucide-react';
import { StoryTray } from './StoryTray';
import { CreateMediaModal } from './CreateMediaModal';
import { MediaCarousel } from './MediaCarousel';
import { ShareModal } from './ShareModal';
import { SharedContentPanel } from './SharedContentPanel';
import { CommentThread } from './CommentThread';

const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

const UserPresenceIndicator = ({ userId }: { userId: string }) => {
    const [presence, setPresence] = useState<UserPresence | null>(null);
    useEffect(() => {
        return subscribeToPresence(userId, setPresence);
    }, [userId]);
    
    if (!presence?.online) return null;
    return (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
    );
};

const UserSuggestionRow: React.FC<{ user: UserProfile, currentUserProfile: UserProfile | null }> = ({ user, currentUserProfile }) => {
    const [isLoading, setIsLoading] = useState(false);
    const isFollowing = currentUserProfile?.following?.includes(user.uid);

    const handleFollowClick = async () => {
        if (!currentUserProfile) return;
        setIsLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(currentUserProfile.uid, user.uid);
            } else {
                await followUser(currentUserProfile.uid, user.uid);
            }
        } catch (error) {
            console.error("Failed to toggle follow", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : null}
                    </div>
                    <UserPresenceIndicator userId={user.uid} />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        {user.displayName}
                        {user.isVerified && <BadgeCheck size={14} className="text-blue-500 fill-blue-100 dark:fill-blue-900" />}
                    </p>
                    <p className="text-xs text-slate-500">New to NeuroFocus</p>
                </div>
            </div>
            <button 
                onClick={handleFollowClick}
                disabled={isLoading}
                className={`text-xs font-bold ${isFollowing ? 'text-slate-500' : 'text-indigo-600 hover:text-indigo-800'} disabled:opacity-50`}
            >
                {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
        </div>
    );
};

export function SocialFeed() {
     const { currentUser } = useAuth();
     const { profile } = useProfile();
     const [posts, setPosts] = useState<SocialPost[]>([]);
     const [optimisticPosts, setOptimisticPosts] = useState<SocialPost[]>([]);
     const [loading, setLoading] = useState(true);
     const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
     const [createMode, setCreateMode] = useState<'post' | 'story'>('post');
     const [shareModalContent, setShareModalContent] = useState<{ type: 'post' | 'story', id: string } | null>(null);
     const [activeCommentThreadId, setActiveCommentThreadId] = useState<string | null>(null);
     const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
     const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
     const menuRef = useRef<HTMLDivElement>(null);

     // Sidebar states
     const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
     const [searchQuery, setSearchQuery] = useState('');
     const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToFeed((newPosts) => {
            setPosts(newPosts);
            setOptimisticPosts((current) => current.filter(opt => !newPosts.some(post => post.id === opt.id)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (currentUser) loadSuggestions();
    }, [currentUser]);

    // Close menu on outside click or ESC
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuPostId(null);
            }
        };

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenMenuPostId(null);
            }
        };

        if (openMenuPostId) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEsc);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('keydown', handleEsc);
            };
        }
    }, [openMenuPostId]);

    const loadSuggestions = async () => {
        if (!currentUser) return;
        const users = await getFriendSuggestions(currentUser.uid);
        setSuggestions(users);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
    };

    const handleLike = async (postId: string) => {
        if (!currentUser) return;
        await toggleLike(postId, currentUser.uid);
    };

    const openCreateModal = (mode: 'post' | 'story') => {
        setCreateMode(mode);
        setIsCreateModalOpen(true);
    };

    const handlePostCreated = (newPost: SocialPost) => {
        // Add to optimistic posts - real-time subscription will remove once confirmed
        setOptimisticPosts(prev => [newPost, ...prev]);
    };

    const handlePostUpdated = (updatedPost: SocialPost) => {
        // Update the post in the feed
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        setOptimisticPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        setOpenMenuPostId(null);
        setEditingPost(null);
    };

    const handleEditPost = (post: SocialPost) => {
        setEditingPost(post);
        setIsCreateModalOpen(true);
        setOpenMenuPostId(null);
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            await deletePost(postId);
            setOpenMenuPostId(null);
        } catch (error) {
            alert('Failed to delete post. Please try again.');
        }
    };

    const handleReportPost = async (postId: string) => {
        if (!currentUser) return;
        try {
            await reportPost(postId, currentUser.uid);
            alert('Post reported. Thank you for helping keep our community safe.');
            setOpenMenuPostId(null);
        } catch (error) {
            alert('Failed to report post. Please try again.');
        }
    };

    const handleCopyLink = (postId: string) => {
        const url = `${window.location.origin}/community?post=${postId}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                alert('Link copied to clipboard!');
                setOpenMenuPostId(null);
            }).catch(() => {
                alert(`Copy this link: ${url}`);
            });
        } else {
            alert(`Copy this link: ${url}`);
        }
    };

    // Merge optimistic posts with real posts, avoid duplicates
    const allPosts = [...optimisticPosts, ...posts.filter(p => !optimisticPosts.find(op => op.id === p.id))];
    const shouldShowLoading = loading && allPosts.length === 0;

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Main Feed Column */}
            <div className="lg:col-span-2 max-w-xl mx-auto w-full">
                {/* Stories */}
                <StoryTray onCreateStory={() => openCreateModal('story')} />

                {/* Create Post Trigger (Mobile/Quick Access) */}
                <div
                    onClick={() => openCreateModal('post')}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        {profile?.photoURL && <img src={profile.photoURL} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 text-slate-400 text-sm font-medium">What's on your mind?</div>
                    <PlusSquare className="text-indigo-600" />
                </div>

                {/* Posts Feed */}
                <div className="space-y-6 pb-20">
                    {shouldShowLoading ? (
                        <div className="text-center py-10 text-slate-500">Loading feed...</div>
                    ) : allPosts.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No posts yet. Be the first to share!</div>
                    ) : (
                        allPosts.map((post) => (
                            <article key={post.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* Post Header */}
                                <div className="p-3 flex items-center justify-between relative">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                                            <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-white">
                                                {post.authorPhoto ? (
                                                    <img src={post.authorPhoto} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-400">
                                                        {post.authorName[0]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-white hover:underline cursor-pointer flex items-center gap-1">
                                                {post.authorName}
                                                {post.authorIsVerified && <BadgeCheck size={14} className="text-blue-500 fill-blue-100 dark:fill-blue-900" />}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                {post.location && <span>📍 {post.location}</span>}
                                                {post.listeningTo && post.location && <span>•</span>}
                                                {post.listeningTo && <span>🎧 {post.listeningTo.title}{post.listeningTo.artist ? ` — ${post.listeningTo.artist}` : ''}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative" ref={menuRef}>
                                        <button
                                            onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                                            className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1"
                                        >
                                            <MoreHorizontal size={20} />
                                        </button>

                                        {/* Action Menu Popover */}
                                        {openMenuPostId === post.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 min-w-[180px] py-1">
                                                {currentUser?.uid === post.authorId ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditPost(post)}
                                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                                        >
                                                            <Edit2 size={16} /> Edit post
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePost(post.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={16} /> Delete post
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleCopyLink(post.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                                        >
                                                            <Copy size={16} /> Copy link
                                                        </button>
                                                        <button
                                                            onClick={() => handleReportPost(post.id)}
                                                            className="w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                                        >
                                                            <Flag size={16} /> Report post
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Post Media */}
                                {(post.media && post.media.length > 0) || post.mediaUrl ? (
                                    <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
                                        {post.media && post.media.length > 1 ? (
                                            <MediaCarousel
                                                media={post.media}
                                                aspect="square"
                                                showArrows
                                                showDots
                                            />
                                        ) : (
                                            <img
                                                src={post.media && post.media.length === 1 ? post.media[0].url : (post.mediaUrl as string)}
                                                className="w-full h-full object-cover"
                                            />
                                        )}

                                        {post.media && post.media.length > 1 && (
                                            <div className="absolute top-2 right-2 flex items-center gap-0.5 text-white/90">
                                                {/* Simple stack indicator for carousel posts */}
                                                <div className="relative w-4 h-4">
                                                    <div className="absolute inset-0 rounded-sm border border-white/80 bg-black/40" />
                                                    <div className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-sm border border-white/60 bg-black/20" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {/* Post Actions */}
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLike(post.id)}
                                                className={`transition-transform active:scale-125 ${post.likedBy?.includes(currentUser?.uid || '') ? 'text-rose-500' : 'text-slate-900 dark:text-white hover:text-slate-600'}`}
                                            >
                                                <Heart size={24} fill={post.likedBy?.includes(currentUser?.uid || '') ? "currentColor" : "none"} />
                                            </button>
                                            <button 
                                                onClick={() => setActiveCommentThreadId(activeCommentThreadId === post.id ? null : post.id)}
                                                className="text-slate-900 dark:text-white hover:text-slate-600 flex items-center gap-1"
                                            >
                                                <MessageCircle size={24} />
                                                {post.commentsCount > 0 && <span className="text-sm font-medium">{post.commentsCount}</span>}
                                            </button>
                                            <button 
                                                onClick={() => setShareModalContent({ type: 'post', id: post.id })}
                                                className="text-slate-900 dark:text-white hover:text-slate-600"
                                            >
                                                <Share2 size={24} />
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => currentUser && toggleSavePost(currentUser.uid, post.id)}
                                            className={`transition-transform active:scale-125 ${isPostSaved(profile, post.id) ? 'text-indigo-600' : 'text-slate-900 dark:text-white hover:text-slate-600'}`}
                                        >
                                            <Bookmark size={24} fill={isPostSaved(profile, post.id) ? "currentColor" : "none"} />
                                        </button>
                                    </div>

                                    {/* Likes */}
                                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                                        {post.likes} likes
                                    </div>

                                    {/* Caption */}
                                    <div className="text-sm text-slate-900 dark:text-white mb-2">
                                        <span className="font-bold mr-2">{post.authorName}</span>
                                        {post.content}
                                    </div>

                                    {/* Comments Link */}
                                    <button 
                                        onClick={() => setActiveCommentThreadId(activeCommentThreadId === post.id ? null : post.id)}
                                        className="text-slate-500 text-sm mb-1 hover:text-slate-700 dark:hover:text-slate-300"
                                    >
                                        {activeCommentThreadId === post.id ? 'Hide comments' : post.commentsCount > 0 ? `View all ${post.commentsCount} comments` : 'Add a comment'}
                                    </button>

                                    {activeCommentThreadId === post.id && (
                                        <CommentThread
                                            parentId={post.id}
                                            parentType="posts"
                                            isOwner={currentUser?.uid === post.authorId}
                                            className="mt-2 rounded-lg"
                                        />
                                    )}

                                    {/* Timestamp */}
                                    <div className="text-xs text-slate-400 uppercase tracking-wide">
                                        {timeAgo(post.createdAt)}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>

            {/* Sidebar (Desktop Only) */}
            <div className="hidden lg:block space-y-6">
                {/* User Profile Mini */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            {profile?.photoURL && <img src={profile.photoURL} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">{profile?.displayName || 'Student'}</p>
                            <p className="text-sm text-slate-500">{currentUser?.email}</p>
                        </div>
                    </div>
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Switch</button>
                </div>

                <SharedContentPanel />

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-slate-300 outline-none"
                    />
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                </form>

                {/* Suggestions */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="font-bold text-slate-500 text-sm">Suggestions For You</p>
                        <button className="text-xs font-bold text-slate-900 dark:text-white">See All</button>
                    </div>
                    <div className="space-y-3">
                        {suggestions.map(user => (
                            <UserSuggestionRow key={user.uid} user={user} currentUserProfile={profile} />
                        ))}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="text-xs text-slate-400 space-y-4">
                    <p>About • Help • Press • API • Jobs • Privacy • Terms</p>
                    <p>© 2025 NEUROFOCUS AI TUTOR</p>
                </div>
            </div>

            <CreateMediaModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingPost(null);
                }}
                type={createMode}
                onPostCreated={handlePostCreated}
                onPostUpdated={handlePostUpdated}
                editingPost={editingPost}
            />

            {shareModalContent && (
                <ShareModal
                    isOpen={!!shareModalContent}
                    onClose={() => setShareModalContent(null)}
                    content={shareModalContent}
                />
            )}
        </div>
    );
}
