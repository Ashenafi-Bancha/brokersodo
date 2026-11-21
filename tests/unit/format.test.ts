import { describe, expect, it } from "vitest";
import {
  formatETB,
  formatETBCompact,
  formatPhoneDisplay,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
  parsePrice,
  phoneDigits,
  relativeTime,
  rentSuffix,
} from "@/lib/format";

describe("formatETB", () => {
  it("formats with thousands separators and ETB", () => {
    expect(formatETB(1250000)).toBe("1,250,000 ETB");
    expect(formatETB(0)).toBe("0 ETB");
    expect(formatETB(999.6)).toBe("1,000 ETB");
  });
  it("can omit the suffix", () => expect(formatETB(12000, { suffix: false })).toBe("12,000"));
  it("returns empty for null/undefined", () => {
    expect(formatETB(null)).toBe("");
    expect(formatETB(undefined)).toBe("");
  });
  it("compact format", () => {
    expect(formatETBCompact(1_250_000)).toBe("1.25M ETB");
    expect(formatETBCompact(250_000)).toBe("250K ETB");
    expect(formatETBCompact(900)).toBe("900 ETB");
  });
});

describe("rentSuffix", () => {
  it("localises the period", () => {
    expect(rentSuffix("MONTH")).toBe("/ month");
    expect(rentSuffix("DAY", "am")).toBe("/ በቀን");
    expect(rentSuffix(null)).toBe("");
  });
});

describe("parsePrice", () => {
  it.each([
    ["1,250,000", 1_250_000],
    ["1.2m", 1_200_000],
    ["250k", 250_000],
    ["45000 ETB", 45_000],
    [" 900K ", 900_000],
    [12000, 12_000],
  ])("parses %s", (input, expected) => expect(parsePrice(input)).toBe(expected));
  it("rejects garbage", () => {
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("1.2.3")).toBeNull();
  });
});

describe("Ethiopian phone numbers", () => {
  it.each([
    ["0911223344", "+251911223344"],
    ["0911 22 33 44", "+251911223344"],
    ["+251911223344", "+251911223344"],
    ["251911223344", "+251911223344"],
    ["00251911223344", "+251911223344"],
    ["911223344", "+251911223344"],
    ["(091) 122-3344", "+251911223344"],
    ["0712345678", "+251712345678"],
    ["+251 712 345 678", "+251712345678"],
  ])("normalises %s", (input, expected) => expect(normalizeEthiopianPhone(input)).toBe(expected));

  it.each(["", "12345", "0811223344", "091122334", "09112233445", "+1 555 123 4567", "0111234567"])("rejects %s", (input) => {
    expect(normalizeEthiopianPhone(input)).toBeNull();
    expect(isValidEthiopianPhone(input)).toBe(false);
  });

  it("formats for display and wa.me", () => {
    expect(formatPhoneDisplay("0911223344")).toBe("+251 91 122 3344");
    expect(phoneDigits("0911223344")).toBe("251911223344");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("english", () => {
    expect(relativeTime(new Date("2026-11-20T11:59:50Z"), "en", now)).toBe("just now");
    expect(relativeTime(new Date("2026-11-20T09:00:00Z"), "en", now)).toBe("3 hours ago");
    expect(relativeTime(new Date("2026-11-18T12:00:00Z"), "en", now)).toBe("2 days ago");
  });
  it("amharic", () => {
    expect(relativeTime(new Date("2026-11-20T09:00:00Z"), "am", now)).toBe("ከ3 ሰዓት በፊት");
    expect(relativeTime(new Date("2026-11-20T11:59:59Z"), "am", now)).toBe("አሁን");
  });
});
