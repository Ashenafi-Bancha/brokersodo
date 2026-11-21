import { describe, expect, it } from "vitest";
import { inquirySchema, submissionSchema, wantedSchema } from "@/lib/validators/public-forms";
import { listingFormSchema, settingsSchema } from "@/lib/validators/admin";
import {
  attributeSchemaSchema,
  formatAttributeValue,
  validateAttributes,
  type AttributeField,
} from "@/lib/validators/attribute-schema";
import { buildQuery, parseListingParams } from "@/lib/listing-params";

describe("inquirySchema", () => {
  it("normalises the phone and defaults", () => {
    const r = inquirySchema.parse({ name: "Abebe", phone: "0911 22 33 44" });
    expect(r.phone).toBe("+251911223344");
    expect(r.preferredContact).toBe("CALL");
  });
  it("returns message codes for bad input", () => {
    const r = inquirySchema.safeParse({ name: "A", phone: "123" });
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toContain("name.min");
    expect(msgs).toContain("phone.invalid");
  });
  it("honeypot must be empty", () => {
    expect(inquirySchema.safeParse({ name: "Abebe", phone: "0911223344", website: "spam" }).success).toBe(false);
  });
});

describe("wantedSchema", () => {
  it("rejects budget min > max", () => {
    const r = wantedSchema.safeParse({ name: "Rahel", phone: "0912345678", dealType: "RENT", description: "2 bedroom house near the university", budgetMin: "20k", budgetMax: "10k" });
    expect(r.success).toBe(false);
  });
  it("parses k/m budgets", () => {
    const r = wantedSchema.parse({ name: "Rahel", phone: "0912345678", dealType: "SALE", description: "Automatic Vitz 2010 or newer", budgetMax: "1.6m" });
    expect(r.budgetMax).toBe(1_600_000);
  });
});

describe("submissionSchema", () => {
  it("sets rentPeriod only for rentals", () => {
    const base = { categoryId: "c1", title: "Shop for rent", name: "Aster", phone: "0917654321" };
    expect(submissionSchema.parse({ ...base, dealType: "RENT" }).rentPeriod).toBe("MONTH");
    expect(submissionSchema.parse({ ...base, dealType: "SALE", rentPeriod: "DAY" }).rentPeriod).toBeNull();
  });
});

describe("listingFormSchema", () => {
  const base = { titleEn: "Toyota Vitz 2012", categoryId: "c1", dealType: "SALE" as const };
  it("requires a price unless price on request", () => {
    expect(listingFormSchema.safeParse(base).success).toBe(false);
    expect(listingFormSchema.safeParse({ ...base, priceOnRequest: true }).success).toBe(true);
    expect(listingFormSchema.parse({ ...base, price: "1.45m" }).price).toBe(1_450_000);
  });
  it("requires a rent period for rentals", () => {
    expect(listingFormSchema.safeParse({ ...base, dealType: "RENT", price: 12000 }).success).toBe(false);
    expect(listingFormSchema.safeParse({ ...base, dealType: "RENT", rentPeriod: "MONTH", price: 12000 }).success).toBe(true);
  });
  it("only accepts YouTube links", () => {
    expect(listingFormSchema.safeParse({ ...base, price: 1, videoUrl: "https://evil.example/x" }).success).toBe(false);
    expect(listingFormSchema.safeParse({ ...base, price: 1, videoUrl: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
  });
  it("normalises owner phone", () => {
    expect(listingFormSchema.parse({ ...base, price: 1, ownerPhone: "0916000111" }).ownerPhone).toBe("+251916000111");
  });
});

describe("settingsSchema", () => {
  it("strips @ and t.me from telegram username", () => {
    const r = settingsSchema.parse({ businessName: "BrokerSodo", phonePrimary: "0900000000", whatsappNumber: "0900000000", telegramUsername: "https://t.me/BrokerSodo", mapLat: 6.85, mapLng: 37.75 });
    expect(r.telegramUsername).toBe("BrokerSodo");
  });
});

describe("attribute schemas", () => {
  const fields: AttributeField[] = [
    { key: "year", labelEn: "Year", type: "year", filterable: true, showOnCard: true, required: true },
    { key: "mileage", labelEn: "Mileage", type: "number", unit: "km", filterable: true, showOnCard: true, required: false },
    { key: "transmission", labelEn: "Transmission", type: "select", options: [{ value: "automatic", labelEn: "Automatic", labelAm: "አውቶማቲክ" }, { value: "manual", labelEn: "Manual" }], filterable: true, showOnCard: true, required: false },
    { key: "libre", labelEn: "Libre", type: "boolean", filterable: false, showOnCard: false, required: false },
  ];

  it("validates and coerces values, stripping unknown keys", () => {
    const r = validateAttributes(fields, { year: "2015", mileage: "82000", transmission: "automatic", libre: "true", hacker: "<script>" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ year: 2015, mileage: 82000, transmission: "automatic", libre: true });
  });
  it("enforces required and select options", () => {
    expect(validateAttributes(fields, { transmission: "automatic" }).ok).toBe(false);
    expect(validateAttributes(fields, { year: 2015, transmission: "cvt" }).ok).toBe(false);
  });
  it("formats values for display", () => {
    expect(formatAttributeValue(fields[1], 82000)).toBe("82,000 km");
    expect(formatAttributeValue(fields[2], "automatic", "am")).toBe("አውቶማቲክ");
    expect(formatAttributeValue(fields[3], true)).toBe("Yes");
  });
  it("schema builder output is validated (duplicate keys, empty options)", () => {
    expect(attributeSchemaSchema.safeParse([fields[0], fields[0]]).success).toBe(false);
    expect(attributeSchemaSchema.safeParse([{ ...fields[2], options: [] }]).success).toBe(false);
    expect(attributeSchemaSchema.safeParse([{ ...fields[0], key: "Bad Key" }]).success).toBe(false);
    expect(attributeSchemaSchema.safeParse(fields).success).toBe(true);
  });
});

describe("listing URL params", () => {
  it("round-trips filter state", () => {
    const p = parseListingParams({ q: "vitz", deal: "sale", min: "100000", area: "arada", f_year_min: "2010", f_transmission: "automatic", page: "2", sort: "price_asc" });
    expect(p).toMatchObject({ q: "vitz", deal: "sale", min: 100000, area: "arada", page: 2, sort: "price_asc", attrs: { year_min: "2010", transmission: "automatic" } });
    const qs = new URLSearchParams(buildQuery(p).slice(1));
    expect(Object.fromEntries(qs)).toMatchObject({ q: "vitz", deal: "sale", min: "100000", area: "arada", f_year_min: "2010", f_transmission: "automatic", page: "2", sort: "price_asc" });
  });
  it("ignores invalid values", () => {
    const p = parseListingParams({ deal: "steal", sort: "random", area: "../../etc", page: "-4", "f_bad key": "x" });
    expect(p.deal).toBeUndefined();
    expect(p.sort).toBeUndefined();
    expect(p.area).toBeUndefined();
    expect(p.page).toBe(1);
    expect(p.attrs).toEqual({});
  });
});
