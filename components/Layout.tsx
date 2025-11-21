import React, { useState } from 'react';
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
    PlusSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
    const navigate = useNavigate();
    const location = useLocation();

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

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:text-red-500 dark:hover:text-red-400"
                    >
                        <LogOut size={24} />
                        <span className="hidden xl:block font-medium">Log out</span>
                    </button>
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
            <MusicPlayer />
        </div>
    );
}
