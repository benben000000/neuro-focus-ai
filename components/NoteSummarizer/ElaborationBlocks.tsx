import React from 'react';
import { ElaborationBlock } from '../../types';
import { Microscope, Link as LinkIcon } from 'lucide-react';

interface ElaborationBlocksProps {
    blocks: ElaborationBlock[];
}

export const ElaborationBlocks: React.FC<ElaborationBlocksProps> = ({ blocks }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blocks.map((block, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                        <Microscope size={20} />
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            {block.topic}
                        </h3>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        {block.elaboration}
                    </p>

                    {block.connections && block.connections.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50">
                            <LinkIcon size={14} className="text-slate-400 mt-1" />
                            {block.connections.map((conn, idx) => (
                                <span
                                    key={idx}
                                    className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md"
                                >
                                    {conn}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
