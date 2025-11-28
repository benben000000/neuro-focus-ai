import React, { useState } from 'react';
import { X, Hash, Volume2, Loader2 } from 'lucide-react';
import { ChannelType } from '../../services/groups';

interface CreateChannelModalProps {
    onClose: () => void;
    onCreate: (name: string, type: ChannelType) => Promise<void>;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<ChannelType>('text');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || isLoading) return;

        try {
            setIsLoading(true);
            // Sanitize name for channels (lowercase, dashes)
            const sanitizedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            await onCreate(sanitizedName, type);
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
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create Channel</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Channel Type</label>
                        <div className="space-y-2">
                            <label className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                type === 'text' 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="channelType"
                                    value="text"
                                    checked={type === 'text'}
                                    onChange={() => setType('text')}
                                    className="hidden"
                                />
                                <Hash size={24} className={`mr-4 ${type === 'text' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Text</p>
                                    <p className="text-xs text-slate-500">Send messages, images, and opinions.</p>
                                </div>
                            </label>

                            <label className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                type === 'voice' 
                                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="channelType"
                                    value="voice"
                                    checked={type === 'voice'}
                                    onChange={() => setType('voice')}
                                    className="hidden"
                                />
                                <Volume2 size={24} className={`mr-4 ${type === 'voice' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Voice</p>
                                    <p className="text-xs text-slate-500">Hang out together with voice, video, and screen share.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Channel Name</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                {type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="new-channel"
                                className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
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
                            Create Channel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
