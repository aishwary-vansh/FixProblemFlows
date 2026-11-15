import { useState } from "react";

export interface ColumnPoint {
    /** Short axis label, e.g. "15 Nov". */
    label: string;
    value: number;
}

/**
 * A single-series column chart: one accent color, thin columns with a 2px gap, rounded tops on the baseline,
 * a hover/focus tooltip, and a table view for screen readers and anyone who wants the numbers.
 */
const ColumnChart = ({ title, unit, points }: { title: string; unit: string; points: ColumnPoint[] }) => {
    const [active, setActive] = useState<number | null>(null);
    const max = Math.max(1, ...points.map((point) => point.value));
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const middle = Math.floor((points.length - 1) / 2);
    const shown = new Set([0, middle, points.length - 1]);
    const activePoint = active === null ? null : points[active];

    // Keep the tooltip inside the chart at both edges.
    const tooltipShift = active === null ? "-50%" : active < points.length * 0.15 ? "0%" : active > points.length * 0.85 ? "-100%" : "-50%";

    return (
        <figure className="fx-panel fx-colchart">
            <figcaption className="fx-colchart-head">
                <h3>{title}</h3>
                <span>
                    {total} {unit} · peak {max === 1 && total === 0 ? 0 : max}
                </span>
            </figcaption>

            <div className="fx-colchart-area">
                <span className="fx-colchart-max" aria-hidden="true">{total === 0 ? "" : max}</span>
                <div className="fx-colchart-plot" onMouseLeave={() => setActive(null)} aria-hidden="true">
                    {points.map((point, index) => (
                        <div
                            key={point.label}
                            className={"fx-colchart-col" + (active === index ? " active" : "")}
                            onMouseEnter={() => setActive(index)}
                        >
                            <span className="fx-colchart-bar" style={{ height: `${(point.value / max) * 100}%` }} />
                        </div>
                    ))}
                </div>
                {activePoint && (
                    <div
                        className="fx-colchart-tip"
                        role="status"
                        style={{ left: `${((active! + 0.5) / points.length) * 100}%`, transform: `translateX(${tooltipShift})` }}
                    >
                        <strong>{activePoint.value}</strong> {unit}
                        <span>{activePoint.label}</span>
                    </div>
                )}
                <div className="fx-colchart-x" aria-hidden="true">
                    {points.map((point, index) => (
                        <span key={point.label}>{shown.has(index) ? point.label : ""}</span>
                    ))}
                </div>
            </div>

            <details className="fx-colchart-table">
                <summary>Show as table</summary>
                <table className="fx-table">
                    <thead>
                        <tr>
                            <th>{points.length > 12 ? "Day" : "Month"}</th>
                            <th>{unit[0].toUpperCase() + unit.slice(1)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {points.map((point) => (
                            <tr key={point.label}>
                                <td>{point.label}</td>
                                <td>{point.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </figure>
    );
};

export default ColumnChart;
