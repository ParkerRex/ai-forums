// @vitest-environment jsdom
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { FeatureRequestModal } from "../feature-request-modal";

// Mock the convex hooks
const mockAction = vi.fn();
const mockConvex = {
  storage: {
    generateUploadUrl: vi.fn(),
  },
};

vi.mock("convex/react", () => ({
  useAction: () => mockAction,
  useConvex: () => mockConvex,
}));

// Mock the RichTextEditor component
vi.mock("@/components/rich-text-editor", () => ({
  RichTextEditor: ({
    onChange,
    placeholder,
  }: {
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      data-testid="rich-text-editor"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock upload-media utilities
vi.mock("@/lib/upload-media", () => ({
  validateMediaFile: vi.fn(() => ({ valid: true })),
  getFilePreviewUrl: vi.fn((file: File) => `blob:preview-${file.name}`),
  revokeFilePreviewUrl: vi.fn(),
  uploadMedia: vi.fn(() =>
    Promise.resolve({ url: "https://example.com/uploaded.jpg" }),
  ),
}));

describe("FeatureRequestModal", () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAction.mockResolvedValue({
      issueNumber: 123,
      issueUrl: "https://github.com/joinvai/vai-vex/issues/123",
      success: true,
    });
  });

  it("renders when isOpen is true", () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByText("Request a Feature")).toBeInTheDocument();
    expect(
      screen.getByText("Share your ideas to help us improve the platform."),
    ).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<FeatureRequestModal isOpen={false} onClose={onCloseMock} />);

    expect(screen.queryByText("Request a Feature")).not.toBeInTheDocument();
  });

  it("validates required fields", async () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const submitButton = screen.getByText("Submit Feature Request");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
  });

  it("validates title max length", async () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const titleInput = screen.getByPlaceholderText(
      "Brief description of your feature idea",
    );
    const longTitle = "a".repeat(101);

    fireEvent.change(titleInput, { target: { value: longTitle } });

    const submitButton = screen.getByText("Submit Feature Request");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Title must be less than 100 characters"),
      ).toBeInTheDocument();
    });
  });

  it("submits feature request successfully", async () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const titleInput = screen.getByPlaceholderText(
      "Brief description of your feature idea",
    );
    const descriptionEditor = screen.getByTestId("rich-text-editor");

    fireEvent.change(titleInput, { target: { value: "Add dark mode" } });
    fireEvent.change(descriptionEditor, {
      target: { value: "It would be great to have a dark mode option." },
    });

    const submitButton = screen.getByText("Submit Feature Request");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledWith({
        title: "Add dark mode",
        description: "It would be great to have a dark mode option.",
        screenshotUrls: undefined,
      });
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("handles file upload", async () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    // Find the hidden file input (it may be rendered in a portal)
    const fileInput = document.querySelector(
      'input[type="file"][accept*="image"]',
    ) as HTMLInputElement;

    expect(fileInput).toBeTruthy();

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      // Check that the image is rendered with the mocked preview URL
      const img = screen.getByAltText("test.png");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "blob:preview-test.png");
    });
  });

  it("removes attached files", async () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const file = new File(["test"], "test.png", { type: "image/png" });
    // Find the hidden file input (it may be rendered in a portal)
    const fileInput = document.querySelector(
      'input[type="file"][accept*="image"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByAltText("test.png")).toBeInTheDocument();
    });

    // Find the remove button - it's the X button on the image
    const removeButtons = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.className.includes("destructive") &&
          btn.className.includes("absolute"),
      );

    expect(removeButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(removeButtons[0]);
    });

    await waitFor(() => {
      expect(screen.queryByAltText("test.png")).not.toBeInTheDocument();
    });
  });

  it("shows error message on submission failure", async () => {
    const { toast } = await import("sonner");
    mockAction.mockRejectedValueOnce(new Error("Network error"));

    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const titleInput = screen.getByPlaceholderText(
      "Brief description of your feature idea",
    );
    const descriptionEditor = screen.getByTestId("rich-text-editor");

    fireEvent.change(titleInput, { target: { value: "Test feature" } });
    fireEvent.change(descriptionEditor, {
      target: { value: "Test description" },
    });

    const submitButton = screen.getByText("Submit Feature Request");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });
  });

  it("disables form during submission", async () => {
    // Mock a delayed response to see the loading state
    mockAction.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                issueNumber: 123,
                issueUrl: "https://github.com/joinvai/vai-vex/issues/123",
                success: true,
              }),
            100,
          ),
        ),
    );

    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const titleInput = screen.getByPlaceholderText(
      "Brief description of your feature idea",
    );
    const descriptionEditor = screen.getByTestId("rich-text-editor");

    await act(async () => {
      fireEvent.change(titleInput, { target: { value: "Test feature" } });
      fireEvent.change(descriptionEditor, {
        target: { value: "Test description" },
      });
    });

    const submitButton = screen.getByText("Submit Feature Request");

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText("Submitting...")).toBeInTheDocument();
      const loadingButton = screen.getByRole("button", { name: /Submitting/i });
      expect(loadingButton).toBeDisabled();
    });

    // Wait for submission to complete
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("closes modal on cancel", async () => {
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it("enforces maximum attachment limit", async () => {
    const { toast } = await import("sonner");
    render(<FeatureRequestModal isOpen={true} onClose={onCloseMock} />);

    const files = Array.from(
      { length: 6 },
      (_, i) => new File([`test${i}`], `test${i}.png`, { type: "image/png" }),
    );

    const fileInput = document.querySelector(
      'input[type="file"][accept*="image"]',
    ) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(fileInput, { target: { files } });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Maximum 5 screenshots allowed per feature request",
      );
    });
  });
});
