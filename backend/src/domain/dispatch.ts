import type { IssueCategory, TechnicianSpecialization } from "../generated/prisma/enums.js";

export interface Candidate {
    userId: number;
    name: string;
    specialization: TechnicianSpecialization | null;
    openTasks: number;
}

export interface RankedCandidate extends Candidate {
    score: number;
    skillMatch: boolean;
    reason: string;
}

const SKILL_MATCH_POINTS = 50;
const GENERAL_SKILL_POINTS = 10;
const OPEN_TASK_PENALTY = 10;

const taskCount = (count: number) => `${count} open ${count === 1 ? "task" : "tasks"}`;

/** Scores one technician for an issue and explains the result in words people can read. */
export const scoreTechnician = (candidate: Candidate, category: IssueCategory): RankedCandidate => {
    const skillMatch = candidate.specialization === category;
    const isGeneral = candidate.specialization === "GENERAL";

    const skillPoints = skillMatch ? SKILL_MATCH_POINTS : isGeneral ? GENERAL_SKILL_POINTS : 0;
    const skill = skillMatch || isGeneral
        ? candidate.specialization!.toLowerCase()
        : `no ${category.toLowerCase()} skill`;

    return {
        ...candidate,
        score: skillPoints - candidate.openTasks * OPEN_TASK_PENALTY,
        skillMatch,
        reason: `${skill}, ${taskCount(candidate.openTasks)}`,
    };
};

/** Best technician first. Ties go to the lighter workload, then to the lower id so results are stable. */
export const rankTechnicians = (candidates: Candidate[], category: IssueCategory) =>
    candidates
        .map((candidate) => scoreTechnician(candidate, category))
        .sort((a, b) => b.score - a.score || a.openTasks - b.openTasks || a.userId - b.userId);

/** Auto-assign only on a real skill match; anything else waits for an admin. */
export const pickAutoAssignee = (candidates: Candidate[], category: IssueCategory) =>
    rankTechnicians(candidates, category).find((candidate) => candidate.skillMatch) ?? null;
