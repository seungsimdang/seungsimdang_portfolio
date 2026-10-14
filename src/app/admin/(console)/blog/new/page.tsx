import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BlogForm } from "@/components/admin/blog-form";
import { todayInSeoul } from "@/lib/admin-client/post-editing";
import { requireAdminPage } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { absolute: "새 글 - admin" },
};

export default async function AdminNewPostPage() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader title="새 글" />
      <BlogForm defaultDate={todayInSeoul()} />
    </>
  );
}
