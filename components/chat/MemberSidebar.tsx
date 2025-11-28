import React from 'react';
import { GroupMember } from '../../services/groups';
import { UserProfile } from '../../services/social';

interface MemberSidebarProps {
    members: (GroupMember & Partial<UserProfile>)[];
    onStartDM?: (userId: string) => void;
}

export const MemberSidebar: React.FC<MemberSidebarProps> = ({ members, onStartDM }) => {
    // Group members by role or online status
    const owners = members.filter(m => m.role === 'owner');
    const admins = members.filter(m => m.role === 'admin');
    const regularMembers = members.filter(m => m.role === 'member' || !m.role);

    const renderMember = (member: GroupMember & Partial<UserProfile>) => (
        <button
            key={member.userId}
            onClick={() => onStartDM?.(member.userId)}
            className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors opacity-90 hover:opacity-100 text-left"
        >
            <div className="relative">
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    {member.photoURL ? (
                        <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xs font-bold text-slate-500">{member.displayName?.charAt(0).toUpperCase()}</span>
                    )}
                </div>
                {/* Status indicator - simplified for now (always online for demo) */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {member.displayName || 'User'}
                </p>
            </div>
        </button>
    );

    return (
        <div className="w-60 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col p-4 overflow-y-auto hidden lg:flex flex-shrink-0">
            <div className="mb-6">
                 <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors">
                     Invite People
                 </button>
            </div>

            {owners.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Owner — {owners.length}</h3>
                    {owners.map(renderMember)}
                </div>
            )}
            
            {admins.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admins — {admins.length}</h3>
                    {admins.map(renderMember)}
                </div>
            )}

            {regularMembers.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Members — {regularMembers.length}</h3>
                    {regularMembers.map(renderMember)}
                </div>
            )}
        </div>
    );
};
