import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { TutorialStep, calculateTooltipPosition, getElementRect } from '../../services/onboarding';

interface TutorialTooltipProps {
    step: TutorialStep;
    currentStepNumber: number;
    totalSteps: number;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
    step,
    currentStepNumber,
    totalSteps,
    onNext,
    onPrevious,
    onSkip
}) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const updatePosition = () => {
            if (!tooltipRef.current) return;

            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const tooltipWidth = tooltipRect.width || 400;
            const tooltipHeight = tooltipRect.height || 200;

            if (step.targetSelector) {
                const targetRect = getElementRect(step.targetSelector);
                if (targetRect) {
                    let pos = calculateTooltipPosition(
                        targetRect,
                        tooltipWidth,
                        tooltipHeight,
                        step.position
                    );

                    // Adjust if tooltip goes off screen
                    const padding = 16;
                    if (pos.left < padding) pos.left = padding;
                    if (pos.left + tooltipWidth > window.innerWidth - padding) {
                        pos.left = window.innerWidth - tooltipWidth - padding;
                    }
                    if (pos.top < padding) pos.top = padding;
                    if (pos.top + tooltipHeight > window.innerHeight - padding) {
                        pos.top = window.innerHeight - tooltipHeight - padding;
                    }

                    setPosition(pos);
                } else {
                    // Fallback to center if element not found
                    setPosition({
                        top: window.innerHeight / 2 - tooltipHeight / 2,
                        left: window.innerWidth / 2 - tooltipWidth / 2
                    });
                }
            } else {
                // Center position for steps without target
                setPosition({
                    top: window.innerHeight / 2 - tooltipHeight / 2,
                    left: window.innerWidth / 2 - tooltipWidth / 2
                });
            }

            setIsVisible(true);
        };

        // Initial position update with delay to ensure element is rendered
        setTimeout(updatePosition, 100);

        // Update on resize and scroll
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [step]);

    const isFirstStep = currentStepNumber === 0;
    const isLastStep = currentStepNumber === totalSteps - 1;

    return (
        <div
            ref={tooltipRef}
            className={`fixed z-[95] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full mx-4 transition-opacity duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
                top: position.top,
                left: position.left
            }}
            role="dialog"
            aria-labelledby="tutorial-title"
            aria-describedby="tutorial-description"
        >
            {/* Close button */}
            <button
                onClick={onSkip}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Skip tutorial"
            >
                <X size={18} />
            </button>

            {/* Step counter */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                    Step {currentStepNumber + 1} of {totalSteps}
                </span>
            </div>

            {/* Content */}
            <h2 
                id="tutorial-title"
                className="text-xl font-bold text-slate-900 dark:text-white mb-3"
            >
                {step.title}
            </h2>
            <p 
                id="tutorial-description"
                className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed"
            >
                {step.description}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-6">
                <div
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStepNumber + 1) / totalSteps) * 100}%` }}
                />
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between gap-3">
                <button
                    onClick={onPrevious}
                    disabled={isFirstStep}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous step"
                >
                    <ChevronLeft size={20} />
                    <span className="font-medium">Back</span>
                </button>

                <button
                    onClick={onSkip}
                    className="px-4 py-2 text-sm text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                    Skip Tour
                </button>

                <button
                    onClick={onNext}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all active:scale-95"
                    aria-label={isLastStep ? 'Finish tutorial' : 'Next step'}
                >
                    <span>{isLastStep ? 'Finish' : 'Next'}</span>
                    {!isLastStep && <ChevronRight size={20} />}
                </button>
            </div>

            {/* Keyboard hint */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
                    Press <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono">Enter</kbd> to continue or <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 font-mono">ESC</kbd> to skip
                </p>
            </div>
        </div>
    );
};
