import React, { memo } from 'react';
import { Message, FileAttachment, LiveFlashcardData, LiveQuizData } from '../../types';
import { Send, Bot, User, Sparkles, Loader2, GraduationCap, Mic, CheckCircle2, X, RefreshCcw } from 'lucide-react';

interface ChatMessageBubbleProps {
  msg: Message;
}

// Memoize the message bubble to prevent unnecessary re-renders
export const ChatMessageBubble = memo<ChatMessageBubbleProps>(({ msg }) => {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [quizSelected, setQuizSelected] = React.useState<number | null>(null);

  const renderInteraction = React.useCallback(() => {
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
  }, [msg.interaction, isFlipped, quizSelected]);

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
          <div className="mt-2 space-y-1">
            {msg.attachments.map((attachment, index) => (
              <div key={index} className="text-xs text-slate-500 dark:text-slate-400">
                📎 {attachment.name}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';