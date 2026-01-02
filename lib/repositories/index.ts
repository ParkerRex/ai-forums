/**
 * Repository Layer
 *
 * Provides a centralized data access layer for database operations.
 * Repositories encapsulate query logic and provide typed interfaces
 * for data operations, keeping API routes clean and focused on HTTP concerns.
 *
 * @example
 * ```typescript
 * import { postRepository } from "@/lib/repositories";
 *
 * const posts = await postRepository.findMany({ categoryId: "123" });
 * const post = await postRepository.findById(postId);
 * ```
 */

export type {
  CreatePostInput,
  PostQueryOptions,
  PostWithRelations,
  UpdatePostInput,
} from "./post-repository";
export { postRepository } from "./post-repository";
