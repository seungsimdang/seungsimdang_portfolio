import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProfileForm } from "@/components/admin/profile-form";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { getProfile } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "프로필 - admin" },
};

export default async function AdminProfilePage() {
  await requireAdminPage();
  const profile = await getProfile();
  return (
    <>
      <AdminPageHeader title="프로필" />
      <ProfileForm profile={profile} />
    </>
  );
}
