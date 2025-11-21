import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, GraduationCap, Mic, CheckCircle2, X, RefreshCcw } from 'lucide-react';
import { Message, FileAttachment, LiveFlashcardData, LiveQuizData } from '../types';
import { sendMessageToGemini, getChatSession } from '../services/gemini';
import { FileUploader } from './FileUploader';
import { Button } from './ui/Button';
import { LiveVoiceTutor } from './LiveVoiceTutor';

interface ChatTutorProps {
  attachments: FileAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
}

// --- CHAT MESSAGE COMPONENT ---
const ChatMessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);

  const renderInteraction = () => {
    if (!msg.interaction) return null;

    if (msg.interaction.type === 'FLASHCARD') {
      const data = msg.interaction.data as LiveFlashcardData;
      return (
        <div className="mt-4 w-full max-w-sm mx-auto perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`w-full aspect-[3/2] relative preserve-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-indigo-50 dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider mb-2">Flashcard</span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{data.front}</h3>
                    <p className="text-xs text-slate-400 mt-4">Click to reveal</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-indigo-200 tracking-wider mb-2">Answer</span>
                    <p className="text-base font-medium leading-relaxed">{data.back}</p>
                </div>
            </div>
        </div>
      );
    }

    if (msg.interaction.type === 'QUIZ') {
      const data = msg.interaction.data as LiveQuizData;
      return (
        <div className="mt-4 w-full max-w-sm mx-auto bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">Quick Check</span>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-sm leading-snug">{data.question}</h4>
            <div className="space-y-2">
                {data.options.map((opt, i) => {
                    const isSelected = quizSelected === i;
                    const isCorrect = i === data.correctIndex;
                    let btnClass = "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600";
                    
                    if (quizSelected !== null) {
                         if (isCorrect) btnClass = "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300";
                         else if (isSelected) btnClass = "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300";
                         else btnClass = "opacity-50 border-slate-200 dark:border-slate-700";
                    }

                    return (
                        <button 
                            key={i}
                            onClick={() => setQuizSelected(i)}
                            disabled={quizSelected !== null}
                            className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all flex justify-between items-center ${btnClass}`}
                        >
                            <span>{opt}</span>
                            {quizSelected !== null && isCorrect && <CheckCircle2 size={14}/>}
                            {quizSelected !== null && isSelected && !isCorrect && <X size={14}/>}
                        </button>
                    )
                })}
            </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 
        ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
      </div>
      
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap
          ${msg.role === 'user' 
            ? 'bg-indigo-600 text-white rounded-tr-none' 
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'
          }`}>
          {msg.text}
          {renderInteraction()}
        </div>
        
        {msg.attachments && msg.attachments.length > 0 && (
           <div className="mt-2 flex gap-2 flex-wrap justify-end">
              {msg.attachments.map((att, i) => (
                <span key={i} className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md flex items-center gap-1">
                  <span className="text-[10px]">📎</span> {att.name}
                </span>
              ))}
           </div>
        )}
        
        <span className="text-[10px] text-slate-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  );
};

export const ChatTutor: React.FC<ChatTutorProps> = ({ attachments, setAttachments }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello! I am NeuroFocus, your adaptive AI tutor. Please upload your study materials so I can analyze them. Once uploaded, tell me: what is your goal today? (e.g., "Cramming for a test" or "Understanding the basics")',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReset = async () => {
      if (window.confirm("Start a fresh session? This will clear the chat history.")) {
          setMessages([{
            id: Date.now().toString(),
            role: 'model',
            text: 'Session reset. I am ready to start fresh. Upload new files or ask me anything.',
            timestamp: Date.now()
          }]);
          await getChatSession(true);
          setAttachments([]);
      }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]); 
    
    setIsLoading(true);

    try {
      const { text, interaction } = await sendMessageToGemini(userMsg.text, userMsg.attachments);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text,
        interaction: interaction,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mt-4 relative">
      
      {isVoiceMode && <LiveVoiceTutor onClose={() => setIsVoiceMode(false)} attachments={attachments} />}

      {/* Chat Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">NeuroFocus AI Tutor</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Online • Adaptive Learning
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            size="sm" 
            className="bg-gradient-to-r from-rose-500 to-orange-500 border-0 hover:from-rose-600 hover:to-orange-600 text-white shadow-md"
            icon={<Mic size={16} />} 
            onClick={() => setIsVoiceMode(true)}
          >
            Live Voice
          </Button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
          <Button variant="ghost" size="sm" icon={<RefreshCcw size={16} />} onClick={handleReset} title="Reset Session" className="dark:text-slate-400 dark:hover:text-slate-200">
             Reset
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 dark:bg-slate-950/50">
        {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} msg={msg} />
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Bot size={14} />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-5 py-4 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        {attachments.length > 0 && (
             <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs border border-indigo-100 dark:border-indigo-800">
                        <span className="font-medium truncate max-w-[150px]">{att.name}</span>
                        <button 
                          onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-indigo-900 dark:hover:text-indigo-100"
                        >
                            ×
                        </button>
                    </div>
                ))}
             </div>
        )}
        
        <div className="flex gap-4 items-end">
           <div className="flex-1">
              <div className="relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question, request a quiz, or paste notes..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 min-h-[52px] text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2">
                     {isLoading ? (
                        <div className="p-2 text-slate-400">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                     ) : (
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() && attachments.length === 0}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                     )}
                  </div>
              </div>
           </div>
        </div>
        
        <div className="mt-4">
           <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Add Study Context (PDFs, Images)</p>
           <FileUploader onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])} />
        </div>
      </div>
    </div>
  );
};