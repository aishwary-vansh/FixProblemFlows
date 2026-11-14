import { describe, expect, it } from "vitest";
import { formatIssueLocation, parseLocationList } from "./locations.js";

describe("parseLocationList", () => {
    it("reads buildings with and without floors", () => {
        expect(parseLocationList("Block A: Ground, 1st, 2nd\nMess\n")).toEqual([
            { name: "Block A", floors: ["Ground", "1st", "2nd"] },
            { name: "Mess", floors: [] },
        ]);
    });

    it("handles Windows line endings and blank lines", () => {
        expect(parseLocationList("  Block A : 1st \r\n\r\n   \r\nMess\r\n")).toEqual([
            { name: "Block A", floors: ["1st"] },
            { name: "Mess", floors: [] },
        ]);
    });

    it("merges repeated buildings and drops repeated floors, ignoring case", () => {
        expect(parseLocationList("Block A: 1st\nblock a: 1ST, 2nd")).toEqual([
            { name: "Block A", floors: ["1st", "2nd"] },
        ]);
    });

    it("skips lines with no building name", () => {
        expect(parseLocationList(": Ground, 1st")).toEqual([]);
    });
});

describe("formatIssueLocation", () => {
    it("joins building, floor and spot", () => {
        const place = { name: "2nd Floor", parent: { name: "Block A" } };
        expect(formatIssueLocation(place, "Room 204")).toBe("Block A · 2nd Floor · Room 204");
    });

    it("works for a building with no floor picked", () => {
        expect(formatIssueLocation({ name: "Mess", parent: null }, "Kitchen sink")).toBe("Mess · Kitchen sink");
    });

    it("keeps only the typed spot for Other", () => {
        expect(formatIssueLocation(null, "Near main gate")).toBe("Near main gate");
    });
});
