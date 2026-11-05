"use client";

import type { FormState } from "@/features/forms/form-state";

import type { ReadingField } from "./reading-values";

export function ReadingForm(_props: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  projectId: string;
  visitId: string;
  versionId: string;
  fields: ReadingField[];
  cancelHref: string;
}) {
  return null;
}
