import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProfileForm } from "@/components/admin/profile-form";
import { requireAdminPage } from "@/lib/auth/require-admin";
import { getProfile } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: { absolute: "home - admin" },
};

export default async function AdminHomePage() {
  await requireAdminPage();
  const profile = await getProfile(true);
  return (
    <>
      <AdminPageHeader title="home" />
      <ProfileForm profile={profile} section="home" />
    </>
  );
}
