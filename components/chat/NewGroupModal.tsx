import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface NewGroupModalProps {
    onClose: () => void;
    onCreate: (name: string, description: string) => Promise<void>;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isLoading) return;

        try {
            setIsLoading(true);
            await onCreate(name, description);
            onClose();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create a Server</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="text-center mb-6">
                        <p className="text-slate-500 text-sm">
                            Create a new space for your study group or friends.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Server Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Physics Study Group"
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this group about?"
                            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                         <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || isLoading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            Create Server
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
