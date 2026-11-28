import { describe, expect, it } from "vitest";
import { buildMessages } from "@/lib/chat/messages";

describe("buildMessages", () => {
  it("maps roles, drops notes, starts with the visitor and ends with site data", () => {
    const out = buildMessages(
      [
        { role: "AI", text: "greeting that should be dropped" },
        { role: "VISITOR", text: "Do you have houses for rent?" },
        { role: "AI", text: "Yes, here are two." },
        { role: "SYSTEM", text: "You are now talking to our team." },
        { role: "STAFF", text: "When can you visit?" },
        { role: "VISITOR", text: "Tomorrow" },
      ],
      "- House | 8,000 ETB | /listings/house-bs-h-0001",
    );
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "assistant", "user", "system"]);
    expect(out[0].content).toBe("Do you have houses for rent?");
    expect(String(out.at(-1)!.content)).toContain("<site_data>");
    expect(String(out.at(-1)!.content)).toContain("/listings/house-bs-h-0001");
  });

  it("keeps only the last 16 turns and still starts with the visitor", () => {
    const history = Array.from({ length: 40 }, (_, i) => ({ role: (i % 2 ? "AI" : "VISITOR") as "AI" | "VISITOR", text: `m${i}` }));
    const out = buildMessages(history, "");
    expect(out.length).toBeLessThanOrEqual(17);
    expect(out[0].role).toBe("user");
    expect(String(out.at(-1)!.content)).toContain("No matching site data.");
  });
});
