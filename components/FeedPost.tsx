import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    SocialPost, 
    toggleLike, 
    deletePost 
} from '../services/social';
import { MessageCircle, Heart, Share2, Bookmark, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { MediaCarousel } from './MediaCarousel';
import { CreateMediaModal } from './CreateMediaModal';
import { PostComments } from './PostComments';

const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

interface FeedPostProps {
    post: SocialPost;
    onDelete?: (postId: string) => void;
}

export function FeedPost({ post, onDelete }: FeedPostProps) {
    const { currentUser } = useAuth();
    const [commentCount, setCommentCount] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const actionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setShowActions(false);
            }
        };

        if (showActions) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showActions]);

    const handleLike = async () => {
        if (!currentUser) return;
        await toggleLike(post.id, currentUser.uid);
    };

    const handleDeletePost = async () => {
        if (!window.confirm('Delete this post? This cannot be undone.')) return;
        try {
            await deletePost(post.id);
            if (onDelete) onDelete(post.id);
        } catch (error) {
            console.error('Failed to delete post:', error);
        }
    };

    const isAuthor = currentUser?.uid === post.authorId;

    return (
        <article className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Post Header */}
            <div className="p-3 flex items-center justify-between relative">
                <div className="flex items-center gap-3">
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
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white hover:underline cursor-pointer">{post.authorName}</h3>
                        {post.location && <p className="text-xs text-slate-500">{post.location}</p>}
                    </div>
                </div>
                
                {isAuthor && (
                    <div className="relative" ref={actionsRef}>
                        <button 
                            onClick={() => setShowActions(!showActions)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                        
                        {showActions && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={() => {
                                        setShowActions(false);
                                        setIsEditing(true);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <Edit2 size={16} /> Edit Post
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowActions(false);
                                        handleDeletePost();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete Post
                                </button>
                            </div>
                        )}
                    </div>
                )}
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
                            onClick={handleLike}
                            className={`transition-transform active:scale-125 ${post.likedBy?.includes(currentUser?.uid || '') ? 'text-rose-500' : 'text-slate-900 dark:text-white hover:text-slate-600'}`}
                        >
                            <Heart size={24} fill={post.likedBy?.includes(currentUser?.uid || '') ? "currentColor" : "none"} />
                        </button>
                        <button 
                            onClick={() => setShowComments(!showComments)}
                            className="text-slate-900 dark:text-white hover:text-slate-600"
                        >
                            <MessageCircle size={24} />
                        </button>
                        <button className="text-slate-900 dark:text-white hover:text-slate-600">
                            <Share2 size={24} />
                        </button>
                    </div>
                    <button className="text-slate-900 dark:text-white hover:text-slate-600">
                        <Bookmark size={24} />
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
                {commentCount > 0 && !showComments && (
                    <button 
                        onClick={() => setShowComments(true)}
                        className="text-slate-500 text-sm mb-1"
                    >
                        View all {commentCount} comments
                    </button>
                )}

                {/* Comments Section */}
                <div className={showComments ? 'mt-3 animate-in slide-in-from-top-2 duration-200' : 'hidden'}>
                    <PostComments 
                        postId={post.id} 
                        postAuthorId={post.authorId}
                        onCommentCountChange={setCommentCount}
                    />
                </div>

                {/* Timestamp */}
                <div className="text-xs text-slate-400 uppercase tracking-wide mt-2">
                    {timeAgo(post.createdAt)}
                </div>
                
            </div>
            
            {isEditing && (
                <CreateMediaModal 
                    isOpen={true}
                    onClose={() => setIsEditing(false)}
                    type="post"
                    initialData={post}
                />
            )}
        </article>
    );
}
