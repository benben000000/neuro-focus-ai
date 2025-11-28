import React from 'react';
import { KeyConcept } from '../../types';
import { Star, Zap, Hash } from 'lucide-react';

interface KeyConceptsBarProps {
    concepts: KeyConcept[];
}

export const KeyConceptsBar: React.FC<KeyConceptsBarProps> = ({ concepts }) => {
    const getImportanceColor = (importance: KeyConcept['importance']) => {
        switch (importance) {
            case 'high': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
            case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'low': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    const getIcon = (importance: KeyConcept['importance']) => {
        switch (importance) {
            case 'high': return <Star size={14} className="fill-current" />;
            case 'medium': return <Zap size={14} />;
            case 'low': return <Hash size={14} />;
        }
    };

    return (
        <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex gap-3">
                {concepts.map((concept, index) => (
                    <div
                        key={index}
                        className={`
              flex-shrink-0 p-3 rounded-xl border min-w-[200px] max-w-[280px]
              ${getImportanceColor(concept.importance)}
            `}
                    >
                        <div className="flex items-center gap-2 mb-1 font-semibold text-sm">
                            {getIcon(concept.importance)}
                            <span>{concept.term}</span>
                        </div>
                        <p className="text-xs opacity-90 line-clamp-2" title={concept.definition}>
                            {concept.definition}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
