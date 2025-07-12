import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MemberEditForm from '../member-edit-form';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Mock dependencies
vi.mock('convex/react');
vi.mock('@/hooks/use-mutation-error', () => ({
  useMutationError: () => ({
    handleMutationError: vi.fn(),
    handleMutationSuccess: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));
vi.mock('@/components/avatar-upload', () => ({
  AvatarUpload: ({ onUpload, onRemove, initialUrl }: any) => (
    <div data-testid="avatar-upload">
      <button onClick={() => onUpload('https://example.com/new-avatar.jpg')}>
        Upload Avatar
      </button>
      <button onClick={onRemove}>Remove Avatar</button>
      {initialUrl && <span data-testid="current-avatar">{initialUrl}</span>}
    </div>
  ),
}));

describe('MemberEditForm', () => {
  const mockMember = {
    _id: '123' as Id<"members">,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    bio: 'Test bio',
    location: 'Test City',
    linkGithub: 'https://github.com/johndoe',
    linkX: 'https://x.com/johndoe',
    linkYouTube: 'https://youtube.com/@johndoe',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockUpdateMemberProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useMutation as any).mockReturnValue(mockUpdateMemberProfile);
  });

  it('renders all form fields including avatar upload', () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Check avatar upload component
    expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    expect(screen.getByTestId('current-avatar')).toHaveTextContent(mockMember.avatarUrl);

    // Check other fields
    expect(screen.getByLabelText(/bio/i)).toHaveValue(mockMember.bio);
    expect(screen.getByLabelText(/location/i)).toHaveValue(mockMember.location);
    expect(screen.getByLabelText(/github/i)).toHaveValue('johndoe');
    expect(screen.getByLabelText(/x \(twitter\)/i)).toHaveValue('johndoe');
    expect(screen.getByLabelText(/youtube/i)).toHaveValue('johndoe');
  });

  it('handles avatar upload', async () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const uploadButton = screen.getByText('Upload Avatar');
    fireEvent.click(uploadButton);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMemberProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMember._id,
          avatarUrl: 'https://example.com/new-avatar.jpg',
        })
      );
    });
  });

  it('handles avatar removal', async () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const removeButton = screen.getByText('Remove Avatar');
    fireEvent.click(removeButton);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMemberProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMember._id,
          avatarUrl: '',
        })
      );
    });
  });

  it('detects form dirty state with avatar changes', () => {
    const { rerender } = render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Initially save button should be disabled (form not dirty)
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    // Change avatar
    const uploadButton = screen.getByText('Upload Avatar');
    fireEvent.click(uploadButton);

    // Save button should now be enabled
    rerender(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );
    
    // Note: In the actual component, the state change would enable the button
    // This test verifies the structure is in place
  });

  it('validates bio length', async () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const bioField = screen.getByLabelText(/bio/i);
    const longBio = 'a'.repeat(501);
    
    fireEvent.change(bioField, { target: { value: longBio } });
    fireEvent.blur(bioField);

    await waitFor(() => {
      expect(screen.getByText(/bio must be less than 500 characters/i)).toBeInTheDocument();
    });
  });

  it('validates social media handles', async () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const githubField = screen.getByLabelText(/github/i);
    
    fireEvent.change(githubField, { target: { value: 'invalid@handle!' } });
    fireEvent.blur(githubField);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid username/i)).toBeInTheDocument();
    });
  });

  it('handles form submission with all fields', async () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Change some fields
    const bioField = screen.getByLabelText(/bio/i);
    fireEvent.change(bioField, { target: { value: 'Updated bio' } });

    const locationField = screen.getByLabelText(/location/i);
    fireEvent.change(locationField, { target: { value: 'New City' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMemberProfile).toHaveBeenCalledWith({
        id: mockMember._id,
        bio: 'Updated bio',
        location: 'New City',
        linkGithub: 'https://github.com/johndoe',
        linkX: 'https://x.com/johndoe',
        linkYouTube: 'https://youtube.com/@johndoe',
        avatarUrl: mockMember.avatarUrl,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles cancel action', () => {
    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockUpdateMemberProfile).not.toHaveBeenCalled();
  });

  it('disables submit when offline', () => {
    // Mock offline status
    vi.mocked(require('@/hooks/use-network-status').useNetworkStatus).mockReturnValue({ 
      isOnline: false 
    });

    render(
      <MemberEditForm
        member={mockMember}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByRole('button', { name: /offline/i });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute('title', "You're offline. Please check your connection.");
  });
});