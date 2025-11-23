import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Languages, Check, RefreshCw, Volume2, MessageSquarePlus, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { Message, DailyPhrase } from '../types';
import { generateDailyPhrases, sendLanguageMessage } from '../services/languageCoach';
import { Button } from './ui/Button';

const LANGUAGES = [
  { code: 'ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'FR', name: 'French', flag: '🇫🇷' },
  { code: 'DE', name: 'German', flag: '🇩🇪' },
  { code: 'IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'PT', name: 'Portuguese', flag: '🇧🇷' },
];

// Stub for persistence
const saveLanguageProgress = (language: string, phrases: DailyPhrase[]) => {
  console.log(`[STUB] Saving progress for ${language}:`, phrases);
};

export const LanguageLab: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [phrases, setPhrases] = useState<DailyPhrase[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loadingPhrases, setLoadingPhrases] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat
  useEffect(() => {
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: `Hola! I am your ${selectedLang.name} coach. Ready to practice? Select a phrase or just start chatting!`,
        timestamp: Date.now()
      }
    ]);
    loadPhrases(selectedLang.name);
  }, [selectedLang]);

  const loadPhrases = async (langName: string, force: boolean = false) => {
    setLoadingPhrases(true);
    const newPhrases = await generateDailyPhrases(langName, force);
    setPhrases(newPhrases);
    setLoadingPhrases(false);
    saveLanguageProgress(langName, newPhrases);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sendingMsg) return;
    
    const userText = input;
    setInput('');
    setSendingMsg(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);

    const responseText = await sendLanguageMessage(selectedLang.name, userText, phrases);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setSendingMsg(false);
  };

  const handlePhraseAction = (phrase: DailyPhrase, action: 'send' | 'practice' | 'example') => {
    if (action === 'send') {
      setInput(phrase.targetPhrase);
    } else if (action === 'practice') {
      const updatedPhrases = phrases.map(p => p.id === phrase.id ? { ...p, practiced: true } : p);
      setPhrases(updatedPhrases);
      saveLanguageProgress(selectedLang.name, updatedPhrases);
    } else if (action === 'example') {
      const userText = `Can you give me examples of how to use "${phrase.targetPhrase}"?`;
      // Directly send this as a message
      setInput('');
      setSendingMsg(true);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        text: userText,
        timestamp: Date.now()
      }]);

      sendLanguageMessage(selectedLang.name, userText, phrases).then(responseText => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: responseText,
          timestamp: Date.now()
        }]);
        setSendingMsg(false);
      });
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6">
      
      {/* LEFT: CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center">
               <Languages size={20} />
             </div>
             <div>
               <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 Language Lab <span className="text-xs font-normal px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-800">Beta</span>
               </h2>
               <p className="text-xs text-slate-500">Immersive AI Conversation</p>
             </div>
          </div>
          
          {/* Language Selector */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="text-lg">{selectedLang.flag}</span>
              <span>{selectedLang.name}</span>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
               {LANGUAGES.map(lang => (
                 <button
                   key={lang.code}
                   onClick={() => setSelectedLang(lang)}
                   className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 first:rounded-t-xl last:rounded-b-xl
                     ${selectedLang.code === lang.code ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-700 dark:text-slate-300'}
                   `}
                 >
                   <span className="text-lg">{lang.flag}</span>
                   {lang.name}
                 </button>
               ))}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap
                ${msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {sendingMsg && (
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0"><Bot size={14} /></div>
               <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm">
                 <Loader2 size={16} className="animate-spin text-slate-400" />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Type in ${selectedLang.name}...`}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
            />
            <button 
              onClick={handleSendMessage}
              disabled={!input.trim() || sendingMsg}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: DAILY PHRASES */}
      <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-[500px] lg:h-auto">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Daily Pack
          </h3>
          <Button variant="ghost" size="sm" onClick={() => loadPhrases(selectedLang.name, true)} disabled={loadingPhrases}>
            <RefreshCw size={14} className={loadingPhrases ? 'animate-spin' : ''} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
           {loadingPhrases ? (
             <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
               <Loader2 size={24} className="animate-spin" />
               <span className="text-xs">Generating phrases...</span>
             </div>
           ) : phrases.length === 0 ? (
             <div className="text-center py-10 text-slate-400 text-sm">
               No phrases yet.
             </div>
           ) : (
             phrases.map(phrase => (
               <div key={phrase.id} className={`p-3 rounded-xl border transition-all group
                 ${phrase.practiced 
                   ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' 
                   : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                 }
               `}>
                 <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide
                      ${phrase.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        phrase.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}
                    `}>
                      {phrase.difficulty}
                    </span>
                    {phrase.practiced && <Check size={14} className="text-green-600" />}
                 </div>
                 
                 <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{phrase.targetPhrase}</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-2">{phrase.translation}</p>
                 
                 <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <button 
                      onClick={() => handlePhraseAction(phrase, 'send')}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <MessageSquarePlus size={12} /> Use
                    </button>
                    <button 
                      onClick={() => handlePhraseAction(phrase, 'example')}
                      className="w-8 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="Request Example"
                    >
                      <span className="text-xs font-bold">?</span>
                    </button>
                    <button 
                      onClick={() => handlePhraseAction(phrase, 'practice')}
                      disabled={phrase.practiced}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors
                        ${phrase.practiced 
                          ? 'bg-transparent text-green-600 cursor-default' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }
                      `}
                    >
                      {phrase.practiced ? 'Done' : 'Mark'}
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

    </div>
  );
};
