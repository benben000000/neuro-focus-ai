import React, { useState, useEffect, useRef } from 'react';
import { SocialComment, addComment, deleteComment, subscribeToComments, toggleCommentReaction } from '../services/social';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Send, Trash2, X, Smile } from 'lucide-react';

interface CommentThreadProps {
    parentId: string;
    parentType: 'posts' | 'stories';
    isOwner: boolean;
    onClose?: () => void;
    className?: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ parentId, parentType, isOwner, onClose, className = '' }) => {
    const { currentUser } = useAuth();
    const { profile } = useProfile();
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Available reactions
    const availableReactions = ['👍', '🔥', '👏', '💡', '❤️'];

    useEffect(() => {
        const unsubscribe = subscribeToComments(parentId, parentType, (newComments) => {
            setComments(newComments);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [parentId, parentType]);

    // Close reaction picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (reactionPickerOpen) {
                const target = event.target as Element;
                if (!target.closest('.reaction-picker-container')) {
                    setReactionPickerOpen(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [reactionPickerOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!loading && comments.length > 0) {
             // Only scroll on initial load or new message if near bottom? 
             // For now, let's scroll to bottom on load
        }
    }, [loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUser || submitting) return;

        const commentText = newComment.trim();
        setNewComment(''); // Optimistic clear
        setSubmitting(true);
        
        try {
            // Use profile display name if available, fallback to auth display name or email
            const displayName = profile?.displayName || currentUser.displayName || currentUser.email || 'User';
            
            await addComment(parentId, parentType, commentText, {
                uid: currentUser.uid,
                displayName,
                photoURL: currentUser.photoURL || undefined,
                isVerified: profile?.isVerified || false
            });
            scrollToBottom();
        } catch (error) {
            console.error('Failed to add comment:', error);
            setNewComment(commentText); // Restore on fail
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await deleteComment(parentId, parentType, commentId);
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    const handleReaction = async (commentId: string, emoji: string) => {
        if (!currentUser) return;
        
        try {
            await toggleCommentReaction(parentId, parentType, commentId, emoji, currentUser.uid);
            setReactionPickerOpen(null); // Close picker after selection
        } catch (error) {
            console.error('Failed to toggle reaction:', error);
        }
    };

    const hasUserReacted = (comment: SocialComment, emoji: string) => {
        return comment.reactions?.[emoji]?.includes(currentUser?.uid || '') || false;
    };

    const getReactionCount = (comment: SocialComment, emoji: string) => {
        return comment.reactions?.[emoji]?.length || 0;
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

    return (
        <div className={`flex flex-col bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 ${className}`}>
            {onClose && (
                <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Comments</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[300px] min-h-[100px]">
                {loading ? (
                    <div className="text-center text-slate-400 text-sm py-4">Loading comments...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-4">No comments yet.</div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                {comment.authorPhoto ? (
                                    <img src={comment.authorPhoto} className="w-full h-full object-cover" alt={comment.authorName} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                        {comment.authorName?.[0] || 'A'}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {comment.authorName || 'Anonymous'}
                                    </span>
                                    <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">{comment.content}</p>
                                
                                {/* Reactions */}
                                <div className="flex items-center gap-2 mt-2">
                                    {/* Reaction chips */}
                                    {Object.entries(comment.reactions || {}).map(([emoji, reactors]) => (
                                        <button
                                            key={emoji}
                                            onClick={() => currentUser && handleReaction(comment.id, emoji)}
                                            disabled={!currentUser}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                                                hasUserReacted(comment, emoji)
                                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                            } ${!currentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <span>{emoji}</span>
                                            <span>{reactors.length}</span>
                                        </button>
                                    ))}
                                    
                                    {/* Reaction picker button */}
                                    {currentUser && (
                                        <div className="relative reaction-picker-container">
                                            <button
                                                onClick={() => setReactionPickerOpen(reactionPickerOpen === comment.id ? null : comment.id)}
                                                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                title="Add reaction"
                                            >
                                                <Smile size={14} />
                                            </button>
                                            
                                            {/* Reaction picker dropdown */}
                                            {reactionPickerOpen === comment.id && (
                                                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                                                    {availableReactions.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleReaction(comment.id, emoji)}
                                                            className="text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-1 transition-colors"
                                                            title={emoji}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {(isOwner || currentUser?.uid === comment.authorId) && (
                                <button 
                                    onClick={() => handleDelete(comment.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity self-start"
                                    title="Delete comment"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {currentUser ? (
                <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-center">
                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        {currentUser.photoURL ? (
                            <img src={currentUser.photoURL} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                                {(profile?.displayName || currentUser.displayName || currentUser.email || 'User')[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        disabled={submitting}
                    />
                    <button 
                        type="submit" 
                        disabled={!newComment.trim() || submitting}
                        className="text-indigo-600 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed p-2 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            ) : (
                <div className="p-3 text-center text-sm text-slate-500">
                    Sign in to comment
                </div>
            )}
        </div>
    );
};
