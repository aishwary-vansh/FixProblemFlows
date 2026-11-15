import { useId } from "react";

/**
 * The FixFlow mark: an F whose middle bar is a tick (report it, fix it, confirm it),
 * on the brand gradient. Same drawing as public/logo.svg; keep the two in step.
 */
const LogoMark = ({ size = 32, className }: { size?: number; className?: string }) => {
    // Each copy on the page needs its own gradient id.
    const gradient = `ff-tile-${useId().replace(/:/g, "")}`;
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#FBBF24" />
                    <stop offset="0.5" stopColor="#F472B6" />
                    <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill={`url(#${gradient})`} />
            <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 49 V25 Q21 15 31 15 H45" strokeWidth="8.5" />
                <path d="M21 33 H26.5 L31.5 38 L44 25.5" strokeWidth="7.5" />
            </g>
        </svg>
    );
};

export default LogoMark;
