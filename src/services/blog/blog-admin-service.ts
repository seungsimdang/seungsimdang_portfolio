import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema/portfolio";
import type { PostCreateInput, PostUpdateInput } from "@/schemas/blog.schema";
import {
  getPgErrorCode,
  NotFoundError,
  PG_UNIQUE_VIOLATION,
  SlugConflictError,
} from "@/services/portfolio/portfolio-admin-service";
import type { Post } from "@/types/blog";
import { toPost } from "./blog-service";

export async function createPost(input: PostCreateInput): Promise<Post> {
  try {
    const [row] = await db.insert(posts).values(input).returning();
    if (!row) throw new Error("insert returned no row");
    return toPost(row);
  } catch (error) {
    if (getPgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      throw new SlugConflictError();
    }
    throw error;
  }
}

// slug는 바꾸지 않음
export async function updatePost(
  slug: string,
  input: PostUpdateInput,
): Promise<Post> {
  const [row] = await db
    .update(posts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(posts.slug, slug))
    .returning();
  if (!row) throw new NotFoundError();
  return toPost(row);
}

export async function deletePost(slug: string): Promise<void> {
  const rows = await db
    .delete(posts)
    .where(eq(posts.slug, slug))
    .returning({ id: posts.id });
  if (rows.length === 0) throw new NotFoundError();
}
