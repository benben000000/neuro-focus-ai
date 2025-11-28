import React, { useState, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { GroupMessage } from '../../services/groups';
import { ChatMessage } from '../../services/social';

interface MessageSearchProps {
    messages: (GroupMessage | ChatMessage)[];
    onSearchResults?: (results: Array<GroupMessage | ChatMessage>) => void;
    onHighlightMessage?: (messageId: string) => void;
    isChatMessage?: boolean;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({
    messages,
    onSearchResults,
    onHighlightMessage,
    isChatMessage = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Array<GroupMessage | ChatMessage>>([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const performSearch = useCallback((term: string) => {
        if (!term.trim()) {
            setSearchResults([]);
            onSearchResults?.([]);
            return;
        }

        const lowerTerm = term.toLowerCase();
        const results = messages.filter((msg) =>
            !('isDeleted' in msg && msg.isDeleted) &&
            msg.content.toLowerCase().includes(lowerTerm)
        );

        setSearchResults(results);
        setCurrentResultIndex(0);
        onSearchResults?.(results);
    }, [messages, onSearchResults]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setSearchTerm(term);
        performSearch(term);
    };

    const handleNext = () => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentResultIndex + 1) % searchResults.length;
        setCurrentResultIndex(nextIndex);
        onHighlightMessage?.(searchResults[nextIndex].id);
    };

    const handlePrev = () => {
        if (searchResults.length === 0) return;
        const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1;
        setCurrentResultIndex(prevIndex);
        onHighlightMessage?.(searchResults[prevIndex].id);
    };

    const handleClear = () => {
        setSearchTerm('');
        setSearchResults([]);
        setCurrentResultIndex(0);
        onSearchResults?.([]);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Search messages"
            >
                <Search size={18} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchTerm}
                                onChange={handleSearch}
                                autoFocus
                                className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-500 text-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={handleClear}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 p-2 bg-slate-50 dark:bg-slate-700 rounded">
                                    <div className="font-medium">
                                        {searchResults[currentResultIndex].senderName}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 truncate">
                                        {searchResults[currentResultIndex].content}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {currentResultIndex + 1} / {searchResults.length}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={handlePrev}
                                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {searchTerm && searchResults.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                            No messages found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
