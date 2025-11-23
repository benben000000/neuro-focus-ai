import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useAuth } from '../../contexts/AuthContext';
import { SocialFeed } from '../SocialFeed';

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the social service
vi.mock('../../services/social', () => ({
  subscribeToFeed: vi.fn(),
  toggleLike: vi.fn(),
  searchUsers: vi.fn(),
  sendFriendRequest: vi.fn(),
  getFriendSuggestions: vi.fn(),
  toggleSavePost: vi.fn(),
  isPostSaved: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  subscribeToPresence: vi.fn()
}));

// Mock other components
vi.mock('../StoryTray', () => ({
  StoryTray: ({ onCreateStory }: any) => (
    <div data-testid="story-tray">
      <button onClick={onCreateStory}>Create Story</button>
    </div>
  )
}));

vi.mock('../CreateMediaModal', () => ({
  CreateMediaModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="create-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../ShareModal', () => ({
  ShareModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="share-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../SharedContentPanel', () => ({
  SharedContentPanel: () => <div data-testid="shared-content-panel"></div>
}));

vi.mock('../CommentThread', () => ({
  CommentThread: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="comment-thread">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

describe('SocialFeed', () => {
  const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      loading: false,
      logout: vi.fn()
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: true,
      logout: vi.fn()
    });

    render(<SocialFeed />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render social feed when authenticated', async () => {
    render(<SocialFeed />);
    
    // Check for main feed elements
    expect(screen.getByTestId('story-tray')).toBeInTheDocument();
    expect(screen.getByTestId('shared-content-panel')).toBeInTheDocument();
  });

  it('should open create post modal when create button is clicked', async () => {
    const user = userEvent.setup();
    render(<SocialFeed />);
    
    // Find and click the create post button
    const createButton = screen.getByText(/create post/i);
    await user.click(createButton);
    
    expect(screen.getByTestId('create-modal')).toBeInTheDocument();
  });

  it('should close create modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<SocialFeed />);
    
    // Open modal first
    const createButton = screen.getByText(/create post/i);
    await user.click(createButton);
    
    // Close modal
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);
    
    expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument();
  });

  it('should show empty state when no posts', () => {
    // Mock empty feed
    const { subscribeToFeed } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback([]);
      return vi.fn();
    });

    render(<SocialFeed />);
    
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('should display posts when available', () => {
    const mockPosts = [
      {
        id: '1',
        authorId: 'user1',
        authorName: 'User One',
        content: 'Test post content',
        createdAt: Date.now(),
        likes: 5,
        mediaUrl: 'https://example.com/image.jpg'
      }
    ];

    const { subscribeToFeed } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback(mockPosts);
      return vi.fn();
    });

    render(<SocialFeed />);
    
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.getByText('User One')).toBeInTheDocument();
  });

  it('should handle like button click', async () => {
    const mockPost = {
      id: '1',
      authorId: 'user1',
      authorName: 'User One',
      content: 'Test post',
      createdAt: Date.now(),
      likes: 5
    };

    const { subscribeToFeed, toggleLike } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback([mockPost]);
      return vi.fn();
    });
    toggleLike.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SocialFeed />);
    
    const likeButton = screen.getByRole('button', { name: /like/i });
    await user.click(likeButton);
    
    expect(toggleLike).toHaveBeenCalledWith('1');
  });

  it('should open share modal when share button is clicked', async () => {
    const mockPost = {
      id: '1',
      authorId: 'user1',
      authorName: 'User One',
      content: 'Test post',
      createdAt: Date.now(),
      likes: 5
    };

    const { subscribeToFeed } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback([mockPost]);
      return vi.fn();
    });

    const user = userEvent.setup();
    render(<SocialFeed />);
    
    const shareButton = screen.getByRole('button', { name: /share/i });
    await user.click(shareButton);
    
    expect(screen.getByTestId('share-modal')).toBeInTheDocument();
  });

  it('should open comments when comment button is clicked', async () => {
    const mockPost = {
      id: '1',
      authorId: 'user1',
      authorName: 'User One',
      content: 'Test post',
      createdAt: Date.now(),
      likes: 5
    };

    const { subscribeToFeed } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback([mockPost]);
      return vi.fn();
    });

    const user = userEvent.setup();
    render(<SocialFeed />);
    
    const commentButton = screen.getByRole('button', { name: /comment/i });
    await user.click(commentButton);
    
    expect(screen.getByTestId('comment-thread')).toBeInTheDocument();
  });

  it('should display user suggestions', () => {
    const mockSuggestions = [
      {
        uid: 'user1',
        displayName: 'User One',
        photoURL: 'https://example.com/avatar1.jpg',
        isVerified: false
      },
      {
        uid: 'user2',
        displayName: 'User Two',
        photoURL: 'https://example.com/avatar2.jpg',
        isVerified: true
      }
    ];

    const { getFriendSuggestions } = require('../../services/social');
    getFriendSuggestions.mockResolvedValue(mockSuggestions);

    render(<SocialFeed />);
    
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('should handle follow button click', async () => {
    const mockUser = {
      uid: 'user1',
      displayName: 'User One',
      photoURL: 'https://example.com/avatar1.jpg',
      isVerified: false
    };

    const { getFriendSuggestions, followUser } = require('../../services/social');
    getFriendSuggestions.mockResolvedValue([mockUser]);
    followUser.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SocialFeed />);
    
    const followButton = await screen.findByText('Follow');
    await user.click(followButton);
    
    expect(followUser).toHaveBeenCalledWith('test-user-123', 'user1');
  });

  it('should handle search functionality', async () => {
    const user = userEvent.setup();
    render(<SocialFeed />);
    
    const searchInput = screen.getByPlaceholderText(/search users/i);
    await user.type(searchInput, 'test user');
    
    // The search should trigger after typing
    const { searchUsers } = require('../../services/social');
    expect(searchUsers).toHaveBeenCalledWith('test user');
  });

  it('should format timestamps correctly', () => {
    const now = Date.now();
    const mockPost = {
      id: '1',
      authorId: 'user1',
      authorName: 'User One',
      content: 'Test post',
      createdAt: now - 1000 * 60, // 1 minute ago
      likes: 5
    };

    const { subscribeToFeed } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback([mockPost]);
      return vi.fn();
    });

    render(<SocialFeed />);
    
    expect(screen.getByText('1m')).toBeInTheDocument();
  });

  it('should show verified badge for verified users', () => {
    const mockPost = {
      id: '1',
      authorId: 'user1',
      authorName: 'Verified User',
      content: 'Test post',
      createdAt: Date.now(),
      likes: 5,
      authorIsVerified: true
    };

    const { subscribeToFeed } = require('../../services/social');
    subscribeToFeed.mockImplementation((callback) => {
      callback([mockPost]);
      return vi.fn();
    });

    render(<SocialFeed />);
    
    // Check for verified badge (assuming it has a test attribute or specific class)
    const verifiedBadge = screen.getByTestId('verified-badge') || 
                         screen.getByLabelText('verified user');
    expect(verifiedBadge).toBeInTheDocument();
  });
});