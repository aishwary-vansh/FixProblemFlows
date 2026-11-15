/**
 * Creates or manages a FixFlow Console admin: the person who runs FixFlow, sees every organization and sets plans.
 * Console admins are not part of any organization, and they can only be made here, never from the web app.
 *
 *   npm run console-admin -- you@example.com            create the account (or make an existing one a console admin)
 *   npm run console-admin -- you@example.com --reset    give it a new password
 *   npm run console-admin -- you@example.com --remove   take console access away
 *
 * New and reset passwords are random and printed once here. To manage the live database,
 * run it on your computer with DATABASE_URL set to the hosted database.
 */
import { randomBytes } from "node:crypto";
import prisma from "../src/config/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const [email, flag] = process.argv.slice(2).map((arg) => arg.trim());

const newPassword = () => randomBytes(12).toString("base64url");

const main = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || (flag && flag !== "--reset" && flag !== "--remove")) {
        console.error("Usage: npm run console-admin -- <email> [--reset | --remove]");
        process.exitCode = 1;
        return;
    }
    const normalized = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });

    if (flag === "--remove") {
        if (!existing?.isPlatformAdmin) {
            console.log(`${normalized} is not a console admin.`);
            return;
        }
        await prisma.user.update({ where: { id: existing.id }, data: { isPlatformAdmin: false } });
        console.log(`${normalized} can no longer use the console.`);
        return;
    }

    if (!existing) {
        const password = newPassword();
        await prisma.user.create({
            data: {
                name: "FixFlow Admin",
                email: normalized,
                phone: "",
                passwordHash: await hashPassword(password),
                isPlatformAdmin: true,
            },
        });
        console.log(`Console admin created.\n  Email:    ${normalized}\n  Password: ${password}\nLog in at /console. Keep the password somewhere safe; it is not shown again.`);
        return;
    }

    if (flag === "--reset") {
        const password = newPassword();
        await prisma.user.update({
            where: { id: existing.id },
            // Setting passwordChangedAt logs out every session that used the old password.
            data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), isPlatformAdmin: true },
        });
        console.log(`New password for ${normalized}: ${password}\nIt is not shown again.`);
        return;
    }

    await prisma.user.update({ where: { id: existing.id }, data: { isPlatformAdmin: true } });
    console.log(`${normalized} is now a console admin. Log in at /console with that account's password.`);
};

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
