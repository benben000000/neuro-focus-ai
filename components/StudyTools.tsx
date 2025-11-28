
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    BookOpen, CheckCircle2, Brain, ArrowLeft, ChevronLeft, ChevronRight,
    RefreshCw, Loader2, AlertCircle, Layers, FileText, PenTool,
    MessageCircleQuestion, Share2, Sparkles, Network, Trophy, Dna, X,
    Presentation, File, ZoomIn, ZoomOut, Move, Info, Calculator, Eye,
    Target, Mic, User, PlusCircle, Video as VideoIcon, PlayCircle, GraduationCap, Languages
} from 'lucide-react';
import { FileAttachment, Flashcard, QuizQuestion, ClozeExercise, MindMapNode, DeepDiveType, ToolMode, EquationProblem, LessonPlan, ActiveRecallQuestion, ActiveRecallResponse, VoiceSessionConfig } from '../types';
import {
    generateFlashcards, generateQuiz, evaluateBlurting, generateMindMap,
    generateCloze, evaluateFeynman, generateDeepDivePrompt,
    generateEquationProblems, generateMemorizationText, generateIdentificationItems,
    evaluatePeerTeachingAudio, generateLessonPlan,
    generateActiveRecallQuestions, evaluateActiveRecallResponse
} from '../services/gemini';
import { Button } from './ui/Button';
import { FileUploader } from './FileUploader';
import { LiveVoiceTutor } from './LiveVoiceTutor';
import { MajorExamMode } from './MajorExamMode';
import { LanguageLab } from './LanguageLab';
import { playClick, playSuccess, playError } from '../services/sound';
import { useActivity } from '../contexts/ActivityContext';

interface StudyToolsProps {
    attachments: FileAttachment[];
    setAttachments: React.Dispatch<React.SetStateAction<FileAttachment[]>>;
    onStartVoice: (config?: VoiceSessionConfig) => void;
}

// --- UTILS ---

const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Mic error", e);
            alert("Microphone access denied. Please check permissions.");
        }
    };

    const stopRecording = (): Promise<string> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) return resolve("");

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorderRef.current.stop();
            setIsRecording(false);
        });
    };

    return { isRecording, startRecording, stopRecording };
};

interface LayoutNode {
    id: string;
    label: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    children?: LayoutNode[];
    collapsed?: boolean;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;
const GAP_X = 150;
const GAP_Y = 40;
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const layoutMindMap = (data: MindMapNode): LayoutNode => {
    let leafIndex = 0;
    const processNode = (node: MindMapNode, depth: number, branchIndex: number): LayoutNode => {
        const extendedNode: any = { ...node };
        const color = depth === 0 ? '#334155' : COLORS[branchIndex % COLORS.length];
        if (node.children && node.children.length > 0) {
            extendedNode.children = node.children.map((child, idx) =>
                processNode(child, depth + 1, depth === 0 ? idx : branchIndex)
            );
            const firstChildY = extendedNode.children[0].y;
            const lastChildY = extendedNode.children[extendedNode.children.length - 1].y;
            extendedNode.y = (firstChildY + lastChildY) / 2;
        } else {
            extendedNode.y = leafIndex * (NODE_HEIGHT + GAP_Y);
            leafIndex++;
        }
        extendedNode.x = depth * (NODE_WIDTH + GAP_X);
        extendedNode.width = NODE_WIDTH;
        extendedNode.height = NODE_HEIGHT;
        extendedNode.color = color;
        return extendedNode;
    };
    return processNode(data, 0, 0);
};

const flattenTree = (root: LayoutNode): { nodes: LayoutNode[], edges: { source: LayoutNode, target: LayoutNode }[] } => {
    const nodes: LayoutNode[] = [];
    const edges: { source: LayoutNode, target: LayoutNode }[] = [];
    const traverse = (node: LayoutNode) => {
        nodes.push(node);
        if (node.children) {
            node.children.forEach(child => {
                edges.push({ source: node, target: child });
                traverse(child);
            });
        }
    };
    traverse(root);
    return { nodes, edges };
};

interface ToolCardProps {
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, desc, icon, color, onClick }) => {
    const colorStyles: Record<string, string> = {
        orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
        emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
        amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        pink: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
        cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
        teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
        lime: "bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400",
    };

    return (
        <button
            onClick={onClick}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-left flex flex-col items-start group w-full"
        >
            <div className={`p-3 rounded-xl mb-4 transition-transform group-hover:scale-110 ${colorStyles[color] || "bg-slate-100 text-slate-600"}`}>
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 24 }) : icon}
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">{desc}</p>
        </button>
    );
};

