import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Home,
    GraduationCap,
    LibraryBig,
    Users,
    User,
    MessageCircle,
    LogOut,
    Sun,
    Moon,
    Mic,
    BrainCircuit,
    Search,
    PlusSquare,
    ChevronDown,
    Timer
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { usePomodoro } from '../contexts/PomodoroContext';
import { PomodoroOverlay } from './PomodoroOverlay';
import { MusicPlayer } from './MusicPlayer';

export function Layout({
    children,
    theme,
    toggleTheme,
    onStartVoice
}: {
    children?: React.ReactNode,
    theme: string,
    toggleTheme: () => void,
    onStartVoice: () => void
}) {
    const { logout } = useAuth();
    const { profile } = useProfile();
    const { isWidgetVisible, setWidgetVisible } = usePomodoro();
    const navigate = useNavigate();
    const location = useLocation();
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };

        if (profileDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [profileDropdownOpen]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    const NavItem = ({ path, icon: Icon, label, isMobile = false }: { path: string; icon: any; label: string; isMobile?: boolean }) => {
        const isActive = location.pathname === path;
        return (
            <button
                onClick={() => navigate(path)}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${isMobile
                    ? 'flex-col gap-1 p-1'
                    : 'w-full hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${isActive ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
                <Icon
                    size={isMobile ? 24 : 24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-transform group-active:scale-90 ${isActive ? 'text-slate-900 dark:text-white' : ''}`}
                />
                <span className={`${isMobile ? 'text-[10px]' : 'text-base font-medium'} ${!isMobile && 'hidden xl:block'}`}>
                    {label}
                </span>
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">

            {/* Desktop Sidebar - Instagram Style */}
            <aside className="hidden md:flex flex-col w-20 xl:w-64 border-r border-slate-200 dark:border-slate-800 fixed h-full z-20 bg-white dark:bg-slate-950 px-3 py-6 transition-all duration-300">
                <div className="mb-8 px-3 xl:px-4">
                    <div className="hidden xl:block font-bold text-2xl tracking-tight italic">NeuroFocus</div>
                    <div className="xl:hidden w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900">
                        <BrainCircuit size={24} />
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    <NavItem path="/dashboard" icon={Home} label="Home" />
                    <NavItem path="/tutor" icon={GraduationCap} label="AI Tutor" />
                    <NavItem path="/tools" icon={LibraryBig} label="Tools" />
                    <NavItem path="/community" icon={Users} label="Community" />
                    <NavItem path="/chat" icon={MessageCircle} label="Messages" />
                    <NavItem path="/profile" icon={User} label="Profile" />
                </nav>

                <div className="space-y-2 mt-auto">
                    <button
                        onClick={onStartVoice}
                        className="w-full flex items-center gap-4 p-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                    >
                        <Mic size={24} className="group-hover:text-rose-500 transition-colors" />
                        <span className="hidden xl:block font-medium">Voice Mode</span>
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-4 p-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                        <span className="hidden xl:block font-medium">Switch Appearance</span>
                    </button>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                        >
                            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-white overflow-hidden flex-shrink-0">
                                {profile?.photoURL ? (
                                    <img src={profile.photoURL} className="w-full h-full object-cover" alt={profile.displayName} />
                                ) : (
                                    profile?.displayName?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <div className="hidden xl:flex flex-col items-start">
                                <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{profile?.displayName || 'Student'}</span>
                                <ChevronDown size={14} className="text-slate-400" />
                            </div>
                        </button>

                        {profileDropdownOpen && (
                            <div className="absolute bottom-full left-3 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
                                <button
                                    onClick={() => {
                                        navigate('/profile');
                                        setProfileDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    View Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-20 xl:ml-64 pb-16 md:pb-0 min-h-screen relative">
                {/* Mobile Header */}
                <header className="md:hidden h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30">
                    <div className="font-bold text-xl tracking-tight italic">NeuroFocus</div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="text-slate-900 dark:text-white">
                            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                        </button>
                        <button onClick={() => navigate('/chat')} className="text-slate-900 dark:text-white relative">
                            <MessageCircle size={24} />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">2</span>
                        </button>
                    </div>
                </header>

                <div className="max-w-5xl mx-auto w-full">
                    <Outlet />
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-40 pb-safe">
                <NavItem path="/dashboard" icon={Home} label="Home" isMobile />
                <NavItem path="/tutor" icon={GraduationCap} label="Tutor" isMobile />
                <div className="flex items-center justify-center">
                    <button
                        onClick={onStartVoice}
                        className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 shadow-lg active:scale-95 transition-transform"
                    >
                        <Mic size={20} />
                    </button>
                </div>
                <NavItem path="/community" icon={Users} label="Social" isMobile />
                <NavItem path="/profile" icon={User} label="Profile" isMobile />
            </nav>

            <PomodoroOverlay />
            {!isWidgetVisible && (
                <button
                    onClick={() => setWidgetVisible(true)}
                    className="fixed bottom-36 right-4 md:bottom-8 md:right-48 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    title="Open Focus Timer"
                >
                    <Timer size={24} />
                    <span className="hidden md:inline font-bold text-sm">Timer</span>
                </button>
            )}
            <MusicPlayer />
        </div>
    );
}
