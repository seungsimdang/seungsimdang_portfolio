import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BlogForm } from "@/components/admin/blog-form";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { decodePostSlug } from "@/lib/blog/slug";
import { postSlugSchema } from "@/schemas/blog.schema";
import { getPost } from "@/services/blog/blog-service";

export const metadata: Metadata = {
  title: { absolute: "글 편집 - admin" },
};

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminEditPostPage({ params }: EditPostPageProps) {
  await requireAdminPage();
  const { slug: rawSlug } = await params;
  const slug = decodePostSlug(rawSlug);
  if (!slug || !postSlugSchema.safeParse(slug).success) notFound();
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <>
      <AdminPageHeader title="글 편집" />
      <BlogForm post={post} />
    </>
  );
}
