import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { Group } from '../../services/groups';

interface GroupRailProps {
    groups: Group[];
    selectedGroupId: string | null;
    onSelectGroup: (groupId: string | null) => void;
    onCreateGroup: () => void;
}

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => {
    return (
        <div className="relative flex items-center group/tooltip">
            {children}
            <div className="absolute left-16 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {text}
            </div>
        </div>
    );
};

export const GroupRail: React.FC<GroupRailProps> = ({ groups, selectedGroupId, onSelectGroup, onCreateGroup }) => {
    return (
        <div className="w-[72px] bg-slate-100 dark:bg-slate-950 flex flex-col items-center py-3 gap-2 overflow-y-auto border-r border-slate-200 dark:border-slate-800 shrink-0">
            {/* Home / DMs */}
            <Tooltip text="Direct Messages">
                <button
                    onClick={() => onSelectGroup(null)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        selectedGroupId === null
                            ? 'bg-indigo-600 text-white rounded-xl shadow-md'
                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:rounded-xl shadow-sm'
                    }`}
                >
                    <MessageSquare size={24} />
                </button>
            </Tooltip>

            <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-1" />

            {/* Groups */}
            {groups.map(group => (
                <Tooltip key={group.id} text={group.name}>
                    <button
                        onClick={() => onSelectGroup(group.id)}
                        className={`w-12 h-12 rounded-[24px] flex items-center justify-center transition-all overflow-hidden relative group ${
                            selectedGroupId === group.id
                                ? 'rounded-[16px] ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-slate-900'
                                : 'hover:rounded-[16px]'
                        }`}
                    >
                        {group.iconUrl ? (
                            <img src={group.iconUrl} alt={group.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center font-bold text-lg ${
                                selectedGroupId === group.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'
                            }`}>
                                {group.name.substring(0, 1).toUpperCase()}
                            </div>
                        )}
                    </button>
                </Tooltip>
            ))}

            {/* Create Group */}
            <Tooltip text="Create a Group">
                <button
                    onClick={onCreateGroup}
                    className="w-12 h-12 rounded-[24px] bg-white dark:bg-slate-800 text-green-500 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all hover:rounded-[16px] shadow-sm mt-2"
                >
                    <Plus size={24} />
                </button>
            </Tooltip>
        </div>
    );
};
