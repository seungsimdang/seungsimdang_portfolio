import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TalkForm } from "@/components/admin/talk-form";
import { requireAdminPage } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: { absolute: "새 발표 - admin" },
};

export default async function AdminNewTalkPage() {
  await requireAdminPage();
  return (
    <>
      <AdminPageHeader title="새 발표" />
      <TalkForm />
    </>
  );
}
