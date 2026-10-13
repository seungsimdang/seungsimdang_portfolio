"use client";

import { useState } from "react";
import { adminRequest } from "@/lib/admin-client/admin-request";
import { type StringItem, toStringItems } from "@/lib/admin-client/draft";
import { useAdminForm } from "@/lib/admin-client/use-admin-form";
import { validateWith } from "@/lib/admin-client/validate";
import { profileInputSchema } from "@/schemas/portfolio.schema";
import type { Profile } from "@/types/portfolio";
import { FormActionBar, FormStatus } from "./form-parts";
import { StringListEditor } from "./string-list-editor";
import { TextAreaField, TextField } from "./text-fields";

interface ProfileDraft {
  name: string;
  title: string;
  tagline: string;
  description: string;
  email: string;
  github: string;
  skills: StringItem[];
}

function toDraft(profile: Profile): ProfileDraft {
  return {
    ...profile,
    github: profile.github ?? "",
    skills: toStringItems(profile.skills),
  };
}

function toInput(draft: ProfileDraft) {
  return { ...draft, skills: draft.skills.map((item) => item.value) };
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState(() => toDraft(profile));
  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const form = useAdminForm({
    draft,
    setDraft,
    validate: (d) => validateWith(profileInputSchema, toInput(d)),
    save: (input) => adminRequest<Profile>("PUT", "/api/admin/profile", input),
    onSaved: toDraft,
    listHref: "/admin",
  });
  const { errors } = form;

  return (
    <form
      ref={form.formRef}
      noValidate
      aria-busy={form.saving}
      onSubmit={form.submit}
      className="space-y-24"
    >
      <FormStatus notice={form.notice} />
      <TextField
        id="profile-name"
        label="이름"
        required
        value={draft.name}
        error={errors.name}
        onChange={(v) => set("name", v)}
      />
      <TextField
        id="profile-title"
        label="직함"
        required
        value={draft.title}
        error={errors.title}
        onChange={(v) => set("title", v)}
      />
      <TextAreaField
        id="profile-tagline"
        label="tagline"
        required
        hint="줄바꿈이 그대로 저장됩니다."
        maxLength={5000}
        value={draft.tagline}
        error={errors.tagline}
        onChange={(v) => set("tagline", v)}
      />
      <TextAreaField
        id="profile-description"
        label="소개"
        required
        maxLength={5000}
        value={draft.description}
        error={errors.description}
        onChange={(v) => set("description", v)}
      />
      <TextField
        id="profile-email"
        label="이메일"
        type="email"
        required
        value={draft.email}
        error={errors.email}
        onChange={(v) => set("email", v)}
      />
      <TextField
        id="profile-github"
        label="GitHub 주소"
        type="url"
        required
        value={draft.github}
        error={errors.github}
        onChange={(v) => set("github", v)}
      />
      <StringListEditor
        legend="스킬 (순서가 첫 화면 순환 단어 순서입니다)"
        itemLabel="스킬"
        items={draft.skills}
        onChange={(skills) => set("skills", skills)}
        errors={errors}
        path="skills"
      />
      <FormActionBar
        saving={form.saving}
        notice={form.notice}
        cancelHref="/admin"
      />
    </form>
  );
}
