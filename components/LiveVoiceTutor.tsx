
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Mic, MicOff, PhoneOff, Radio, BookOpen, RefreshCw, AlertCircle, Sparkles, X, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { FileAttachment, LiveInteractionState, LiveFlashcardData, LiveQuizData } from '../types';

interface LiveVoiceTutorProps {
  onClose: () => void;
  attachments: FileAttachment[];
  mode?: 'general' | 'pronunciation';
  systemInstructionOverride?: string;
  onFeedback?: (data: any) => void;
  targetPhrase?: string;
  targetLanguage?: string;
}

// Helper to convert Float32Array (Web Audio) to PCM Int16 (Gemini)
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  const uint8 = new Uint8Array(int16.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const b64 = btoa(binary);

  return {
    data: b64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to decode Base64 to ArrayBuffer
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode PCM Int16 to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "display_flashcard",
    description: "Display a visual flashcard to the user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING },
        back: { type: Type.STRING }
      },
      required: ["front", "back"]
    }
  },
  {
    name: "start_interactive_quiz",
    description: "Start a quick multiple-choice quiz.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        correctIndex: { type: Type.INTEGER }
      },
      required: ["question", "options", "correctIndex"]
    }
  },
  {
    name: "provide_pronunciation_score",
    description: "Provide pronunciation score and feedback after the user speaks the target phrase.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score out of 100" },
        confidence: { type: Type.NUMBER, description: "Confidence 0-1" },
        feedback: { type: Type.STRING, description: "Detailed feedback on pronunciation" }
      },
      required: ["score", "confidence", "feedback"]
    }
  }
];

