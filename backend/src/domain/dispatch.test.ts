import { describe, expect, it } from "vitest";
import { pickAutoAssignee, rankTechnicians, scoreTechnician } from "./dispatch.js";
import type { Candidate } from "./dispatch.js";

const ravi: Candidate = { userId: 1, name: "Ravi", specialization: "PLUMBING", openTasks: 2 };
const meena: Candidate = { userId: 2, name: "Meena", specialization: "ELECTRICAL", openTasks: 0 };
const gopal: Candidate = { userId: 3, name: "Gopal", specialization: "GENERAL", openTasks: 0 };
const newbie: Candidate = { userId: 4, name: "Newbie", specialization: null, openTasks: 0 };

describe("scoreTechnician", () => {
    it("rewards a skill match and subtracts workload", () => {
        const result = scoreTechnician(ravi, "PLUMBING");
        expect(result.score).toBe(30);
        expect(result.skillMatch).toBe(true);
        expect(result.reason).toBe("plumbing, 2 open tasks");
    });

    it("gives general technicians a small bonus but no skill match", () => {
        const result = scoreTechnician(gopal, "PLUMBING");
        expect(result.score).toBe(10);
        expect(result.skillMatch).toBe(false);
        expect(result.reason).toBe("general, 0 open tasks");
    });

    it("explains a missing skill", () => {
        expect(scoreTechnician(meena, "PLUMBING").reason).toBe("no plumbing skill, 0 open tasks");
    });

    it("handles a technician with no specialization", () => {
        expect(scoreTechnician(newbie, "HVAC").score).toBe(0);
    });

    it("uses singular for one task", () => {
        expect(scoreTechnician({ ...ravi, openTasks: 1 }, "PLUMBING").reason).toBe("plumbing, 1 open task");
    });
});

describe("rankTechnicians", () => {
    it("puts the skilled technician first despite a heavier workload", () => {
        const ranked = rankTechnicians([meena, gopal, ravi], "PLUMBING");
        expect(ranked.map((c) => c.name)).toEqual(["Ravi", "Gopal", "Meena"]);
    });

    it("lets a free generalist beat an overloaded specialist", () => {
        const ranked = rankTechnicians([{ ...ravi, openTasks: 5 }, gopal], "PLUMBING");
        expect(ranked[0]?.name).toBe("Gopal");
    });

    it("breaks ties by lower id so the order is stable", () => {
        const ranked = rankTechnicians([{ ...meena, userId: 9 }, { ...newbie, userId: 5 }], "PLUMBING");
        expect(ranked.map((c) => c.userId)).toEqual([5, 9]);
    });
});

describe("pickAutoAssignee", () => {
    it("returns the best skill match", () => {
        const second = { ...ravi, userId: 5, name: "Asha", openTasks: 0 };
        expect(pickAutoAssignee([ravi, second, gopal], "PLUMBING")?.name).toBe("Asha");
    });

    it("returns nothing when nobody has the skill", () => {
        expect(pickAutoAssignee([meena, gopal], "PLUMBING")).toBeNull();
    });

    it("still picks a skill match when a generalist outranks them", () => {
        expect(pickAutoAssignee([{ ...ravi, openTasks: 5 }, gopal], "PLUMBING")?.name).toBe("Ravi");
    });

    it("returns nothing when there are no technicians", () => {
        expect(pickAutoAssignee([], "IT")).toBeNull();
    });
});
