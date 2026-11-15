export type FormState = { error: string; ok: string };

export const emptyForm: FormState = { error: "", ok: "" };

export function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}
