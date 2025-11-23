import React, { useState, useEffect, useRef } from 'react';
import { Bell, Phone, UserPlus, AtSign, Zap, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications, UserNotification, markNotificationAsRead } from '../services/social';
import { useNavigate } from 'react-router-dom';

export function NotificationCenter({ isMobile = false, minimal = false }: { isMobile?: boolean, minimal?: boolean }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = subscribeToNotifications(currentUser.uid, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = async (notification: UserNotification) => {
        if (!currentUser) return;
        
        // Mark as read
        if (!notification.isRead) {
            await markNotificationAsRead(currentUser.uid, notification.id);
        }

        // Action based on type
        switch (notification.type) {
            case 'voice_invite':
            case 'call_join':
                if (notification.data?.channelId) {
                    navigate('/chat'); 
                    // ideally navigate to specific channel, but for now chat root
                    // In a real app we might pass state or use a query param
                }
                break;
            case 'group_invite':
                navigate('/chat');
                break;
            case 'mention':
                if (notification.data?.postId) {
                    navigate('/community');
                }
                break;
            default:
                break;
        }
        
        setIsOpen(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'voice_invite':
            case 'call_join':
                return <Phone size={16} className="text-green-500" />;
            case 'group_invite':
                return <UserPlus size={16} className="text-blue-500" />;
            case 'mention':
                return <AtSign size={16} className="text-orange-500" />;
            case 'focus_reminder':
                return <Zap size={16} className="text-yellow-500" />;
            default:
                return <Bell size={16} className="text-slate-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${minimal ? '' : 'w-full'} hover:bg-slate-100 dark:hover:bg-slate-800
                ${isMobile ? 'flex-col gap-1 p-1' : ''}
                ${minimal ? 'p-2 justify-center' : ''}`}
            >
                <div className="relative">
                    <Bell
                        size={isMobile ? 24 : 24}
                        strokeWidth={isOpen ? 2.5 : 2}
                        className={`transition-transform group-active:scale-90 ${isOpen ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                    />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
                {!minimal && (
                    <span className={`${isMobile ? 'text-[10px]' : 'text-base font-medium'} ${!isMobile && 'hidden xl:block'} text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white`}>
                        Notifications
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${isMobile || minimal ? 'top-full right-0 mt-2' : 'left-full top-0 ml-2'} w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden`}>
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs text-indigo-500 font-medium">{unreadCount} new</span>
                        )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map((notification) => (
                                    <div 
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                {notification.senderPhoto ? (
                                                    <img src={notification.senderPhoto} className="w-full h-full rounded-full object-cover" />
                                                ) : getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <div className="mt-2 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
