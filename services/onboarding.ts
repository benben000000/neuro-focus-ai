// Onboarding Tutorial Service

export type TutorialStepPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type TutorialHighlightType = 'spotlight' | 'outline' | 'none';

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string; // CSS selector for element to highlight
    position: TutorialStepPosition;
    highlightType: TutorialHighlightType;
    action?: () => void; // Optional action to execute when reaching this step
    skipScroll?: boolean; // Skip auto-scrolling for this step
}

export const tutorialSteps: TutorialStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to NeuroFocus AI Tutor! 🎓',
        description: 'Let\'s take a quick tour of the app\'s key features. You can skip this anytime by pressing ESC or clicking Skip.',
        position: 'center',
        highlightType: 'none'
    },
    {
        id: 'dashboard',
        title: 'Your Dashboard',
        description: 'This is your home base. Track your study stats, monitor your learning streak, and see your progress at a glance.',
        targetSelector: '[data-tour="dashboard-stats"]',
        position: 'bottom',
        highlightType: 'spotlight'
    },
    {
        id: 'pomodoro',
        title: 'Pomodoro Timer',
        description: 'Stay focused with built-in Pomodoro sessions. Set your timer, take breaks, and maximize productivity.',
        targetSelector: '[data-tour="pomodoro-timer"]',
        position: 'top',
        highlightType: 'spotlight'
    },
    {
        id: 'ai-tutor',
        title: 'AI Tutor Chat',
        description: 'Get instant help from your AI tutor. Ask questions, request explanations, and dive deep into any topic.',
        targetSelector: '[data-tour="nav-tutor"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'study-tools',
        title: 'Study Tools',
        description: 'Access powerful learning tools like flashcards, quizzes, mind maps, and active recall exercises tailored to your needs.',
        targetSelector: '[data-tour="nav-tools"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'language-lab',
        title: 'Language Lab',
        description: 'Practice speaking and listening in your target language with real-time voice conversations.',
        targetSelector: '[data-tour="nav-language"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'community',
        title: 'Community Feed',
        description: 'Connect with fellow learners! Share your progress, celebrate wins, and get inspired by others.',
        targetSelector: '[data-tour="nav-community"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'messages',
        title: 'Messages & DMs',
        description: 'Send direct messages to friends, create study groups, and collaborate with peers.',
        targetSelector: '[data-tour="nav-messages"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'profile',
        title: 'Your Profile',
        description: 'Customize your profile, track your XP and level, manage your mood board, and view your achievements.',
        targetSelector: '[data-tour="nav-profile"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'voice-mode',
        title: 'Voice Mode',
        description: 'Switch to immersive voice conversations for a hands-free learning experience anytime.',
        targetSelector: '[data-tour="voice-mode-btn"]',
        position: 'right',
        highlightType: 'outline'
    },
    {
        id: 'complete',
        title: 'You\'re All Set! 🎉',
        description: 'That\'s it! You\'re ready to start your learning journey. You can replay this tutorial anytime from your profile settings.',
        position: 'center',
        highlightType: 'none'
    }
];

// Helper function to get element rect with viewport offset
export const getElementRect = (selector: string): DOMRect | null => {
    const element = document.querySelector(selector);
    if (!element) return null;
    return element.getBoundingClientRect();
};

// Helper function to calculate tooltip position
export const calculateTooltipPosition = (
    targetRect: DOMRect,
    tooltipWidth: number,
    tooltipHeight: number,
    position: TutorialStepPosition
): { top: number; left: number } => {
    const padding = 20; // Space between target and tooltip

    switch (position) {
        case 'top':
            return {
                top: targetRect.top - tooltipHeight - padding,
                left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2
            };
        case 'bottom':
            return {
                top: targetRect.bottom + padding,
                left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2
            };
        case 'left':
            return {
                top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
                left: targetRect.left - tooltipWidth - padding
            };
        case 'right':
            return {
                top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
                left: targetRect.right + padding
            };
        case 'center':
        default:
            return {
                top: window.innerHeight / 2 - tooltipHeight / 2,
                left: window.innerWidth / 2 - tooltipWidth / 2
            };
    }
};

// Smooth scroll element into view
export const scrollToElement = (selector: string): void => {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
};
