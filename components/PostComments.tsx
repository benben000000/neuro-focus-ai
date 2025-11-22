import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    PostComment, 
    subscribeToComments, 
    addComment, 
    deleteComment 
} from '../services/social';
import { Trash2 } from 'lucide-react';

const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

interface PostCommentsProps {
    postId: string;
    postAuthorId: string;
    onCommentCountChange?: (count: number) => void;
    className?: string;
}

export function PostComments({ postId, postAuthorId, onCommentCountChange, className = '' }: PostCommentsProps) {
    const { currentUser } = useAuth();
    const [comments, setComments] = useState<PostComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToComments(postId, (newComments) => {
            setComments(newComments);
            if (onCommentCountChange) {
                onCommentCountChange(newComments.length);
            }
        });
        return () => unsubscribe();
    }, [postId, onCommentCountChange]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !newComment.trim()) return;

        setIsSubmitting(true);
        try {
            await addComment(postId, {
                uid: currentUser.uid,
                displayName: currentUser.displayName || 'User',
                photoURL: currentUser.photoURL || undefined
            }, newComment.trim());
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await deleteComment(postId, commentId);
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    const isPostAuthor = currentUser?.uid === postAuthorId;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Comments List */}
            <div className="space-y-3">
                {comments.map(comment => (
                    <div key={comment.id} className="flex items-start gap-2 text-sm group">
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">
                            {comment.authorName}
                        </span>
                        <div className="flex-1 min-w-0">
                            <span className="text-slate-700 dark:text-slate-300 break-words">
                                {comment.content}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400">
                                    {timeAgo(comment.createdAt)}
                                </span>
                                {(currentUser?.uid === comment.authorId || isPostAuthor) && (
                                    <button 
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="text-xs text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                        title="Delete comment"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-transparent text-sm border-none focus:ring-0 p-0 placeholder:text-slate-400 dark:text-white"
                />
                {newComment.trim() && (
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="text-indigo-600 font-bold text-sm hover:text-indigo-700 disabled:opacity-50"
                    >
                        Post
                    </button>
                )}
            </form>
        </div>
    );
}
