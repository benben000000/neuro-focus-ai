import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SocialComment, addComment, deleteComment, subscribeToComments } from '../services/social';

interface CommentThreadProps {
    targetType: 'post' | 'story';
    targetId: string;
    authorId: string; // Author of the post/story (for deletion rights)
    onClose?: () => void;
    variant?: 'feed' | 'full';
}

export function CommentThread({ targetType, targetId, authorId, onClose, variant = 'feed' }: CommentThreadProps) {
    const { currentUser } = useAuth();
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(5);

    useEffect(() => {
        const unsubscribe = subscribeToComments(targetType, targetId, (newComments) => {
            setComments(newComments);
        });
        return () => unsubscribe();
    }, [targetType, targetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !newComment.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await addComment(targetType, targetId, {
                authorId: currentUser.uid,
                authorName: currentUser.displayName || 'User',
                authorPhoto: currentUser.photoURL || '',
                content: newComment.trim()
            });
            setNewComment('');
        } catch (err) {
            console.error("Failed to add comment:", err);
            setError('Failed to post comment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        try {
            await deleteComment(targetType, targetId, commentId);
        } catch (err) {
            console.error("Failed to delete comment:", err);
            setError('Failed to delete comment.');
        }
    };

    const timeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    // Determine which comments to show based on visibleCount
    // We assume comments are sorted oldest to newest.
    // We want to show the N most recent comments.
    const visibleComments = comments.slice(Math.max(0, comments.length - visibleCount));
    const hasHiddenComments = comments.length > visibleCount;

    return (
        <div className="flex flex-col h-full">
            {/* Header / Controls */}
            <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Comments ({comments.length})
                </h4>
                {onClose && (
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-100 text-red-700 px-3 py-2 rounded text-xs mb-2">
                    {error}
                </div>
            )}

            {/* Load More */}
            {hasHiddenComments && (
                <button 
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="text-xs text-slate-500 font-medium hover:text-slate-900 mb-3 text-left px-1"
                >
                    View previous comments ({comments.length - visibleCount} hidden)
                </button>
            )}

            {/* Comments List */}
            <div className={`flex-1 overflow-y-auto space-y-4 pr-1 min-h-[100px] custom-scrollbar ${variant === 'feed' ? 'max-h-[300px]' : ''}`}>
                {comments.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-4">
                        No comments yet. Be the first!
                    </div>
                )}
                {visibleComments.map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                         <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                            {comment.authorPhoto ? (
                                <img src={comment.authorPhoto} className="w-full h-full object-cover" alt={comment.authorName} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-400">
                                    {comment.authorName[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                                <div className="text-sm">
                                    <span className="font-bold text-slate-900 dark:text-white mr-2">
                                        {comment.authorName}
                                    </span>
                                    <span className="text-slate-700 dark:text-slate-300 break-words">
                                        {comment.content}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
                                {(currentUser?.uid === comment.authorId || currentUser?.uid === authorId) && (
                                    <button 
                                        onClick={() => handleDelete(comment.id)}
                                        className="text-xs text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            {currentUser ? (
                <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} className="w-full h-full object-cover" alt="Me" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-400">
                                {currentUser.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                        disabled={isSubmitting}
                    />
                    <button 
                        type="submit" 
                        disabled={!newComment.trim() || isSubmitting}
                        className="text-indigo-600 disabled:opacity-50 hover:text-indigo-800 font-bold text-sm"
                    >
                        Post
                    </button>
                </form>
            ) : (
                <div className="mt-3 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    Log in to comment
                </div>
            )}
        </div>
    );
}