const PRIMARY_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const LiveVoiceTutor: React.FC<LiveVoiceTutorProps> = ({ onClose, attachments, mode = 'general', systemInstructionOverride, onFeedback, targetPhrase, targetLanguage }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [useBackupKey, setUseBackupKey] = useState(false);

  const [activeInteraction, setActiveInteraction] = useState<LiveInteractionState | null>(null);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const startSession = async (retryWithBackup = false) => {
    setStatus('connecting');
    setErrorMessage('');

    try {
      // 1. Check Mic Permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (e) {
        throw new Error("Microphone access denied. Please allow permissions in browser settings.");
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      // 2. Select API Key
      let apiKey = PRIMARY_KEY;
      if (retryWithBackup) {
        const backup = localStorage.getItem('neurofocus_backup_key');
        if (backup) {
          apiKey = backup;
          console.log("Using Backup Google Key");
        } else {
          throw new Error("Primary key failed and no backup Google key found in settings.");
        }
      }

      const ai = new GoogleGenAI({ apiKey });

      let fileContext = "";
      attachments.forEach(att => {
        if (att.mimeType === 'text/plain' || att.mimeType === 'text/markdown') {
          try {
            const content = atob(att.data).substring(0, 15000);
            fileContext += `\n--- FILE: ${att.name} ---\n${content}\n---\n`;
          } catch (e) { }
        } else {
          fileContext += `\n[Attached File: ${att.name} (${att.mimeType})]\n`;
        }
      });

      let defaultSystemInstruction = `You are NeuroFocus, an advanced AI tutor.
        CONTEXT DOCUMENTS: ${fileContext}
        PROTOCOL:
        1. **Strict Grounding**: Use the text above. If I ask about the file, answer from it.
        2. **Socratic Method**: Don't just lecture. Ask me questions to check my understanding.
        3. **Concise**: Keep responses short and conversational.
        4. **Adaptive**: Adjust difficulty based on my answers.`;
      
      if (targetLanguage) {
        defaultSystemInstruction += `\n5. **Language Mode**: Respond exclusively in ${targetLanguage}. Greet the user in ${targetLanguage}, conduct the entire conversation in ${targetLanguage}, and correct any language mistakes I make. If I speak in another language, gently remind me to practice in ${targetLanguage}.`;
      }
      
      const systemInstruction = systemInstructionOverride || defaultSystemInstruction;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            
            // Send language mode reinforcement if targetLanguage is set
            if (targetLanguage) {
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  content: [{ text: `Greet me in ${targetLanguage} and let's begin our conversation entirely in ${targetLanguage}.` }] 
                });
              });
            }
            
            // Send Images
            if (attachments.length > 0) {
              const parts: any[] = [];
              attachments.forEach(att => {
                if (att.mimeType.startsWith('image/')) {
                  parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
                }
              });
              if (parts.length > 0) {
                parts.push({ text: "I have uploaded these images. Analyze them." });
                // @ts-ignore
                sessionPromise.then(session => session.sendRealtimeInput({ content: parts }));
              }
            }

            const source = inputCtx.createMediaStreamSource(streamRef.current!);
            const processor = inputCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i += 10) sum += inputData[i] * inputData[i];
              setVolumeLevel(Math.min(100, Math.sqrt(sum / (inputData.length / 10)) * 500));
              if (!isMuted) {
                const pcmBlob = createBlob(inputData);
                sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) { } sourcesRef.current.delete(source); });
              nextStartTimeRef.current = 0;
              return;
            }

            if (message.toolCall) {
              const calls = message.toolCall.functionCalls;
              if (calls && calls.length > 0) {
                const call = calls[0];
                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: calls.map(c => ({ id: c.id, name: c.name, response: { result: "OK" } }))
                  });
                });
                if (call.name === 'display_flashcard') {
                  setActiveInteraction({ type: 'FLASHCARD', data: call.args as unknown as LiveFlashcardData });
                  setIsCardFlipped(false);
                } else if (call.name === 'start_interactive_quiz') {
                  setActiveInteraction({ type: 'QUIZ', data: call.args as unknown as LiveQuizData });
                  setQuizSelected(null);
                } else if (call.name === 'provide_pronunciation_score') {
                  if (onFeedback) {
                    onFeedback(call.args);
                  }
                }
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputContextRef.current;
              if (!ctx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onclose: () => { console.log("Session closed"); },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setStatus('error');
            setErrorMessage("Connection failed. Try checking your internet or backup key.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: toolDeclarations }]
        },
      });
      sessionRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Start Session Error", error);
      setStatus('error');
      setErrorMessage(error.message);
    }
  };

  useEffect(() => {
    startSession();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (inputContextRef.current) inputContextRef.current.close();
      if (outputContextRef.current) outputContextRef.current.close();
      if (processorRef.current) processorRef.current.disconnect();
    };
  }, []);

  const handleRetry = () => {
    // If primary failed, try backup next time
    startSession(true);
  };

  const sendTextToAI = (text: string) => {
    if (sessionRef.current) {
      sessionRef.current.then(session => {
        session.sendRealtimeInput({ content: [{ text }] });
      });
    }
  };

  const handleQuizOption = (idx: number) => {
    if (quizSelected !== null || !activeInteraction || activeInteraction.type !== 'QUIZ') return;
    setQuizSelected(idx);
    const quizData = activeInteraction.data as LiveQuizData;
    const isCorrect = idx === quizData.correctIndex;
    sendTextToAI(`I selected option ${idx + 1}: ${quizData.options[idx]}. Did I get it right?`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden min-h-[500px]">

        <div className="absolute top-6 right-6 flex items-center gap-2">
          {status === 'connected' && <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase border border-indigo-100 dark:border-indigo-800"><Sparkles size={10} /> Adaptive</div>}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status === 'connected' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : status === 'connecting' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            {status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting...' : 'Error'}
          </div>
        </div>

        {activeInteraction ? (
          <div className="flex-1 w-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-10 duration-500">
            {activeInteraction.type === 'FLASHCARD' && (
              <div className="w-full perspective-1000 cursor-pointer" onClick={() => setIsCardFlipped(!isCardFlipped)}>
                <div className="flex justify-between items-center mb-2 w-full">
                  <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase">Flashcard</span>
                  <button onClick={(e) => { e.stopPropagation(); setActiveInteraction(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
                </div>
                <div className={`w-full aspect-video relative preserve-3d transition-transform duration-500 ${isCardFlipped ? 'rotate-y-180' : ''}`}>
                  <div className="absolute inset-0 backface-hidden bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{(activeInteraction.data as LiveFlashcardData).front}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">Tap to flip</p>
                  </div>
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <p className="text-lg font-medium">{(activeInteraction.data as LiveFlashcardData).back}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 justify-center">
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setActiveInteraction(null); sendTextToAI("I got it. Let's move on."); }}>Got it</Button>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); sendTextToAI("I'm confused, explain this card."); }}>Explain</Button>
                </div>
              </div>
            )}

            {activeInteraction.type === 'QUIZ' && (
              <div className="w-full">
                <div className="flex justify-between items-center mb-4 w-full">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1"><HelpCircle size={12} /> Quick Quiz</span>
                  <button onClick={() => setActiveInteraction(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 leading-snug">{(activeInteraction.data as LiveQuizData).question}</h3>
                <div className="space-y-3">
                  {(activeInteraction.data as LiveQuizData).options.map((opt, idx) => {
                    const isSelected = quizSelected === idx;
                    const isCorrect = idx === (activeInteraction.data as LiveQuizData).correctIndex;
                    let btnClass = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200";

                    if (quizSelected !== null) {
                      if (isCorrect) btnClass = "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300";
                      else if (isSelected) btnClass = "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300";
                      else btnClass = "opacity-50 border-slate-100 dark:border-slate-800";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuizOption(idx)}
                        disabled={quizSelected !== null}
                        className={`w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all ${btnClass} flex justify-between items-center`}
                      >
                        <span>{opt}</span>
                        {quizSelected !== null && isCorrect && <CheckCircle2 size={16} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className={`w-24 h-24 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8 relative ${status === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''}`}>
              {status === 'connected' && !isMuted && (
                <>
                  <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                </>
              )}
              {status === 'error' ? <AlertCircle size={32} /> : <Radio size={40} />}
            </div>

            {status === 'error' ? (
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connection Lost</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 text-sm px-4">{errorMessage}</p>
                <Button onClick={handleRetry} icon={<RefreshCw size={16} />}>Retry with Backup</Button>
              </div>
            ) : (
              <div className="text-center w-full">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Listening...</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 mb-8 text-sm">Tell me your nickname to start.</p>

                <div className="h-10 flex items-center justify-center gap-1 w-full max-w-[200px] mx-auto">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const height = Math.max(4, Math.min(40, volumeLevel * (Math.random() + 0.5)));
                    return <div key={i} className="w-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-75" style={{ height: status === 'connected' ? `${height}px` : '4px', opacity: status === 'connected' ? 0.6 + (volumeLevel / 200) : 0.3 }} />
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto w-full pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-6">
          <Button variant={isMuted ? 'danger' : 'secondary'} size="lg" onClick={() => setIsMuted(!isMuted)} disabled={status !== 'connected'} className="rounded-full w-14 h-14 !p-0 flex items-center justify-center shadow-sm">
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </Button>
          <Button variant="danger" size="lg" onClick={onClose} className="rounded-full px-8 h-14 flex items-center gap-2 shadow-md shadow-red-100 dark:shadow-none">
            <PhoneOff size={20} /> <span>End</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
