"use client";

import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { toValueItems } from "@/lib/admin-client/draft";
import { schemaResolver } from "@/lib/admin-client/form-errors";
import { useAdminForm } from "@/lib/admin-client/use-admin-form";
import {
  type ProfileFormValues,
  profileSectionFormSchema,
} from "@/schemas/portfolio.schema";
import type { Profile } from "@/types/portfolio";
import { ConfirmDialog } from "./confirm-dialog";
import { FormActionBar } from "./form-parts";
import { LeaveDialog } from "./leave-dialog";
import { StringListEditor } from "./string-list-editor";
import { TextAreaField, TextField } from "./text-fields";

function toValues(profile: Profile): ProfileFormValues {
  return {
    ...profile,
    github: profile.github ?? "",
    skills: toValueItems(profile.skills),
    tools: toValueItems(profile.tools),
  };
}

export type ProfileSection = "home" | "about" | "contact";

const SECTION_HREFS: Record<ProfileSection, string> = {
  home: "/admin",
  about: "/admin/about",
  contact: "/admin/contact",
};

const SECTION_RESOLVERS = {
  home: schemaResolver(profileSectionFormSchema("home")),
  about: schemaResolver(profileSectionFormSchema("about")),
  contact: schemaResolver(profileSectionFormSchema("contact")),
};

export function ProfileForm({
  profile,
  section,
}: {
  profile: Profile;
  section: ProfileSection;
}) {
  const href = SECTION_HREFS[section];
  const [discardOpen, setDiscardOpen] = useState(false);

  const form = useAdminForm({
    // 섹션마다 화면에 그리고 전송하는 항목이 달라 한 탭의 저장이 다른 탭 항목을 덮어쓰지 않음
    resolver: SECTION_RESOLVERS[section],
    defaultValues: toValues(profile),
    save: (input) => adminRequest<Profile>("PUT", "/api/admin/profile", input),
    onSaved: toValues,
    listHref: href,
  });

  return (
    <FormProvider {...form.methods}>
      <form
        ref={form.formRef}
        noValidate
        aria-busy={form.saving}
        onSubmit={form.submit}
        className="space-y-24"
      >
        {section === "home" && (
          <>
            <TextField id="profile-name" name="name" label="이름" required />
            <TextField id="profile-title" name="title" label="직함" required />
            <TextAreaField
              id="profile-tagline"
              name="tagline"
              label="tagline"
              required
              hint="줄바꿈이 그대로 저장됩니다."
              maxLength={5000}
            />
            <TextAreaField
              id="profile-description"
              name="description"
              label="소개"
              required
              maxLength={5000}
            />
          </>
        )}
        {section === "contact" && (
          <>
            <TextField
              id="profile-email"
              name="email"
              label="이메일"
              type="email"
              required
            />
            <TextField
              id="profile-github"
              name="github"
              label="GitHub 주소"
              type="url"
              required
            />
          </>
        )}
        {section === "about" && (
          <>
            <StringListEditor
              name="skills"
              legend="스킬 (순서가 첫 화면 순환 단어 순서이며 about의 .stack에도 표시됩니다)"
              itemLabel="스킬"
              hint="한 항목에 기술 하나씩 입력하세요."
            />
            <StringListEditor
              name="tools"
              legend="툴 (공개 about의 .tools에 표시됩니다)"
              itemLabel="툴"
            />
          </>
        )}
        <FormActionBar
          saving={form.saving}
          onDiscard={() => setDiscardOpen(true)}
          discardDisabled={!form.dirty || form.saving}
        />
        <LeaveDialog guard={form.leaveGuard} />
        <ConfirmDialog
          open={discardOpen}
          title="변경을 취소할까요?"
          description={
            <p>
              저장하지 않은 변경 사항을 버리고 마지막 저장값으로 되돌립니다.
            </p>
          }
          confirmLabel="변경 취소"
          busyLabel="되돌리는 중..."
          cancelLabel="계속 편집"
          onConfirm={async () => {
            form.discard();
            return null;
          }}
          onClose={() => setDiscardOpen(false)}
        />
      </form>
    </FormProvider>
  );
}
