import React, { useEffect, useState } from 'react';
import { TutorialHighlightType } from '../../services/onboarding';

interface TutorialOverlayProps {
    targetSelector?: string;
    highlightType: TutorialHighlightType;
    onClick?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ 
    targetSelector, 
    highlightType,
    onClick 
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (targetSelector && highlightType !== 'none') {
            const updateRect = () => {
                const element = document.querySelector(targetSelector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);
                } else {
                    setTargetRect(null);
                }
            };

            updateRect();

            // Update on resize and scroll
            window.addEventListener('resize', updateRect);
            window.addEventListener('scroll', updateRect, true);

            return () => {
                window.removeEventListener('resize', updateRect);
                window.removeEventListener('scroll', updateRect, true);
            };
        } else {
            setTargetRect(null);
        }
    }, [targetSelector, highlightType]);

    if (highlightType === 'none') {
        return (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-in fade-in duration-300"
                onClick={onClick}
                role="presentation"
            />
        );
    }

    return (
        <>
            {/* Dark overlay with cutout */}
            <div 
                className="fixed inset-0 z-[90] pointer-events-none"
                style={{
                    background: targetRect && highlightType === 'spotlight'
                        ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 20}px, rgba(0, 0, 0, 0.7) ${Math.max(targetRect.width, targetRect.height) / 2 + 80}px)`
                        : 'rgba(0, 0, 0, 0.6)'
                }}
                onClick={onClick}
            />

            {/* Clickable overlay area */}
            <div 
                className="fixed inset-0 z-[90] backdrop-blur-sm"
                onClick={onClick}
                role="presentation"
                style={{
                    background: 'transparent',
                    pointerEvents: 'auto'
                }}
            />

            {/* Highlight box around target */}
            {targetRect && highlightType === 'outline' && (
                <div
                    className="fixed z-[91] rounded-xl border-4 border-indigo-500 shadow-2xl pointer-events-none animate-pulse"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        transition: 'all 0.3s ease'
                    }}
                />
            )}

            {/* Spotlight glow effect */}
            {targetRect && highlightType === 'spotlight' && (
                <div
                    className="fixed z-[91] rounded-xl pointer-events-none"
                    style={{
                        top: targetRect.top - 12,
                        left: targetRect.left - 12,
                        width: targetRect.width + 24,
                        height: targetRect.height + 24,
                        boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 60px 20px rgba(99, 102, 241, 0.4)',
                        transition: 'all 0.3s ease'
                    }}
                />
            )}
        </>
    );
};
