import React, { useState, useRef, useEffect } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { getUserProfile, UserProfile } from '../../services/social';
import { UserPreviewCard } from './UserPreviewCard';
import { useNavigate } from 'react-router-dom';

interface ProfilePreviewTriggerProps {
    userId: string;
    children: React.ReactNode;
    disabled?: boolean;
    onStartDM?: (chatId: string) => void;
}

export const ProfilePreviewTrigger: React.FC<ProfilePreviewTriggerProps> = ({
    userId,
    children,
    disabled = false,
    onStartDM
}) => {
    const navigate = useNavigate();
    const { profile: currentUserProfile } = useProfile();
    const [showPreview, setShowPreview] = useState(false);
    const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const triggerRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadUserPreview = async () => {
        if (previewUser || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const user = await getUserProfile(userId);
            if (user) {
                setPreviewUser(user);
            } else {
                setError('User not found');
            }
        } catch (err) {
            console.error('Failed to load user preview', err);
            setError('Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMouseEnter = () => {
        if (disabled || isMobile) return;
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setShowPreview(true);
        loadUserPreview();
    };

    const handleMouseLeave = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
            setShowPreview(false);
        }, 200);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        
        if (isMobile) {
            loadUserPreview();
            setShowPreview(true);
        }
    };

    const handleViewProfile = (uid: string) => {
        setShowPreview(false);
        navigate(`/profile/${uid}`);
    };

    const handleDMClick = (chatId: string) => {
        setShowPreview(false);
        onStartDM?.(chatId);
    };

    // Close preview when clicking outside
    useEffect(() => {
        if (!showPreview) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
                previewRef.current && !previewRef.current.contains(e.target as Node)) {
                setShowPreview(false);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowPreview(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showPreview]);

    return (
        <div
            ref={triggerRef}
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            {/* Trigger element */}
            <div className={disabled ? '' : 'cursor-pointer hover:opacity-80 transition-opacity'}>
                {children}
            </div>

            {/* Preview card for desktop (hover) or mobile (modal-like) */}
            {showPreview && (
                <div
                    ref={previewRef}
                    className={`absolute z-50 ${
                        isMobile
                            ? 'fixed inset-0 flex items-center justify-center bg-black/50 p-4'
                            : 'top-full mt-2 left-0'
                    }`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {isMobile ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-500">Loading...</div>
                            ) : error ? (
                                <div className="p-8 text-center text-red-500">{error}</div>
                            ) : previewUser ? (
                                <UserPreviewCard
                                    user={previewUser}
                                    currentUserProfile={currentUserProfile}
                                    onViewProfile={handleViewProfile}
                                    onStartDM={handleDMClick}
                                    isCurrentUser={currentUserProfile?.uid === previewUser.uid}
                                />
                            ) : null}
                        </div>
                    ) : (
                        <div>
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-500">Loading...</div>
                            ) : error ? (
                                <div className="p-8 text-center text-red-500">{error}</div>
                            ) : previewUser ? (
                                <UserPreviewCard
                                    user={previewUser}
                                    currentUserProfile={currentUserProfile}
                                    onViewProfile={handleViewProfile}
                                    onStartDM={handleDMClick}
                                    isCurrentUser={currentUserProfile?.uid === previewUser.uid}
                                />
                            ) : null}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