export const StudyTools: React.FC<StudyToolsProps> = ({ attachments, setAttachments, onStartVoice }) => {
    const { setSubject, isTracking } = useActivity();
    const [mode, setMode] = useState<ToolMode>('MENU');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const map: Record<string, string> = {
            MENU: 'Study Tools',
            FLASHCARDS: 'Flashcards',
            QUIZ: 'AI Quiz',
            BLURTING: 'Blurting',
            FEYNMAN: 'Feynman Technique',
            MINDMAP: 'Mind Mapping',
            CLOZE: 'Cloze Deletion',
            DEEP_DIVE: 'Deep Dive',
            EQUATION: 'Problem Solving',
            MEMORIZATION: 'Memorization',
            IDENTIFICATION: 'Identification',
            PEER_TEACHING: 'Peer Teaching',
            VIDEO_EXPLAINER: 'Video Explainer',
            MAJOR_EXAM: 'Major Exam',
            LANGUAGE_LAB: 'Language Lab',
            ACTIVE_RECALL: 'Active Recall'
        };
        setSubject(map[mode] || 'Study Tools');
    }, [mode, setSubject]);

    // Tool States
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [quizIndex, setQuizIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);

    const [topic, setTopic] = useState('');
    const [textInput, setTextInput] = useState('');
    const [feedback, setFeedback] = useState('');

    const [clozeExercise, setClozeExercise] = useState<ClozeExercise | null>(null);
    const [clozeInputs, setClozeInputs] = useState<Record<string, string>>({});
    const [clozeChecked, setClozeChecked] = useState(false);

    const [mindMapRaw, setMindMapRaw] = useState<MindMapNode | null>(null);
    const [mapTransform, setMapTransform] = useState({ x: 100, y: 300, k: 0.8 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
    const [generationError, setGenerationError] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    const [deepDiveType, setDeepDiveType] = useState<DeepDiveType>('SOCRATIC');
    const [deepDivePrompt, setDeepDivePrompt] = useState('');

    // --- NEW MODES STATES ---
    const [equations, setEquations] = useState<EquationProblem[]>([]);
    const [equationIndex, setEquationIndex] = useState(0);
    const [revealedSteps, setRevealedSteps] = useState(0);

    const [memoText, setMemoText] = useState('');
    const [memoHiddenIndices, setMemoHiddenIndices] = useState<Set<number>>(new Set());

    const [identItems, setIdentItems] = useState<Flashcard[]>([]);
    const [identIndex, setIdentIndex] = useState(0);
    const [identInput, setIdentInput] = useState('');
    const [identFeedback, setIdentFeedback] = useState<'correct' | 'incorrect' | null>(null);

    const { isRecording, startRecording, stopRecording } = useAudioRecorder();
    const [peerFeedback, setPeerFeedback] = useState('');

    // Video Explainer
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

    // Active Recall State
    const [recallQuestions, setRecallQuestions] = useState<ActiveRecallQuestion[]>([]);
    const [recallIndex, setRecallIndex] = useState(0);
    const [recallAnswer, setRecallAnswer] = useState('');
    const [recallResponse, setRecallResponse] = useState<ActiveRecallResponse | null>(null);
    const [recallHistory, setRecallHistory] = useState<ActiveRecallResponse[]>([]);

    const resetTool = () => {
        setMode('MENU');
        setCards([]);
        setQuizQuestions([]);
        setFeedback('');
        setTextInput('');
        setTopic('');
        setClozeExercise(null);
        setMindMapRaw(null);
        setSelectedNode(null);
        setDeepDivePrompt('');
        setGenerationError(false);

        setEquations([]);
        setMemoText('');
        setIdentItems([]);
        setPeerFeedback('');
        setPeerFeedback('');
        setLessonPlan(null);

        setRecallQuestions([]);
        setRecallAnswer('');
        setRecallResponse(null);
        setRecallHistory([]);

        setIsLoading(false);
        setLoadingMore(false);
    };

    const checkFiles = () => {
        if (attachments.length === 0) {
            alert("Please upload a document first!");
            return false;
        }
        return true;
    };

    const removeFile = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // --- Launchers ---

    const launchFlashcards = async () => { if (!checkFiles()) return; setIsLoading(true); setCards(await generateFlashcards(attachments, 25)); setCurrentCardIndex(0); setIsFlipped(false); setIsLoading(false); setMode('FLASHCARDS'); };
    const launchQuiz = async () => { if (!checkFiles()) return; setIsLoading(true); setQuizQuestions(await generateQuiz(attachments, 10)); setQuizIndex(0); setSelectedOption(null); setScore(0); setShowResult(false); setIsLoading(false); setMode('QUIZ'); };
    const launchBlurting = () => { if (!checkFiles()) return; setMode('BLURTING'); };
    const launchFeynman = () => { if (!checkFiles()) return; setMode('FEYNMAN'); };
    const launchCloze = async () => { if (!checkFiles()) return; setIsLoading(true); setClozeExercise(await generateCloze(attachments)); setClozeInputs({}); setClozeChecked(false); setIsLoading(false); setMode('CLOZE'); };
    const launchMindMap = async () => { if (!checkFiles()) return; setIsLoading(true); setGenerationError(false); const map = await generateMindMap(attachments); if (map) { setMindMapRaw(map); setMapTransform({ x: 50, y: 50, k: 0.8 }); } else { setGenerationError(true); } setIsLoading(false); setMode('MINDMAP'); };
    const launchDeepDive = async (type: DeepDiveType) => { if (!checkFiles()) return; setDeepDiveType(type); setIsLoading(true); setDeepDivePrompt(await generateDeepDivePrompt(attachments, type)); setIsLoading(false); setMode('DEEP_DIVE'); };
    const launchEquation = async () => { if (!checkFiles()) return; setIsLoading(true); setEquations(await generateEquationProblems(attachments)); setEquationIndex(0); setRevealedSteps(0); setIsLoading(false); setMode('EQUATION'); };
    const launchMemorization = async () => { if (!checkFiles()) return; setIsLoading(true); setMemoText(await generateMemorizationText(attachments)); setMemoHiddenIndices(new Set()); setIsLoading(false); setMode('MEMORIZATION'); };
    const launchIdentification = async () => { if (!checkFiles()) return; setIsLoading(true); setIdentItems(await generateIdentificationItems(attachments)); setIdentIndex(0); setIdentInput(''); setIdentFeedback(null); setIsLoading(false); setMode('IDENTIFICATION'); };
    const launchPeerTeaching = () => { if (!checkFiles()) return; setPeerFeedback(''); setMode('PEER_TEACHING'); };

    const launchVideoExplainer = async () => {
        const vid = attachments.find(a => a.mimeType.startsWith('video/'));
        if (!vid) { alert("Please upload a video file first."); return; }
        setIsLoading(true);
        setLessonPlan(await generateLessonPlan(attachments));
        setIsLoading(false);
        setMode('VIDEO_EXPLAINER');
    };

    const launchMajorExam = () => { if (!checkFiles()) return; setMode('MAJOR_EXAM'); };
    const launchLanguageLab = () => { setMode('LANGUAGE_LAB'); };

    const launchActiveRecall = async () => {
        if (!checkFiles()) return;
        setIsLoading(true);
        const questions = await generateActiveRecallQuestions(attachments, 10);
        setRecallQuestions(questions);
        setRecallIndex(0);
        setRecallAnswer('');
        setRecallResponse(null);
        setRecallHistory([]);
        setIsLoading(false);
        setMode('ACTIVE_RECALL');
    };

    // --- Load More Handlers ---

    const loadMoreFlashcards = async () => {
        setLoadingMore(true);
        const newCards = await generateFlashcards(attachments, 10);
        setCards(prev => [...prev, ...newCards]);
        setLoadingMore(false);
    };

    const loadMoreQuiz = async () => {
        setLoadingMore(true);
        const newQuestions = await generateQuiz(attachments, 5);
        setQuizQuestions(prev => [...prev, ...newQuestions]);
        if (showResult) {
            setShowResult(false);
            setQuizIndex(quizQuestions.length);
            setSelectedOption(null);
        }
        setLoadingMore(false);
    };

    const loadMoreEquations = async () => {
        setLoadingMore(true);
        const newProbs = await generateEquationProblems(attachments, 3);
        setEquations(prev => [...prev, ...newProbs]);
        setLoadingMore(false);
    };

    const loadMoreRecallQuestions = async () => {
        setLoadingMore(true);
        const newQuestions = await generateActiveRecallQuestions(attachments, 5);
        setRecallQuestions(prev => [...prev, ...newQuestions]);
        setLoadingMore(false);
    };

    // --- Renderers ---

    const submitBlurting = async () => { if (!topic || !textInput) return; setIsLoading(true); setFeedback(await evaluateBlurting(attachments, topic, textInput)); setIsLoading(false); };
    const submitFeynman = async () => { if (!topic || !textInput) return; setIsLoading(true); setFeedback(await evaluateFeynman(attachments, topic, textInput)); setIsLoading(false); };
    const submitDeepDive = async () => { if (!textInput) return; setIsLoading(true); setFeedback(await evaluateBlurting(attachments, deepDiveType + " Response", textInput)); setIsLoading(false); };
    const finishPeerRecording = async () => { const b64 = await stopRecording(); setIsLoading(true); setPeerFeedback(await evaluatePeerTeachingAudio(attachments, b64)); setIsLoading(false); };

    const submitRecallAnswer = async () => {
        if (!recallAnswer.trim()) return;
        setIsLoading(true);
        const response = await evaluateActiveRecallResponse(
            attachments,
            recallQuestions[recallIndex],
            recallAnswer
        );
        setRecallResponse(response);
        setRecallHistory(prev => [...prev, response]);

        if (response.score >= 70) {
            playSuccess();
        } else {
            playError();
        }
        setIsLoading(false);
    };

    const checkIdentification = () => {
        const correct = identItems[identIndex].back.toLowerCase().trim();
        const user = identInput.toLowerCase().trim();
        if (user === correct || correct.includes(user)) {
            setIdentFeedback('correct');
            playSuccess();
        } else {
            setIdentFeedback('incorrect');
            playError();
        }
    };

    const handleQuizOption = (idx: number) => {
        if (selectedOption === null) {
            setSelectedOption(idx);
            if (idx === quizQuestions[quizIndex].correctIndex) {
                setScore(s => s + 1);
                playSuccess();
            } else {
                playError();
            }
        }
    };

    const renderMindMap = () => {
        const layout = useMemo(() => mindMapRaw ? layoutMindMap(mindMapRaw) : null, [mindMapRaw]);
        if (!layout) return <div className="p-10 text-center dark:text-slate-300">Error loading map</div>;
        const { nodes, edges } = flattenTree(layout);
        const handleWheel = (e: React.WheelEvent) => { const f = 1.1; const d = e.deltaY > 0 ? 1 / f : f; setMapTransform(p => ({ ...p, k: Math.max(0.2, Math.min(3, p.k * d)) })); };
        const handleMove = (e: React.MouseEvent) => { if (isDraggingMap) { setMapTransform(p => ({ ...p, x: p.x + e.movementX, y: p.y + e.movementY })); } };
        return (
            <div className="w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative select-none" onWheel={handleWheel} onMouseDown={() => setIsDraggingMap(true)} onMouseMove={handleMove} onMouseUp={() => setIsDraggingMap(false)} onMouseLeave={() => setIsDraggingMap(false)}>
                <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 p-2 rounded shadow z-10 flex gap-2"><button onClick={() => setMapTransform(p => ({ ...p, k: p.k * 1.2 }))} className="dark:text-white"><ZoomIn size={16} /></button><button onClick={() => setMapTransform(p => ({ ...p, k: p.k / 1.2 }))} className="dark:text-white"><ZoomOut size={16} /></button><button onClick={() => setMapTransform({ x: 50, y: 50, k: 0.8 })} className="dark:text-white"><Move size={16} /></button></div>
                <svg width="100%" height="100%">
                    <g transform={`translate(${mapTransform.x}, ${mapTransform.y}) scale(${mapTransform.k})`}>
                        {edges.map((e, i) => { const sx = e.source.x + e.source.width, sy = e.source.y + e.source.height / 2, ex = e.target.x, ey = e.target.y + e.target.height / 2; const cp = sx + (ex - sx) / 2; return <path key={i} d={`M ${sx} ${sy} C ${cp} ${sy}, ${cp} ${ey}, ${ex} ${ey}`} stroke={e.target.color} fill="none" strokeWidth="2" opacity="0.5" /> })}
                        {nodes.map(n => (
                            <foreignObject key={n.id} x={n.x} y={n.y} width={n.width} height={n.height} onClick={(e) => { e.stopPropagation(); setSelectedNode(n); playClick(); }}>
                                <div className={`w-full h-full bg-white dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl p-2 flex items-center justify-center text-center shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:shadow-md ${selectedNode?.id === n.id ? 'ring-2 ring-indigo-400' : ''}`} style={{ borderColor: n.color }}>{n.label}</div>
                            </foreignObject>
                        ))}
                    </g>
                </svg>
                {selectedNode && <div className="absolute top-0 right-0 w-72 h-full bg-white dark:bg-slate-900 shadow-xl p-6 border-l dark:border-slate-800 z-20 animate-in slide-in-from-right"><div className="flex justify-between mb-4"><h4 className="font-bold text-slate-800 dark:text-white">Details</h4><button onClick={() => setSelectedNode(null)} className="dark:text-white"><X size={16} /></button></div><h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">{selectedNode.label}</h3><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedNode.description}</p></div>}
            </div>
        );
    };

    if (mode === 'MENU') return (
        <div className="max-w-6xl mx-auto p-6 space-y-10 animate-fade-in">
            <div className="text-center space-y-2"><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Study Lab</h1><p className="text-slate-600 dark:text-slate-400">Select a science-backed method to master your material.</p></div>
            {isTracking && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg text-center text-green-700 dark:text-green-400 text-sm font-medium mb-4">Session Active: Recording progress...</div>}
            <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 rounded-xl p-6 flex flex-wrap gap-3 items-center"> <div className="flex items-center gap-2 mr-4"><Layers size={18} className="text-indigo-600 dark:text-indigo-400" /><span className="font-semibold text-indigo-900 dark:text-indigo-100">Context:</span></div> {attachments.map((f, i) => (<div key={i} className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2"><span className="truncate max-w-[120px]">{f.name}</span><button onClick={() => removeFile(i)} className="hover:text-red-500"><X size={14} /></button></div>))} <div className="w-32"><FileUploader onFilesSelected={fs => setAttachments(p => [...p, ...fs])} compact /></div> </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ToolCard title="Flashcards" desc="Spaced repetition basics." icon={<Layers />} color="orange" onClick={launchFlashcards} />
                <ToolCard title="AI Quiz" desc="Test your knowledge." icon={<CheckCircle2 />} color="emerald" onClick={launchQuiz} />
                <ToolCard title="Active Recall" desc="AI-powered retrieval practice." icon={<Brain />} color="indigo" onClick={launchActiveRecall} />
                <ToolCard title="Blurting" desc="Active recall writing." icon={<PenTool />} color="purple" onClick={launchBlurting} />
                <ToolCard title="Feynman" desc="Teach to learn." icon={<MessageCircleQuestion />} color="amber" onClick={launchFeynman} />
                <ToolCard title="Mind Map" desc="Visualize connections." icon={<Network />} color="pink" onClick={launchMindMap} />
                <ToolCard title="Cloze" desc="Fill in the blanks." icon={<Dna />} color="cyan" onClick={launchCloze} />
                <ToolCard title="Socratic" desc="Critical thinking." icon={<Brain />} color="teal" onClick={() => launchDeepDive('SOCRATIC')} />
                <ToolCard title="Equation" desc="Step-by-step solving." icon={<Calculator />} color="blue" onClick={launchEquation} />
                <ToolCard title="Memorization" desc="Text occlusion." icon={<Eye />} color="indigo" onClick={launchMemorization} />
                <ToolCard title="Identify" desc="Guess the concept." icon={<Target />} color="rose" onClick={launchIdentification} />
                <ToolCard title="Peer Teach" desc="Audio roleplay." icon={<Mic />} color="sky" onClick={launchPeerTeaching} />
                <ToolCard title="Video Explainer" desc="Interactive lecture." icon={<VideoIcon />} color="lime" onClick={launchVideoExplainer} />
                <ToolCard title="Major Exam" desc="Full 20-question test." icon={<GraduationCap />} color="indigo" onClick={launchMajorExam} />
                <ToolCard title="Language Lab" desc="Practice speaking & writing." icon={<Languages />} color="rose" onClick={launchLanguageLab} />
            </div>
            {isLoading && <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 z-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} /></div>}
        </div>
    );

    if (mode === 'VIDEO_EXPLAINER') {
        if (!lessonPlan) return <div className="p-10 text-center dark:text-white">Generating lesson plan...</div>;
        return (
            <div className="max-w-4xl mx-auto p-6 h-full">
                <Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{lessonPlan.topic}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">{lessonPlan.overview}</p>
                    <div className="mb-8">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-sm mb-3">Key Points</h3>
                        <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">{lessonPlan.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl mb-8">
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">Opening Script</h3>
                        <p className="italic text-indigo-800 dark:text-indigo-200 text-sm">"{lessonPlan.lectureScript}"</p>
                    </div>
                    <div className="flex justify-center">
                        <Button size="lg" onClick={onStartVoice} icon={<PlayCircle size={20} />} className="shadow-xl shadow-indigo-200 dark:shadow-none">Start Live Interactive Lecture</Button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'MINDMAP') return <div className="h-[calc(100vh-100px)] flex flex-col"><div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />}>Back</Button><h3 className="font-bold text-slate-700 dark:text-white">Knowledge Graph</h3><div className="w-24"></div></div><div className="flex-1 relative">{mindMapRaw ? renderMindMap() : (generationError ? <div className="p-10 text-center dark:text-white"><p>Failed.</p><Button onClick={launchMindMap}>Retry</Button></div> : <div className="p-10 text-center dark:text-white"><Loader2 className="animate-spin inline" /> Generating...</div>)}</div></div>;
    if (mode === 'CLOZE') return <div className="max-w-3xl mx-auto p-6"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"><h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><Dna className="text-indigo-600 dark:text-indigo-400" /> Cloze</h2><div className="leading-loose text-lg text-slate-800 dark:text-slate-200">{clozeExercise?.parts.map((p, i) => p.isBlank ? <input key={i} className={`mx-1 border-b-2 w-32 text-center outline-none bg-transparent ${clozeChecked ? (clozeInputs[i]?.toLowerCase().trim() === p.answer?.toLowerCase().trim() ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400') : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'}`} value={clozeInputs[i] || ''} onChange={e => setClozeInputs(prev => ({ ...prev, [i]: e.target.value }))} disabled={clozeChecked} /> : <span key={i}>{p.text}</span>)}</div><div className="mt-8 flex gap-4">{!clozeChecked ? <Button onClick={() => setClozeChecked(true)}>Check</Button> : <div className="flex items-center gap-4"><Button onClick={launchCloze} icon={<RefreshCw size={16} />}>New</Button><span className="text-sm dark:text-slate-300">Answers: {clozeExercise?.parts.filter(p => p.isBlank).map(p => p.answer).join(', ')}</span></div>}</div></div></div>;

    if (mode === 'FLASHCARDS' && cards.length > 0) {
        const card = cards[currentCardIndex];
        return (
            <div className="max-w-3xl mx-auto p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />}>Back</Button>
                    <Button variant="secondary" size="sm" onClick={loadMoreFlashcards} icon={loadingMore ? <Loader2 className="animate-spin" /> : <PlusCircle size={16} />} disabled={loadingMore}>{loadingMore ? 'Adding...' : '+10 More Cards'}</Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-full max-w-xl aspect-[3/2] relative perspective-1000 cursor-pointer" onClick={() => { setIsFlipped(!isFlipped); playClick(); }}>
                        <div className={`w-full h-full relative preserve-3d transition-transform duration-500 shadow-xl rounded-3xl ${isFlipped ? 'rotate-y-180' : ''}`}>
                            <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center"><h3 className="text-2xl text-slate-800 dark:text-white">{card.front}</h3></div>
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center"><p className="text-xl">{card.back}</p></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-8 mt-12">
                        <button onClick={() => { setIsFlipped(false); playClick(); setTimeout(() => setCurrentCardIndex((c) => (c - 1 + cards.length) % cards.length), 150) }} className="p-4 rounded-full bg-white dark:bg-slate-800 shadow border dark:border-slate-700 dark:text-white"><ChevronLeft /></button>
                        <span className="dark:text-white">{currentCardIndex + 1}/{cards.length}</span>
                        <button onClick={() => { setIsFlipped(false); playClick(); setTimeout(() => setCurrentCardIndex((c) => (c + 1) % cards.length), 150) }} className="p-4 rounded-full bg-white dark:bg-slate-800 shadow border dark:border-slate-700 dark:text-white"><ChevronRight /></button>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === 'QUIZ' && quizQuestions.length > 0) {
        if (showResult) return (
            <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-3xl shadow border dark:border-slate-700 max-w-2xl mx-auto">
                <Trophy className="mx-auto text-yellow-500 mb-4" size={48} />
                <h2 className="text-3xl font-bold dark:text-white">Score: {Math.round((score / quizQuestions.length) * 100)}%</h2>
                <div className="mt-8 flex justify-center gap-4">
                    <Button onClick={resetTool}>Menu</Button>
                    <Button onClick={loadMoreQuiz} icon={loadingMore ? <Loader2 className="animate-spin" /> : <PlusCircle size={16} />} disabled={loadingMore}>{loadingMore ? 'Generating...' : '+5 New Questions'}</Button>
                </div>
            </div>
        );

        const q = quizQuestions[quizIndex];
        const isAnswered = selectedOption !== null;
        return (
            <div className="max-w-3xl mx-auto p-6">
                <Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Exit</Button>
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow border dark:border-slate-700 p-8 mb-6">
                    <div className="flex justify-between text-sm text-slate-400 mb-4">
                        <span>Question {quizIndex + 1} of {quizQuestions.length}</span>
                        <span className="uppercase font-bold text-indigo-600 dark:text-indigo-400">AI Quiz</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 bg-white dark:bg-slate-800 p-2">{q.question}</h3>
                    <div className="space-y-3">
                        {q.options.map((opt, i) => (
                            <button key={i} onClick={() => { handleQuizOption(i) }} className={`w-full text-left p-4 rounded-xl border-2 font-medium bg-white dark:bg-slate-700 ${isAnswered ? (i === q.correctIndex ? 'border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : i === selectedOption ? 'border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30' : 'border-slate-200 dark:border-slate-600 text-slate-400') : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>{opt}</button>
                        ))}
                    </div>
                    {isAnswered && <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-sm text-indigo-800 dark:text-indigo-200"><strong>Explanation:</strong> {q.explanation}</div>}
                </div>
                <div className="flex justify-end"><Button disabled={!isAnswered} onClick={() => { if (quizIndex < quizQuestions.length - 1) { setQuizIndex(i => i + 1); setSelectedOption(null) } else setShowResult(true) }} icon={<ChevronRight size={16} />}>Next</Button></div>
            </div>
        );
    }

    if (mode === 'EQUATION') { const problem = equations[equationIndex]; if (!problem) return <div className="p-8 text-center dark:text-white"><p>No equations found.</p><Button onClick={resetTool}>Back</Button></div>; return <div className="max-w-3xl mx-auto p-6 h-full"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"><div className="flex justify-between items-center mb-6"><span className="text-xs font-bold uppercase tracking-wider text-indigo-500">{problem.difficulty} Problem</span><span className="text-slate-400 text-sm">{equationIndex + 1}/{equations.length}</span></div><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">{problem.question}</h3><div className="space-y-4 mb-8">{problem.steps.map((step, i) => (<div key={i} className={`p-4 rounded-xl border transition-all ${i < revealedSteps ? 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-50 blur-sm select-none'}`}><span className="font-bold text-slate-400 mr-3">Step {i + 1}</span><span className="text-slate-800 dark:text-slate-200">{i < revealedSteps ? step : "Hidden Step"}</span></div>))}{revealedSteps === problem.steps.length && <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 animate-in fade-in"><span className="font-bold text-green-700 dark:text-green-400 mr-3">Answer:</span><span className="text-green-900 dark:text-green-200 font-mono text-lg">{problem.finalAnswer}</span></div>}</div><div className="flex gap-3">{revealedSteps < problem.steps.length ? <Button onClick={() => setRevealedSteps(s => s + 1)} icon={<Eye size={16} />}>Reveal Next Step</Button> : <Button onClick={() => setRevealedSteps(problem.steps.length)} disabled>All Revealed</Button>}{revealedSteps === problem.steps.length && (equationIndex < equations.length - 1 ? <Button onClick={() => { setEquationIndex(i => i + 1); setRevealedSteps(0); }} variant="secondary" icon={<ChevronRight size={16} />}>Next Problem</Button> : <Button onClick={loadMoreEquations} variant="primary" icon={loadingMore ? <Loader2 className="animate-spin" /> : <PlusCircle size={16} />}>{loadingMore ? 'Generating...' : '+3 More'}</Button>)}</div></div></div>; }
    if (['BLURTING', 'FEYNMAN', 'DEEP_DIVE'].includes(mode)) { const title = mode === 'FEYNMAN' ? 'Feynman Technique' : mode === 'BLURTING' ? 'Blurting Simulator' : deepDiveType; return <div className="max-w-5xl mx-auto p-6 h-full"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button><div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border dark:border-slate-700 flex flex-col"><h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{title}</h2>{mode === 'DEEP_DIVE' && <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded mb-4 text-indigo-900 dark:text-indigo-200">{deepDivePrompt}</div>}{mode !== 'DEEP_DIVE' && <input className="w-full p-3 mb-3 bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 rounded text-slate-900 dark:text-white placeholder-slate-400" placeholder="Topic..." value={topic} onChange={e => setTopic(e.target.value)} />}<textarea className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 rounded resize-none text-slate-900 dark:text-white placeholder-slate-400" placeholder="Type answer..." value={textInput} onChange={e => setTextInput(e.target.value)} /><div className="mt-4"><Button className="w-full" onClick={mode === 'FEYNMAN' ? submitFeynman : mode === 'BLURTING' ? submitBlurting : submitDeepDive} disabled={isLoading || !textInput} icon={isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}>Analyze</Button></div></div><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border dark:border-slate-700 overflow-y-auto"><h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Brain size={20} className="text-indigo-600 dark:text-indigo-400" /> Analysis</h3>{feedback ? <div className="prose prose-sm prose-indigo dark:prose-invert">{feedback.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div> : <div className="text-center text-slate-400 mt-20">Result appears here</div>}</div></div></div>; }
    if (mode === 'MEMORIZATION') { const words = memoText.split(' '); return <div className="max-w-3xl mx-auto p-6 h-full"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-center"><h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Memorization Mode</h2><p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Click words to hide them, then try to recall.</p><div className="leading-loose text-xl text-slate-800 dark:text-slate-200 mb-8 flex flex-wrap justify-center gap-1.5">{words.map((word, i) => (<span key={i} onClick={() => { playClick(); const next = new Set(memoHiddenIndices); if (next.has(i)) next.delete(i); else next.add(i); setMemoHiddenIndices(next); }} className={`cursor-pointer px-1 rounded transition-all ${memoHiddenIndices.has(i) ? 'bg-slate-800 dark:bg-slate-600 text-slate-800 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}>{word}</span>))}</div><div className="flex justify-center gap-4"><Button variant="secondary" onClick={() => { const all = new Set<number>(); words.forEach((_, i) => all.add(i)); setMemoHiddenIndices(all); }}>Hide All</Button><Button variant="secondary" onClick={() => setMemoHiddenIndices(new Set())}>Reveal All</Button></div></div></div>; }
    if (mode === 'IDENTIFICATION') { const item = identItems[identIndex]; if (!item) return <div className="p-8 text-center dark:text-white">No items generated.</div>; return <div className="max-w-2xl mx-auto p-6 h-full"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"><h3 className="text-sm font-bold uppercase text-slate-400 mb-4">Identify the Concept</h3><p className="text-xl font-medium text-slate-800 dark:text-white mb-8 leading-relaxed">{item.front}</p><div className="flex gap-3 mb-4"><input className={`flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-transparent text-slate-900 dark:text-white ${identFeedback === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : identFeedback === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : 'border-slate-200 dark:border-slate-600'}`} placeholder="Type the term..." value={identInput} onChange={e => setIdentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkIdentification()} /><Button onClick={checkIdentification}>Check</Button></div>{identFeedback && <div className={`p-4 rounded-xl mb-4 ${identFeedback === 'correct' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>{identFeedback === 'correct' ? <div className="flex items-center gap-2"><CheckCircle2 size={18} /> Correct! It is <strong>{item.back}</strong>.</div> : <div className="flex items-center gap-2"><AlertCircle size={18} /> Incorrect. The answer is <strong>{item.back}</strong>.</div>}</div>}<div className="flex justify-end"><Button disabled={!identFeedback} onClick={() => { if (identIndex < identItems.length - 1) { setIdentIndex(i => i + 1); setIdentInput(''); setIdentFeedback(null); } else resetTool(); }} icon={<ChevronRight size={16} />}>Next</Button></div></div></div>; }
    if (mode === 'PEER_TEACHING') { return <div className="max-w-3xl mx-auto p-6 h-full"><Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />} className="mb-6">Back</Button><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center"><div className="w-16 h-16 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mb-6"><Mic size={32} className={isRecording ? 'animate-pulse text-red-500' : ''} /></div><h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Teach Me</h2><p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Explain a concept aloud. I will analyze your explanation.</p>{!isRecording ? <Button onClick={startRecording} size="lg" className="w-full bg-sky-600 hover:bg-sky-700">Start Recording</Button> : <Button onClick={finishPeerRecording} size="lg" variant="danger" className="w-full">Stop & Analyze</Button>}</div><div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[500px]"><h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><User size={18} className="text-indigo-600 dark:text-indigo-400" /> AI Student Feedback</h3>{isLoading ? <div className="flex flex-col items-center justify-center h-40 text-slate-400"><Loader2 className="animate-spin mb-2" size={24} /><p className="text-xs">Listening and analyzing...</p></div> : peerFeedback ? <div className="prose prose-sm prose-indigo dark:prose-invert">{peerFeedback.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div> : <p className="text-slate-400 text-sm text-center mt-10">Record your explanation to get feedback.</p>}</div></div></div>; }

    if (mode === 'MAJOR_EXAM') {
        return <MajorExamMode attachments={attachments} onClose={resetTool} />;
    }

    if (mode === 'LANGUAGE_LAB') {
        return <LanguageLab onStartVoice={onStartVoice} onClose={resetTool} />;
    }

    if (mode === 'ACTIVE_RECALL') {
        if (recallQuestions.length === 0) {
            return (
                <div className="p-8 text-center dark:text-white">
                    <Loader2 className="animate-spin inline mb-4" size={32} />
                    <p>Generating active recall questions...</p>
                </div>
            );
        }

        const currentQuestion = recallQuestions[recallIndex];
        const isAnswered = recallResponse !== null;
        const avgScore = recallHistory.length > 0
            ? Math.round(recallHistory.reduce((sum, r) => sum + r.score, 0) / recallHistory.length)
            : 0;

        return (
            <div className="max-w-4xl mx-auto p-6 h-full">
                <div className="flex justify-between items-center mb-6">
                    <Button variant="ghost" onClick={resetTool} icon={<ArrowLeft size={16} />}>
                        Back
                    </Button>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Avg Score: <strong className="text-indigo-600 dark:text-indigo-400">{avgScore}%</strong>
                        </span>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={loadMoreRecallQuestions}
                            icon={loadingMore ? <Loader2 className="animate-spin" /> : <PlusCircle size={16} />}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Adding...' : '+5 More'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Question Panel */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                                    {currentQuestion.difficulty}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">{currentQuestion.topic}</p>
                            </div>
                            <span className="text-sm text-slate-400">
                                {recallIndex + 1}/{recallQuestions.length}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 leading-relaxed">
                            {currentQuestion.question}
                        </h3>

                        {!isAnswered ? (
                            <>
                                <textarea
                                    className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl resize-none text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Type your answer here... Try to recall from memory before looking at notes!"
                                    value={recallAnswer}
                                    onChange={e => setRecallAnswer(e.target.value)}
                                />
                                <Button
                                    className="w-full mt-4"
                                    onClick={submitRecallAnswer}
                                    disabled={isLoading || !recallAnswer.trim()}
                                    icon={isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                                >
                                    {isLoading ? 'Evaluating...' : 'Submit Answer'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl mb-4">
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                                        Your Answer:
                                    </p>
                                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                                        {recallAnswer}
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    {recallIndex < recallQuestions.length - 1 ? (
                                        <Button
                                            onClick={() => {
                                                setRecallIndex(i => i + 1);
                                                setRecallAnswer('');
                                                setRecallResponse(null);
                                            }}
                                            icon={<ChevronRight size={16} />}
                                        >
                                            Next Question
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={loadMoreRecallQuestions}
                                            icon={loadingMore ? <Loader2 className="animate-spin" /> : <RefreshCw size={16} />}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? 'Loading...' : 'More Questions'}
                                        </Button>
                                    )}
                                    <Button
                                        variant="secondary"
                                        onClick={() => setRecallResponse(null)}
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Feedback Panel */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <Brain size={20} className="text-indigo-600 dark:text-indigo-400" />
                            AI Feedback
                        </h3>

                        {isAnswered ? (
                            <>
                                {/* Score Badge */}
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${recallResponse.score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    recallResponse.score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                    <Trophy size={18} />
                                    <span className="font-bold text-lg">{recallResponse.score}%</span>
                                </div>

                                {/* Feedback */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm">
                                        Feedback:
                                    </h4>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {recallResponse.feedback}
                                    </p>
                                </div>

                                {/* Key Points */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 text-sm">
                                        Key Points to Cover:
                                    </h4>
                                    <ul className="space-y-2">
                                        {currentQuestion.keyPoints.map((point, i) => {
                                            const missed = recallResponse.missedPoints.includes(point);
                                            return (
                                                <li
                                                    key={i}
                                                    className={`flex items-start gap-2 text-sm p-2 rounded ${missed
                                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                                        }`}
                                                >
                                                    {missed ? <X size={16} className="mt-0.5 flex-shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />}
                                                    <span>{point}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>

                                {/* Progress */}
                                {recallHistory.length > 1 && (
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm">
                                            Session Progress:
                                        </h4>
                                        <div className="flex gap-1">
                                            {recallHistory.map((r, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-2 flex-1 rounded ${r.score >= 80 ? 'bg-green-500' :
                                                        r.score >= 60 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    title={`Q${i + 1}: ${r.score}%`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-slate-400 mt-20">
                                <Info size={32} className="mx-auto mb-3 opacity-50" />
                                <p className="text-sm">
                                    Submit your answer to receive AI-powered feedback and scoring.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
