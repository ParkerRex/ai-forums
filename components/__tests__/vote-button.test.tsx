/**
 * @fileoverview VoteButton Component Test Suite
 * 
 * Comprehensive tests for the new VoteButton component that implements
 * the upvote-only voting system with theme-aware styling and authentication
 * handling. Tests cover all interaction states, accessibility, and integration
 * with the voting system.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VoteButton } from '@/components/ui/vote-button';
import { Id } from '@/convex/_generated/dataModel';

// Mock the dependencies
vi.mock('@/components/ui/arrow-big-up', () => ({
  ArrowBigUpIcon: vi.fn(({ className, size, ref }) => (
    <div 
      data-testid="arrow-big-up-icon" 
      className={className}
      data-size={size}
      ref={ref}
    >
      ↑
    </div>
  ))
}));

vi.mock('@/components/vote-hover-card', () => ({
  VoteHoverCard: vi.fn(({ children, postId, voteCount }) => (
    <div data-testid="vote-hover-card" data-post-id={postId} data-vote-count={voteCount}>
      {children}
    </div>
  ))
}));

vi.mock('@/components/membership-cta-modal', () => ({
  MembershipCTAModal: vi.fn(({ children, title, description }) => (
    <div data-testid="membership-cta-modal" data-title={title} data-description={description}>
      {children}
    </div>
  ))
}));

vi.mock('convex/react', () => ({
  Authenticated: vi.fn(({ children }) => <div data-testid="authenticated">{children}</div>),
  Unauthenticated: vi.fn(({ children }) => <div data-testid="unauthenticated">{children}</div>)
}));

describe('VoteButton', () => {
  const defaultProps = {
    targetId: 'test-post-id' as unknown as Id<"posts">,
    targetType: 'post' as const,
    voteCount: 5,
    isVoted: false,
    isVoting: false,
    onVote: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<VoteButton {...defaultProps} />);
      
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByTestId('arrow-big-up-icon')).toBeInTheDocument();
    });

    it('displays correct vote count', () => {
      render(<VoteButton {...defaultProps} voteCount={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('shows zero votes correctly', () => {
      render(<VoteButton {...defaultProps} voteCount={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Vote States', () => {
    it('applies voted styling when isVoted is true', () => {
      render(<VoteButton {...defaultProps} isVoted={true} />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('bg-foreground', 'text-background');
    });

    it('applies non-voted styling when isVoted is false', () => {
      render(<VoteButton {...defaultProps} isVoted={false} />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('bg-background', 'text-foreground');
    });

    it('disables button when isVoting is true', () => {
      render(<VoteButton {...defaultProps} isVoting={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('applies disabled styling when isVoting is true', () => {
      render(<VoteButton {...defaultProps} isVoting={true} />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Size Variants', () => {
    it('applies small size styling', () => {
      render(<VoteButton {...defaultProps} size="sm" />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('px-2', 'py-1', 'text-xs');
      expect(screen.getByTestId('arrow-big-up-icon')).toHaveAttribute('data-size', '14');
    });

    it('applies medium size styling (default)', () => {
      render(<VoteButton {...defaultProps} size="md" />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('px-3', 'py-1.5', 'text-sm');
      expect(screen.getByTestId('arrow-big-up-icon')).toHaveAttribute('data-size', '16');
    });

    it('applies large size styling', () => {
      render(<VoteButton {...defaultProps} size="lg" />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('px-4', 'py-2', 'text-base');
      expect(screen.getByTestId('arrow-big-up-icon')).toHaveAttribute('data-size', '18');
    });
  });

  describe('Hover Card Integration', () => {
    it('shows hover card for post targets when showHoverCard is true', () => {
      render(
        <VoteButton 
          {...defaultProps} 
          targetType="post" 
          showHoverCard={true} 
        />
      );
      
      expect(screen.getByTestId('vote-hover-card')).toBeInTheDocument();
      expect(screen.getByTestId('vote-hover-card')).toHaveAttribute('data-post-id', 'test-post-id');
      expect(screen.getByTestId('vote-hover-card')).toHaveAttribute('data-vote-count', '5');
    });

    it('does not show hover card when showHoverCard is false', () => {
      render(
        <VoteButton 
          {...defaultProps} 
          targetType="post" 
          showHoverCard={false} 
        />
      );
      
      expect(screen.queryByTestId('vote-hover-card')).not.toBeInTheDocument();
    });

    it('does not show hover card for comment targets', () => {
      render(
        <VoteButton 
          {...defaultProps} 
          targetType="comment" 
          showHoverCard={true} 
        />
      );
      
      expect(screen.queryByTestId('vote-hover-card')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('shows membership CTA for unauthenticated users', () => {
      render(<VoteButton {...defaultProps} />);
      
      const ctaModal = screen.getByTestId('membership-cta-modal');
      expect(ctaModal).toBeInTheDocument();
      expect(ctaModal).toHaveAttribute('data-title', 'Upvote Great Content');
      expect(ctaModal).toHaveAttribute('data-description', 'Join VAI to upvote posts and help surface the best content in the community');
    });

    it('always shows non-voted state for unauthenticated users', () => {
      render(<VoteButton {...defaultProps} isVoted={true} />);
      
      const buttons = screen.getAllByRole('button');
      const unauthenticatedButton = buttons.find(button => 
        button.closest('[data-testid="unauthenticated"]')
      );
      
      // Should always show non-voted styling for unauthenticated users
      expect(unauthenticatedButton).toHaveClass('bg-background', 'text-foreground');
    });
  });

  describe('Interaction Handling', () => {
    it('calls onVote when authenticated button is clicked', async () => {
      const onVoteMock = vi.fn();
      render(<VoteButton {...defaultProps} onVote={onVoteMock} />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      fireEvent.click(authenticatedButton!);
      
      expect(onVoteMock).toHaveBeenCalledTimes(1);
      expect(onVoteMock).toHaveBeenCalledWith(expect.any(Object));
    });

    it('does not call onVote when button is disabled', () => {
      const onVoteMock = vi.fn();
      render(<VoteButton {...defaultProps} onVote={onVoteMock} isVoting={true} />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      fireEvent.click(authenticatedButton!);
      
      expect(onVoteMock).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper button semantics', () => {
      render(<VoteButton {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('has non-selectable vote count text', () => {
      render(<VoteButton {...defaultProps} />);
      
      const voteCountElements = screen.getAllByText('5');
      voteCountElements.forEach(element => {
        expect(element).toHaveClass('select-none');
      });
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<VoteButton {...defaultProps} className="custom-class" />);
      
      const buttons = screen.getAllByRole('button');
      const authenticatedButton = buttons.find(button => 
        button.closest('[data-testid="authenticated"]')
      );
      
      expect(authenticatedButton).toHaveClass('custom-class');
    });
  });
});
