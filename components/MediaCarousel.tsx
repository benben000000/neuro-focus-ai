import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComposerMedia } from '../services/social';

interface MediaCarouselProps {
    media: ComposerMedia[];
    aspect?: 'square' | 'story' | 'auto';
    showArrows?: boolean;
    showDots?: boolean;
    className?: string;
    initialIndex?: number;
    onIndexChange?: (index: number) => void;
    objectFit?: 'cover' | 'contain';
}

export function MediaCarousel({
    media,
    aspect = 'square',
    showArrows = true,
    showDots = true,
    className = '',
    initialIndex = 0,
    onIndexChange,
    objectFit = 'cover'
}: MediaCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const touchStartXRef = useRef<number | null>(null);

    useEffect(() => {
        // Reset index when media set changes
        if (initialIndex >= 0 && initialIndex < media.length) {
            setCurrentIndex(initialIndex);
        } else {
            setCurrentIndex(0);
        }
    }, [initialIndex, media.length]);

    const goTo = (index: number) => {
        if (media.length === 0) return;
        const nextIndex = (index + media.length) % media.length;
        setCurrentIndex(nextIndex);
        if (onIndexChange) onIndexChange(nextIndex);
    };

    const goNext = () => goTo(currentIndex + 1);
    const goPrev = () => goTo(currentIndex - 1);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartXRef.current == null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const deltaX = endX - touchStartXRef.current;
        const threshold = 40; // px

        if (Math.abs(deltaX) > threshold) {
            if (deltaX < 0) {
                goNext();
            } else {
                goPrev();
            }
        }

        touchStartXRef.current = null;
    };

    const aspectClass = aspect === 'story'
        ? 'aspect-[9/16]'
        : aspect === 'square'
            ? 'aspect-square'
            : '';

    if (!media || media.length === 0) {
        return (
            <div className={`relative w-full ${aspectClass} bg-slate-100 dark:bg-slate-900 flex items-center justify-center ${className}`}>
                <span className="text-xs text-slate-400">No media</span>
            </div>
        );
    }

    const active = media[currentIndex];

    return (
        <div
            className={`relative w-full ${aspectClass} bg-black flex items-center justify-center overflow-hidden ${className}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <img
                src={active.url}
                alt="Post media"
                className={`w-full h-full select-none ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
            />

            {/* Index indicator */}
            {media.length > 1 && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium">
                    {currentIndex + 1} / {media.length}
                </div>
            )}

            {/* Arrows (desktop primarily) */}
            {showArrows && media.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="hidden sm:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="hidden sm:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </>
            )}

            {/* Dots */}
            {showDots && media.length > 1 && (
                <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5">
                    {media.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); goTo(index); }}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                                index === currentIndex
                                    ? 'bg-white w-3'
                                    : 'bg-white/50 hover:bg-white/80'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
