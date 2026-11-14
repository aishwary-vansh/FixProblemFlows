import { describe, expect, it } from "vitest";
import { scopeArgs } from "./tenantScope.js";

const ORG = 7;

describe("scopeArgs", () => {
    it.each(["findMany", "findFirst", "findUnique", "count", "groupBy", "deleteMany", "delete"])(
        "pins %s to the org",
        (operation) => {
            const scoped = scopeArgs(operation, { where: { id: 1 } }, ORG);
            expect(scoped.where).toEqual({ id: 1, orgId: ORG });
        }
    );

    it("adds a where clause when the query has none", () => {
        expect(scopeArgs("findMany", undefined, ORG)).toEqual({ where: { orgId: ORG } });
    });

    it("overrides an orgId supplied by the caller in where", () => {
        const scoped = scopeArgs("findMany", { where: { orgId: 99 } }, ORG);
        expect(scoped.where.orgId).toBe(ORG);
    });

    it("stamps the org on create, ignoring a forged orgId", () => {
        const scoped = scopeArgs("create", { data: { title: "x", orgId: 99 } }, ORG);
        expect(scoped.data).toEqual({ title: "x", orgId: ORG });
    });

    it("stamps every row on createMany", () => {
        const scoped = scopeArgs("createMany", { data: [{ a: 1 }, { a: 2, orgId: 99 }] }, ORG);
        expect(scoped.data).toEqual([
            { a: 1, orgId: ORG },
            { a: 2, orgId: ORG },
        ]);
    });

    it("prevents updates from moving a row to another org", () => {
        const scoped = scopeArgs("update", { where: { id: 1 }, data: { status: "CLOSED", orgId: 99 } }, ORG);
        expect(scoped.where).toEqual({ id: 1, orgId: ORG });
        expect(scoped.data).toEqual({ status: "CLOSED" });
    });

    it("scopes both sides of an upsert", () => {
        const scoped = scopeArgs("upsert", { where: { id: 1 }, create: { a: 1, orgId: 99 }, update: { orgId: 99 } }, ORG);
        expect(scoped.where).toEqual({ id: 1, orgId: ORG });
        expect(scoped.create).toEqual({ a: 1, orgId: ORG });
        expect(scoped.update).toEqual({});
    });

    it("fails closed on operations it does not know", () => {
        expect(() => scopeArgs("someNewOperation", {}, ORG)).toThrow(/does not support/);
    });

    it("does not mutate the caller's args", () => {
        const args = { where: { id: 1 } };
        scopeArgs("findMany", args, ORG);
        expect(args).toEqual({ where: { id: 1 } });
    });
});
