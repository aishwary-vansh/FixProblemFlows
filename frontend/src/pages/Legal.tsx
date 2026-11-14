import type { ReactNode } from "react";
import { Link } from "react-router-dom";

// Set VITE_CONTACT_EMAIL to the address that handles privacy and account questions.
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;
const LAST_UPDATED = "4 November 2026";

const CSS = `
.fl{--bg:#fff;--tx:#111;--mut:#5b5b66;--bd:#e4e4e7;min-height:100vh;background:var(--bg);color:var(--tx);font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif;padding:48px 16px}
@media(prefers-color-scheme:dark){.fl{--bg:#0b0a14;--tx:#f5f5f7;--mut:#a1a1aa;--bd:#2b2a3a}}
.fl article{max-width:720px;margin:0 auto;line-height:1.65;font-size:15.5px}
.fl h1{font-size:30px;letter-spacing:-.02em;margin:0 0 6px}
.fl h2{font-size:18px;margin:32px 0 8px}
.fl p,.fl li{color:var(--mut)}
.fl ul{padding-left:20px}
.fl a{color:var(--tx);font-weight:600}
.fl .fl-top{display:flex;gap:16px;margin-bottom:32px;font-size:14px}
.fl .fl-meta{font-size:13.5px;color:var(--mut);margin:0 0 24px}
`;

const contact = CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
) : (
    "the administrator of your organization"
);

const LegalPage = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className="fl">
        <style>{CSS}</style>
        <article>
            <nav className="fl-top" aria-label="Legal">
                <Link to="/">FixFlow home</Link>
                <Link to="/terms">Terms of Service</Link>
                <Link to="/privacy">Privacy Policy</Link>
            </nav>
            <h1>{title}</h1>
            <p className="fl-meta">Last updated {LAST_UPDATED}</p>
            {children}
        </article>
    </div>
);

export const Terms = () => (
    <LegalPage title="Terms of Service">
        <p>
            FixFlow is a tool organizations such as hostels, colleges, offices and housing societies use to report and track
            maintenance work. By creating an account or joining an organization you agree to these terms.
        </p>

        <h2>Accounts</h2>
        <ul>
            <li>Give accurate details and keep your password private. You are responsible for what is done with your account.</li>
            <li>The person who creates an organization is its owner. Owners and admins decide who can join and what role each person has.</li>
            <li>An admin can deactivate your membership in their organization at any time.</li>
        </ul>

        <h2>Acceptable use</h2>
        <ul>
            <li>Report real maintenance problems only. Don't post false reports, abuse, or other people's personal information.</li>
            <li>Only upload photos you have the right to share, and keep people out of them where you can.</li>
            <li>Don't try to access other organizations' data, overload the service, or get around its security.</li>
        </ul>

        <h2>Your content</h2>
        <p>
            You keep ownership of the reports, comments and photos you add. You allow FixFlow to store and show them to the
            people in your organization so the work can get done.
        </p>

        <h2>The service</h2>
        <p>
            FixFlow is provided as it is. We work to keep it available and your data safe, but we can't promise it will never
            be interrupted. FixFlow tracks maintenance work; it is not an emergency service. For fire, gas leaks, electrical
            hazards or anything dangerous, contact emergency services and your building's staff directly.
        </p>
        <p>
            To the extent the law allows, FixFlow is not liable for indirect losses, or for damage caused by a repair
            itself. Repairs are carried out by your organization's staff, not by FixFlow.
        </p>

        <h2>Changes and contact</h2>
        <p>
            We may update these terms. If a change is significant we'll show a notice in the app. Questions: {contact}.
        </p>
    </LegalPage>
);

export const Privacy = () => (
    <LegalPage title="Privacy Policy">
        <p>This explains what FixFlow stores about you, why, and who can see it.</p>

        <h2>What we collect</h2>
        <ul>
            <li><strong>Account:</strong> your name, email, phone number and a scrambled (hashed) version of your password.</li>
            <li><strong>Reports:</strong> issue titles, descriptions, locations, photos, comments, ratings and the history of each issue.</li>
            <li><strong>Devices:</strong> if you turn on alerts, a push address for that browser or phone. Turning alerts off or logging out removes it.</li>
            <li><strong>Technical logs:</strong> request details such as IP address, kept for security and fixing errors.</li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
            <li>To run the service: let you log in, route your report to the right technician and tell you when it changes.</li>
            <li>To send emails you ask for, such as password reset links.</li>
            <li>To give your organization's admins reports on how maintenance is going.</li>
        </ul>
        <p>We don't sell your data, show ads, or use tracking cookies.</p>

        <h2>Who can see it</h2>
        <ul>
            <li>Admins of your organization can see all its issues and its members' names, emails and phone numbers.</li>
            <li>Technicians see the issues assigned to them. Other members see their own reports.</li>
            <li>
                Members can see the title and place of open issues so they can say "Me too". Someone who joins sees only progress:
                status, technician and what was fixed. Your description, photos, comments and name stay hidden from them.
            </li>
            <li>Other organizations can't see your data.</li>
            <li>
                Service providers that host the app, its database, file storage and email handle data only to run FixFlow.
            </li>
        </ul>

        <h2>Storage on your device</h2>
        <p>
            The app keeps your login session and your light or dark theme choice in your browser's local storage. Logging out
            removes the session.
        </p>

        <h2>How long we keep it</h2>
        <p>
            Data is kept while your organization uses FixFlow, so its maintenance history stays complete. Password reset
            links expire after 1 hour.
        </p>

        <h2>Your choices</h2>
        <p>
            You can ask to see, correct or delete your personal data by contacting {contact}. Deleting an account removes
            your profile; issues you reported may stay in your organization's history without your name.
        </p>
    </LegalPage>
);
