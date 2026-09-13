import type { ZodError } from "zod";

export interface ActionResult {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function ok(message: string): ActionResult {
  return { success: true, message };
}

export function fail(message: string): ActionResult {
  return { success: false, message };
}

/** Zod errors -> first field error message (with Swahili copy already in schemas). */
export function zodMessage(err: ZodError): string {
  const fieldErrors = err.flatten().fieldErrors;
  const first = Object.values(fieldErrors).flat()[0];
  return first ?? "Data si sahihi. Tafadhali angalia upya.";
}

export function parseZod<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: unknown } }, value: unknown): ActionResult & { data?: T } {
  const res = schema.safeParse(value);
  if (!res.success) {
    if (!("error" in res) || !res.error || typeof (res.error as ZodError).flatten !== "function") {
      return { success: false, message: "Data si sahihi. Tafadhali angalia upya." };
    }
    const err = res.error as ZodError;
    return { success: false, message: zodMessage(err), fieldErrors: fieldErrorMap(err) };
  }
  return { success: true, message: "", data: res.data };
}

function fieldErrorMap(err: ZodError): Record<string, string> {
  const fe = err.flatten().fieldErrors;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fe)) {
    if (v && v.length > 0) out[k] = v[0];
  }
  return out;
}

export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}