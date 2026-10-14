import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BlogForm } from "@/components/admin/blog-form";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { decodePostSlug } from "@/lib/blog/slug";
import { postSlugSchema } from "@/schemas/blog.schema";
import { getAdminPost } from "@/services/blog/blog-service";

export const metadata: Metadata = {
  title: { absolute: "글 편집 - admin" },
};

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function AdminEditPostPage({
  params,
  searchParams,
}: EditPostPageProps) {
  await requireAdminPage();
  const [{ slug: rawSlug }, { saved }] = await Promise.all([
    params,
    searchParams,
  ]);
  const slug = decodePostSlug(rawSlug);
  if (!slug || !postSlugSchema.safeParse(slug).success) notFound();
  const post = await getAdminPost(slug);
  if (!post) notFound();
  return (
    <>
      <AdminPageHeader title="글 편집" />
      <BlogForm post={post} initialSaved={saved === "1"} />
    </>
  );
}
