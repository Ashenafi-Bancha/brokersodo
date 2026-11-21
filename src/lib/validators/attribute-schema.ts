import { z } from "zod";

/**
 * A category's `attributeSchema` is an array of AttributeField.
 * Admins edit it in the visual schema builder — no code or migrations needed.
 */
export const ATTRIBUTE_TYPES = ["text", "number", "select", "boolean", "year"] as const;
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export const attributeOptionSchema = z.object({
  value: z.string().trim().min(1).max(60),
  labelEn: z.string().trim().min(1).max(80),
  labelAm: z.string().trim().max(80).optional().nullable(),
});

export const attributeFieldSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-zA-Z0-9_]*$/, "Use letters, numbers and _ (start with a lowercase letter)"),
  labelEn: z.string().trim().min(1).max(80),
  labelAm: z.string().trim().max(80).optional().nullable(),
  type: z.enum(ATTRIBUTE_TYPES),
  options: z.array(attributeOptionSchema).max(60).optional(),
  unit: z.string().trim().max(20).optional().nullable(),
  filterable: z.boolean().default(false),
  showOnCard: z.boolean().default(false),
  required: z.boolean().default(false),
});

export type AttributeField = z.infer<typeof attributeFieldSchema>;
export type AttributeOption = z.infer<typeof attributeOptionSchema>;

export const attributeSchemaSchema = z
  .array(attributeFieldSchema)
  .max(40)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>();
    fields.forEach((f, i) => {
      if (seen.has(f.key)) ctx.addIssue({ code: "custom", path: [i, "key"], message: `Duplicate key "${f.key}"` });
      seen.add(f.key);
      if (f.type === "select" && (!f.options || f.options.length === 0))
        ctx.addIssue({ code: "custom", path: [i, "options"], message: "Select fields need at least one option" });
    });
  });

/** Safely parse a JSON column into a typed schema (bad data → empty). */
export function parseAttributeSchema(raw: unknown): AttributeField[] {
  const r = attributeSchemaSchema.safeParse(raw);
  return r.success ? r.data : [];
}

export type AttributeValue = string | number | boolean;
export type AttributeValues = Record<string, AttributeValue>;

const currentYear = () => new Date().getFullYear();

/** Build a Zod validator for listing attributes from a category's schema. */
export function buildAttributesValidator(fields: AttributeField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "number":
        s = z.coerce.number().finite().min(0).max(1e12);
        break;
      case "year":
        s = z.coerce.number().int().min(1900).max(currentYear() + 1);
        break;
      case "boolean":
        s = z.preprocess((v) => v === true || v === "true" || v === "on" || v === "1", z.boolean());
        break;
      case "select":
        s = z.enum((f.options?.map((o) => o.value) ?? [""]) as [string, ...string[]]);
        break;
      default:
        s = z.string().trim().max(200);
    }
    const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
    shape[f.key] = f.required && f.type !== "boolean" ? z.preprocess(emptyToUndef, s) : z.preprocess(emptyToUndef, s.optional());
  }
  // Unknown keys are stripped so attributes always match the schema.
  return z.object(shape).strip();
}

/** Validate + clean raw attribute values; returns cleaned values or field errors. */
export function validateAttributes(fields: AttributeField[], raw: unknown) {
  const r = buildAttributesValidator(fields).safeParse(raw ?? {});
  if (!r.success) return { ok: false as const, errors: r.error.flatten().fieldErrors };
  const clean: AttributeValues = {};
  for (const [k, v] of Object.entries(r.data)) if (v !== undefined) clean[k] = v as AttributeValue;
  return { ok: true as const, data: clean };
}

/** Human-readable value for cards / spec tables. */
export function formatAttributeValue(field: AttributeField, value: unknown, locale = "en"): string {
  if (value === undefined || value === null || value === "") return "";
  if (field.type === "boolean") {
    const yes = value === true || value === "true";
    return locale === "am" ? (yes ? "አዎ" : "የለም") : yes ? "Yes" : "No";
  }
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === value);
    if (opt) return (locale === "am" && opt.labelAm) || opt.labelEn;
  }
  if (field.type === "number") {
    const n = Number(value);
    const s = Number.isFinite(n) ? n.toLocaleString("en-US") : String(value);
    return field.unit ? `${s} ${field.unit}` : s;
  }
  return field.unit ? `${String(value)} ${field.unit}` : String(value);
}

export function fieldLabel(field: Pick<AttributeField, "labelEn" | "labelAm">, locale = "en") {
  return (locale === "am" && field.labelAm) || field.labelEn;
}
