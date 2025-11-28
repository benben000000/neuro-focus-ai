import React from 'react';
import { SpacedRepetitionSignal } from '../../types';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface SpacedRepetitionListProps {
    signals: SpacedRepetitionSignal[];
}

export const SpacedRepetitionList: React.FC<SpacedRepetitionListProps> = ({ signals }) => {
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
            case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30';
            case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
            default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700';
        }
    };

    return (
        <div className="space-y-3">
            {signals.map((signal, index) => (
                <div
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${getPriorityColor(signal.priority)}`}
                >
                    <div className="flex-shrink-0 mt-1">
                        <Calendar size={20} className="opacity-80" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg">
                                {signal.reviewInDays} {signal.reviewInDays === 1 ? 'Day' : 'Days'}
                            </span>
                            <span className="text-xs uppercase tracking-wider font-medium opacity-70 border px-1.5 py-0.5 rounded">
                                {signal.priority} Priority
                            </span>
                        </div>
                        <p className="text-sm opacity-90 leading-relaxed">
                            {signal.reason}
                        </p>
                    </div>

                    <div className="flex-shrink-0 self-center">
                        <button className="text-xs font-medium underline opacity-70 hover:opacity-100">
                            Add to Calendar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
