import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Lightbulb } from 'lucide-react';
import { SummarySection } from '../../types';

interface SummarySectionsAccordionProps {
    sections: SummarySection[];
}

export const SummarySectionsAccordion: React.FC<SummarySectionsAccordionProps> = ({ sections }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

    const toggleSection = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="space-y-4">
            {sections.map((section, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <button
                        onClick={() => toggleSection(index)}
                        className="w-full flex items-center justify-between p-4 text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${expandedIndex === index ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                <BookOpen size={20} />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                                {section.heading}
                            </h3>
                        </div>
                        {expandedIndex === index ? (
                            <ChevronUp className="text-slate-400" size={20} />
                        ) : (
                            <ChevronDown className="text-slate-400" size={20} />
                        )}
                    </button>

                    {expandedIndex === index && (
                        <div className="px-4 pb-6 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 mb-6">
                                <p className="whitespace-pre-wrap leading-relaxed">
                                    {section.content}
                                </p>
                            </div>

                            {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/50">
                                    <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-300 font-medium">
                                        <Lightbulb size={18} />
                                        <span>Key Takeaways</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {section.keyTakeaways.map((takeaway, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900 dark:text-indigo-100">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                                <span>{takeaway}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
