import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tutorialSteps, TutorialStep, scrollToElement } from '../services/onboarding';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { updateUserProfile } from '../services/social';

interface OnboardingContextType {
    isActive: boolean;
    currentStep: number;
    currentStepData: TutorialStep | null;
    totalSteps: number;
    startTutorial: () => void;
    nextStep: () => void;
    previousStep: () => void;
    skipTutorial: () => void;
    resetTutorial: () => void;
    hasSeenTutorial: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within OnboardingProvider');
    }
    return context;
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { profile } = useProfile();
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasSeenTutorial, setHasSeenTutorial] = useState(true);

    // Check if user has completed tutorial
    useEffect(() => {
        if (profile) {
            const seen = profile.hasCompletedOnboarding || false;
            setHasSeenTutorial(seen);
            
            // Also check localStorage as fallback
            const localSeen = localStorage.getItem('neurofocus-tutorial-completed');
            if (localSeen === 'true' && !seen) {
                setHasSeenTutorial(true);
            }
        }
    }, [profile]);

    const currentStepData = tutorialSteps[currentStep] || null;

    const startTutorial = useCallback(() => {
        setIsActive(true);
        setCurrentStep(0);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < tutorialSteps.length - 1) {
            const nextStepIndex = currentStep + 1;
            setCurrentStep(nextStepIndex);
            
            // Scroll to target element if it exists and skipScroll is not set
            const nextStepData = tutorialSteps[nextStepIndex];
            if (nextStepData.targetSelector && !nextStepData.skipScroll) {
                setTimeout(() => {
                    scrollToElement(nextStepData.targetSelector!);
                }, 100);
            }
            
            // Execute action if defined
            if (nextStepData.action) {
                nextStepData.action();
            }
        } else {
            // Tutorial complete
            completeTutorial();
        }
    }, [currentStep]);

    const previousStep = useCallback(() => {
        if (currentStep > 0) {
            const prevStepIndex = currentStep - 1;
            setCurrentStep(prevStepIndex);
            
            // Scroll to target element if it exists
            const prevStepData = tutorialSteps[prevStepIndex];
            if (prevStepData.targetSelector && !prevStepData.skipScroll) {
                setTimeout(() => {
                    scrollToElement(prevStepData.targetSelector!);
                }, 100);
            }
        }
    }, [currentStep]);

    const skipTutorial = useCallback(() => {
        setIsActive(false);
        completeTutorial();
    }, []);

    const completeTutorial = async () => {
        setIsActive(false);
        setHasSeenTutorial(true);
        
        // Save to localStorage
        localStorage.setItem('neurofocus-tutorial-completed', 'true');
        
        // Save to Firestore if user is logged in
        if (currentUser) {
            try {
                await updateUserProfile(currentUser.uid, {
                    hasCompletedOnboarding: true
                });
            } catch (error) {
                console.error('Failed to save tutorial completion:', error);
            }
        }
    };

    const resetTutorial = useCallback(() => {
        setCurrentStep(0);
        setHasSeenTutorial(false);
        setIsActive(true);
        
        // Clear localStorage flag
        localStorage.removeItem('neurofocus-tutorial-completed');
        
        // Optionally update Firestore
        if (currentUser) {
            updateUserProfile(currentUser.uid, {
                hasCompletedOnboarding: false
            }).catch(console.error);
        }
    }, [currentUser]);

    const value: OnboardingContextType = {
        isActive,
        currentStep,
        currentStepData,
        totalSteps: tutorialSteps.length,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        resetTutorial,
        hasSeenTutorial
    };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
};
