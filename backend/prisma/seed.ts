/**
 * Demo data: one organization with a user for every role and a spread of issues.
 * Safe to re-run: existing demo users are reused and demo issues are recreated.
 *
 *   npm run seed
 *
 * Every demo account uses the password in DEMO_PASSWORD below.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type { IssueCategory, IssueStatus, OrgRole, Priority, TechnicianSpecialization } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDueAt, SLA_OPEN_STATUSES } from "../src/domain/sla.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const DEMO_PASSWORD = "Demo@1234";
const ORG = { name: "Sunrise Hostel (Demo)", slug: "sunrise-demo", joinCode: "sunrise-demo-join-link" };

const locations: { name: string; floors: string[] }[] = [
    { name: "Block A", floors: ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor"] },
    { name: "Block B", floors: ["Ground Floor", "1st Floor", "2nd Floor"] },
    { name: "Mess", floors: [] },
    { name: "Grounds", floors: [] },
];

const people: { key: string; name: string; email: string; role: OrgRole; specialization?: TechnicianSpecialization }[] = [
    { key: "owner", name: "Olivia Owner", email: "owner@demo.fixflow.app", role: "OWNER" },
    { key: "admin", name: "Arjun Admin", email: "admin@demo.fixflow.app", role: "ADMIN" },
    { key: "ravi", name: "Ravi Plumber", email: "ravi@demo.fixflow.app", role: "TECHNICIAN", specialization: "PLUMBING" },
    { key: "meena", name: "Meena Electrician", email: "meena@demo.fixflow.app", role: "TECHNICIAN", specialization: "ELECTRICAL" },
    { key: "sam", name: "Sam Student", email: "sam@demo.fixflow.app", role: "REQUESTER" },
    { key: "priya", name: "Priya Resident", email: "priya@demo.fixflow.app", role: "REQUESTER" },
];

const issues: {
    title: string;
    description: string;
    location: string;
    category: IssueCategory;
    priority: Priority;
    status: IssueStatus;
    reporter: string;
    assignee?: string;
}[] = [
    { title: "Bathroom tap leaking", description: "Cold water tap keeps dripping even when fully closed.", location: "Block A, Room 204", category: "PLUMBING", priority: "MEDIUM", status: "NEW", reporter: "sam" },
    { title: "Corridor light flickering", description: "Tube light near the stairs flickers all night.", location: "Block A, Floor 2 corridor", category: "ELECTRICAL", priority: "LOW", status: "NEW", reporter: "priya" },
    { title: "No water in washroom", description: "No water supply in the common washroom since morning.", location: "Block B, Floor 1", category: "PLUMBING", priority: "CRITICAL", status: "ASSIGNED", reporter: "priya", assignee: "ravi" },
    { title: "Power socket sparking", description: "Socket next to the study table sparks when plugging in a charger.", location: "Block B, Room 112", category: "ELECTRICAL", priority: "HIGH", status: "ACCEPTED", reporter: "sam", assignee: "meena" },
    { title: "Geyser not heating", description: "Geyser switches on but the water stays cold.", location: "Block A, Room 310", category: "ELECTRICAL", priority: "MEDIUM", status: "IN_PROGRESS", reporter: "priya", assignee: "meena" },
    { title: "Blocked kitchen sink", description: "Mess kitchen sink drains very slowly and smells.", location: "Mess kitchen", category: "PLUMBING", priority: "HIGH", status: "RESOLVED", reporter: "sam", assignee: "ravi" },
    { title: "Fan regulator broken", description: "Ceiling fan runs only at full speed; regulator knob is loose.", location: "Block B, Room 105", category: "ELECTRICAL", priority: "LOW", status: "CLOSED", reporter: "priya", assignee: "meena" },
    { title: "Door hinge loose", description: "Main door of the room does not close properly.", location: "Block A, Room 101", category: "CARPENTRY", priority: "MEDIUM", status: "REOPENED", reporter: "sam", assignee: "ravi" },
    { title: "Wi-Fi down on floor 3", description: "No Wi-Fi signal anywhere on the third floor.", location: "Block A, Floor 3", category: "IT", priority: "HIGH", status: "NEW", reporter: "priya" },
    { title: "Cracked window pane", description: "Window glass is cracked after the storm.", location: "Reading room", category: "CIVIL", priority: "MEDIUM", status: "NEW", reporter: "sam" },
];

async function main() {
    // The demo org has well-known passwords and a public join link; it must never reach real users.
    if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to seed demo data into a production database.");
    }

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const org = await prisma.organization.upsert({
        where: { slug: ORG.slug },
        update: { name: ORG.name, joinCode: ORG.joinCode },
        create: ORG,
    });

    const userIds = new Map<string, number>();
    for (const person of people) {
        const user = await prisma.user.upsert({
            where: { email: person.email },
            update: { name: person.name, passwordHash, isActive: true },
            create: { name: person.name, email: person.email, phone: "9876543210", passwordHash },
        });
        userIds.set(person.key, user.id);

        await prisma.membership.upsert({
            where: { orgId_userId: { orgId: org.id, userId: user.id } },
            update: { role: person.role, specialization: person.specialization ?? null, isActive: true },
            create: { orgId: org.id, userId: user.id, role: person.role, specialization: person.specialization ?? null },
        });
    }

    await prisma.issue.deleteMany({ where: { orgId: org.id } });

    await prisma.location.deleteMany({ where: { orgId: org.id } });
    const buildingIds = new Map<string, number>();
    for (const { name, floors } of locations) {
        const building = await prisma.location.create({
            data: {
                orgId: org.id,
                name,
                floors: { create: floors.map((floor) => ({ orgId: org.id, name: floor })) },
            },
        });
        buildingIds.set(name, building.id);
    }

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    for (const [index, issue] of issues.entries()) {
        const { reporter, assignee, ...data } = issue;
        const done = data.status === "RESOLVED" || data.status === "CLOSED";
        // Spread over the past days so the reports have something to show.
        const createdAt = new Date(now - (index + 1) * 24 * HOUR);
        const building = [...buildingIds].find(([name]) => data.location.startsWith(name));

        const created = await prisma.issue.create({
            data: {
                ...data,
                orgId: org.id,
                reporterId: userIds.get(reporter)!,
                assigneeId: assignee ? userIds.get(assignee)! : null,
                locationId: building ? building[1] : null,
                createdAt,
                dueAt: SLA_OPEN_STATUSES.includes(data.status) ? getDueAt(data.priority, new Date()) : null,
                resolutionNote: done ? "Fixed and tested on site." : null,
                resolvedAt: done ? new Date(createdAt.getTime() + (index + 2) * 3 * HOUR) : null,
                rating: data.status === "CLOSED" ? 4 : null,
                repairCost: done ? 250 : null,
            },
        });
        await prisma.issueEvent.create({
            data: { orgId: org.id, issueId: created.id, actorId: created.reporterId, type: "CREATED", toStatus: "NEW" },
        });
    }

    console.log(`Seeded "${org.name}" with ${people.length} users and ${issues.length} issues.`);
    console.log(`Log in as any of these with password ${DEMO_PASSWORD}:`);
    for (const person of people) console.log(`  ${person.role.padEnd(10)} ${person.email}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
