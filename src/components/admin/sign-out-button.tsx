"use client";

import { signOut } from "next-auth/react";
import { AdminButton } from "./admin-button";

export function SignOutButton() {
  return (
    <AdminButton onClick={() => signOut({ callbackUrl: "/admin/login" })}>
      logout
    </AdminButton>
  );
}
