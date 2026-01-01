import { describe, expect, test } from "bun:test";
import {
  changePasswordSchema,
  createCommentSchema,
  createPostSchema,
  editCommentSchema,
  signInSchema,
  signUpSchema,
  updatePostSchema,
  updateProfileSchema,
} from "@/lib/schemas";

describe("Post Schemas", () => {
  describe("createPostSchema", () => {
    test("validates a valid post", () => {
      const result = createPostSchema.safeParse({
        title: "This is a valid title",
        content: "This is valid content that is long enough",
        categoryId: "category-123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects title that is too short", () => {
      const result = createPostSchema.safeParse({
        title: "Hi",
        content: "This is valid content that is long enough",
        categoryId: "category-123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("title");
      }
    });

    test("rejects empty category", () => {
      const result = createPostSchema.safeParse({
        title: "This is a valid title",
        content: "This is valid content that is long enough",
        categoryId: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("categoryId");
      }
    });

    test("validates poll options", () => {
      const result = createPostSchema.safeParse({
        title: "Poll: What is your favorite color?",
        content: "Vote for your favorite color below!",
        categoryId: "category-123",
        type: "poll",
        pollOptions: ["Red", "Blue", "Green"],
      });
      expect(result.success).toBe(true);
    });

    test("rejects poll with fewer than 2 options", () => {
      const result = createPostSchema.safeParse({
        title: "Poll: What is your favorite color?",
        content: "Vote for your favorite color below!",
        categoryId: "category-123",
        type: "poll",
        pollOptions: ["Red"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updatePostSchema", () => {
    test("validates update with postId", () => {
      const result = updatePostSchema.safeParse({
        postId: "post-123",
        title: "Updated title here",
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing postId", () => {
      const result = updatePostSchema.safeParse({
        title: "Updated title here",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Comment Schemas", () => {
  describe("createCommentSchema", () => {
    test("validates a valid comment", () => {
      const result = createCommentSchema.safeParse({
        content: "This is a valid comment",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty comment", () => {
      const result = createCommentSchema.safeParse({
        content: "",
      });
      expect(result.success).toBe(false);
    });

    test("validates comment with reply reference", () => {
      const result = createCommentSchema.safeParse({
        content: "This is a reply",
        parentCommentId: "comment-123",
        replyToMemberId: "member-456",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("editCommentSchema", () => {
    test("validates edit with commentId", () => {
      const result = editCommentSchema.safeParse({
        commentId: "comment-123",
        content: "Updated comment content",
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing commentId", () => {
      const result = editCommentSchema.safeParse({
        content: "Updated comment content",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Auth Schemas", () => {
  describe("signInSchema", () => {
    test("validates valid credentials", () => {
      const result = signInSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid email", () => {
      const result = signInSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("email");
      }
    });

    test("rejects empty password", () => {
      const result = signInSchema.safeParse({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signUpSchema", () => {
    test("validates valid registration", () => {
      const result = signUpSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password1",
        confirmPassword: "Password1",
      });
      expect(result.success).toBe(true);
    });

    test("rejects weak password", () => {
      const result = signUpSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "weak",
        confirmPassword: "weak",
      });
      expect(result.success).toBe(false);
    });

    test("rejects mismatched passwords", () => {
      const result = signUpSchema.safeParse({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password1",
        confirmPassword: "Password2",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("confirmPassword");
      }
    });
  });

  describe("changePasswordSchema", () => {
    test("validates valid password change", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword1",
        newPassword: "NewPassword1",
        confirmNewPassword: "NewPassword1",
      });
      expect(result.success).toBe(true);
    });

    test("rejects mismatched new passwords", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "OldPassword1",
        newPassword: "NewPassword1",
        confirmNewPassword: "DifferentPassword1",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Profile Schema", () => {
  describe("updateProfileSchema", () => {
    test("validates valid profile update", () => {
      const result = updateProfileSchema.safeParse({
        firstName: "John",
        bio: "A software developer",
        website: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    test("validates empty fields", () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test("rejects invalid website URL", () => {
      const result = updateProfileSchema.safeParse({
        website: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    test("allows empty string for optional URL fields", () => {
      const result = updateProfileSchema.safeParse({
        website: "",
        avatarUrl: "",
      });
      expect(result.success).toBe(true);
    });

    test("validates username format", () => {
      const result = updateProfileSchema.safeParse({
        username: "valid_user-123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid username characters", () => {
      const result = updateProfileSchema.safeParse({
        username: "invalid username!",
      });
      expect(result.success).toBe(false);
    });
  });
});
