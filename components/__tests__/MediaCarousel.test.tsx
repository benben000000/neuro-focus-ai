import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MediaCarousel } from '../MediaCarousel';

// Mock ComposerMedia interface
const mockMedia = [
  {
    id: '1',
    url: 'data:image/jpeg;base64,test1',
    width: 800,
    height: 600,
    mimeType: 'image/jpeg'
  },
  {
    id: '2',
    url: 'data:image/jpeg;base64,test2',
    width: 600,
    height: 800,
    mimeType: 'image/jpeg'
  },
  {
    id: '3',
    url: 'data:image/jpeg;base64,test3',
    width: 1000,
    height: 500,
    mimeType: 'image/jpeg'
  }
];

describe('MediaCarousel', () => {
  const onIndexChange = vi.fn();

  beforeEach(() => {
    onIndexChange.mockClear();
  });

  it('should render single media item', () => {
    render(
      <MediaCarousel 
        media={[mockMedia[0]]} 
        onIndexChange={onIndexChange}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockMedia[0].url);
    
    // Should not show navigation for single item
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('should render multiple media items with navigation', () => {
    render(
      <MediaCarousel 
        media={mockMedia} 
        onIndexChange={onIndexChange}
      />
    );

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    
    const prevButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('should navigate to next media when next button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MediaCarousel 
        media={mockMedia} 
        onIndexChange={onIndexChange}
      />
    );

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockMedia[0].url);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockMedia[1].url);
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('should navigate to previous media when previous button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MediaCarousel 
        media={mockMedia} 
        initialIndex={2}
        onIndexChange={onIndexChange}
      />
    );

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockMedia[2].url);

    const prevButton = screen.getByRole('button', { name: /previous/i });
    await user.click(prevButton);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockMedia[1].url);
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('should wrap around when navigating past boundaries', async () => {
    const user = userEvent.setup();
    render(
      <MediaCarousel 
        media={mockMedia} 
        onIndexChange={onIndexChange}
      />
    );

    // Go to last item
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton); // to index 1
    await user.click(nextButton); // to index 2

    expect(screen.getByText('3 / 3')).toBeInTheDocument();

    // Click next again - should wrap to first
    await user.click(nextButton);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenCalledWith(0);

    // Click previous - should wrap to last
    const prevButton = screen.getByRole('button', { name: /previous/i });
    await user.click(prevButton);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('should navigate when dots are clicked', async () => {
    const user = userEvent.setup();
    render(
      <MediaCarousel 
        media={mockMedia} 
        onIndexChange={onIndexChange}
      />
    );

    const dots = screen.getAllByRole('button').filter(button => 
      !button.hasAttribute('aria-label') && 
      button.className.includes('rounded-full')
    );
    
    expect(dots).toHaveLength(3);

    // Click second dot
    await user.click(dots[1]);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenCalledWith(1);

    // Click third dot
    await user.click(dots[2]);
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('should apply correct aspect ratio classes', () => {
    const { rerender } = render(
      <MediaCarousel media={mockMedia} aspect="square" />
    );
    expect(screen.getByRole('img').closest('div')).toHaveClass('aspect-square');

    rerender(<MediaCarousel media={mockMedia} aspect="story" />);
    expect(screen.getByRole('img').closest('div')).toHaveClass('aspect-[9/16]');

    rerender(<MediaCarousel media={mockMedia} aspect="auto" />);
    const container = screen.getByRole('img').closest('div');
    expect(container).not.toHaveClass('aspect-square');
    expect(container).not.toHaveClass('aspect-[9/16]');
  });

  it('should apply correct object fit', () => {
    render(
      <MediaCarousel media={mockMedia} objectFit="contain" />
    );
    expect(screen.getByRole('img')).toHaveClass('object-contain');

    render(
      <MediaCarousel media={mockMedia} objectFit="cover" />
    );
    expect(screen.getByRole('img')).toHaveClass('object-cover');
  });

  it('should show empty state when no media provided', () => {
    render(<MediaCarousel media={[]} />);
    
    expect(screen.getByText('No media')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should handle touch gestures for navigation', () => {
    render(
      <MediaCarousel 
        media={mockMedia} 
        onIndexChange={onIndexChange}
      />
    );

    const container = screen.getByRole('img').closest('div');
    
    // Simulate swipe left (next)
    fireEvent.touchStart(container!, {
      touches: [{ clientX: 100 }]
    });
    fireEvent.touchEnd(container!, {
      changedTouches: [{ clientX: 50 }]
    });

    expect(onIndexChange).toHaveBeenCalledWith(1);

    // Simulate swipe right (previous)
    fireEvent.touchStart(container!, {
      touches: [{ clientX: 50 }]
    });
    fireEvent.touchEnd(container!, {
      changedTouches: [{ clientX: 100 }]
    });

    expect(onIndexChange).toHaveBeenCalledWith(-1);
  });

  it('should not navigate on small swipes', () => {
    render(
      <MediaCarousel 
        media={mockMedia} 
        onIndexChange={onIndexChange}
      />
    );

    const container = screen.getByRole('img').closest('div');
    
    // Small swipe (less than threshold)
    fireEvent.touchStart(container!, {
      touches: [{ clientX: 100 }]
    });
    fireEvent.touchEnd(container!, {
      changedTouches: [{ clientX: 80 }] // Only 20px difference
    });

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('should hide arrows when showArrows is false', () => {
    render(
      <MediaCarousel 
        media={mockMedia} 
        showArrows={false}
      />
    );

    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('should hide dots when showDots is false', () => {
    render(
      <MediaCarousel 
        media={mockMedia} 
        showDots={false}
      />
    );

    const dots = screen.queryAllByRole('button').filter(button => 
      !button.hasAttribute('aria-label') && 
      button.className.includes('rounded-full')
    );
    
    expect(dots).toHaveLength(0);
  });

  it('should apply custom className', () => {
    render(
      <MediaCarousel 
        media={mockMedia} 
        className="custom-test-class"
      />
    );

    const container = screen.getByRole('img').closest('div');
    expect(container).toHaveClass('custom-test-class');
  });
});