import React, { useEffect } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { WelcomeModal } from './WelcomeModal';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialTooltip } from './TutorialTooltip';

export const TutorialManager: React.FC = () => {
    const {
        isActive,
        currentStep,
        currentStepData,
        totalSteps,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial
    } = useOnboarding();

    // Keyboard shortcuts
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    skipTutorial();
                    break;
                case 'Enter':
                    nextStep();
                    break;
                case 'ArrowRight':
                    nextStep();
                    break;
                case 'ArrowLeft':
                    previousStep();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, nextStep, previousStep, skipTutorial]);

    // Prevent body scroll when tutorial is active
    useEffect(() => {
        if (isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isActive]);

    if (!isActive) return null;

    // Show welcome modal for first step
    if (currentStep === 0 && currentStepData?.id === 'welcome') {
        return (
            <WelcomeModal
                onStartTour={nextStep}
                onSkip={skipTutorial}
            />
        );
    }

    // Show tutorial overlay and tooltip for other steps
    return (
        <>
            <TutorialOverlay
                targetSelector={currentStepData?.targetSelector}
                highlightType={currentStepData?.highlightType || 'none'}
                onClick={skipTutorial}
            />
            {currentStepData && (
                <TutorialTooltip
                    step={currentStepData}
                    currentStepNumber={currentStep}
                    totalSteps={totalSteps}
                    onNext={nextStep}
                    onPrevious={previousStep}
                    onSkip={skipTutorial}
                />
            )}
        </>
    );
};
