import React from 'react';
import { BrainCircuit, Sparkles, Zap, Users, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage({ theme, toggleTheme }: { onLogin?: () => void, theme: string, toggleTheme: () => void }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <BrainCircuit size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight">NeuroFocus</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-full transition-all hover:scale-105 shadow-lg shadow-indigo-200 dark:shadow-none">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6 animate-fade-in">
            <Sparkles size={14} />
            <span>AI-Powered Learning Revolution</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 pb-2">
            Master Any Subject with <br /> Neural Precision
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Your personal AI tutor that adapts to your learning style. Upload materials, get instant quizzes, and master concepts faster than ever before.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2">
              Start Learning Free <ArrowRight size={18} />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
              <Play size={18} /> Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BrainCircuit size={32} className="text-indigo-600" />,
                title: "Adaptive AI Tutor",
                desc: "Personalized explanations that evolve with your understanding."
              },
              {
                icon: <Zap size={32} className="text-amber-500" />,
                title: "Instant Quizzes",
                desc: "Turn any document into a test to verify your mastery immediately."
              },
              {
                icon: <Users size={32} className="text-emerald-500" />,
                title: "Collaborative Study",
                desc: "Connect with peers and share progress in real-time."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl w-fit">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}