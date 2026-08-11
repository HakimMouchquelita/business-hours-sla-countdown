import * as React from "react";
import {
    Tooltip,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    IBusinessHoursConfig,
    businessMillisecondsBetween,
    formatBusinessDuration,
} from "./businessHours";

export interface ISLACountdownProps {
    deadline: Date | null;
    config: IBusinessHoursConfig;
    warningHours: number;
    dangerHours: number;
}

/**
 * Semantic status colors as explicit hex values.
 * These are intentionally not theme tokens: the red/orange/green semantics must
 * render identically in every host (form, harness, dashboard) and in both themes.
 * Neutral surfaces below still use theme tokens so dark mode works correctly.
 */
const COLOR_SUCCESS = "#0e700e";
const COLOR_WARNING = "#bc4b09";
const COLOR_DANGER = "#c50f1f";
const COLOR_NEUTRAL_ICON = "#616161";

type StatusKind = "success" | "warning" | "danger";

const ClockIcon: React.FC<{ color: string }> = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="10" cy="10" r="7.25" stroke={color} strokeWidth="1.5" />
        <path d="M10 6v4l2.5 2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckIcon: React.FC<{ color: string }> = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill={color} />
        <path d="M6.5 10.3l2.2 2.2 4.8-4.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const WarningIcon: React.FC<{ color: string }> = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M10 2.5l7.5 13H2.5L10 2.5z" fill={color} />
        <path d="M10 8v3.2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="13.6" r="0.9" fill="#fff" />
    </svg>
);

const ErrorIcon: React.FC<{ color: string }> = ({ color }) => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill={color} />
        <path d="M10 5.8v4.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10" cy="13.4" r="1" fill="#fff" />
    </svg>
);

const useStyles = makeStyles({
    wrapper: {
        display: "block",
        width: "100%",
        textAlign: "left",
    },
    root: {
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        maxWidth: "360px",
        boxSizing: "border-box",
        paddingTop: "8px",
        paddingBottom: "8px",
        paddingLeft: "12px",
        paddingRight: "14px",
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusMedium,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: tokens.colorNeutralStroke1,
        fontFamily: tokens.fontFamilyBase,
    },
    iconWrap: {
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
    },
    body: {
        display: "flex",
        flexDirection: "column",
        gap: "1px",
        minWidth: 0,
        textAlign: "left",
    },
    timeText: {
        fontSize: "20px",
        fontWeight: 700,
        lineHeight: "24px",
    },
    labelText: {
        fontSize: "12px",
        lineHeight: "16px",
        color: tokens.colorNeutralForeground2,
    },
    deadlineText: {
        fontSize: "11px",
        lineHeight: "15px",
        color: tokens.colorNeutralForeground3,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },
    empty: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        color: tokens.colorNeutralForeground3,
        fontSize: "13px",
        paddingTop: "8px",
        paddingBottom: "8px",
        paddingLeft: "12px",
        paddingRight: "12px",
        fontFamily: tokens.fontFamilyBase,
    },
});

/** Refresh faster when the deadline is close, so the value is never stale when it matters. */
function tickIntervalMs(remainingHours: number): number {
    return remainingHours < 1 ? 10000 : 30000;
}

export const SLACountdown: React.FC<ISLACountdownProps> = (props) => {
    const { deadline, config, warningHours, dangerHours } = props;
    const classes = useStyles();

    const [now, setNow] = React.useState<Date>(new Date());

    // Compute remaining time first so the tick rate can adapt to urgency.
    const remainingMs = deadline
        ? businessMillisecondsBetween(now, deadline, config)
        : 0;
    const remainingHours = Math.abs(remainingMs) / 3600000;
    const interval = tickIntervalMs(remainingHours);

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), interval);
        return () => clearInterval(timer);
    }, [interval]);

    if (!deadline) {
        return (
            <div className={classes.wrapper}>
                <div className={classes.empty}>
                    <ClockIcon color={COLOR_NEUTRAL_ICON} />
                    <span>No SLA deadline set</span>
                </div>
            </div>
        );
    }

    const isOverdue = remainingMs < 0;

    let status: StatusKind;
    let statusLabel: string;

    if (isOverdue) {
        status = "danger";
        statusLabel = "Overdue \u00b7 SLA breached";
    } else if (remainingHours < dangerHours) {
        status = "danger";
        statusLabel = "Remaining \u00b7 due very soon";
    } else if (remainingHours < warningHours) {
        status = "warning";
        statusLabel = "Remaining \u00b7 approaching deadline";
    } else {
        status = "success";
        statusLabel = "Remaining \u00b7 on track";
    }

    const accentColor =
        status === "danger" ? COLOR_DANGER : status === "warning" ? COLOR_WARNING : COLOR_SUCCESS;

    const icon =
        status === "danger" ? (
            <ErrorIcon color={accentColor} />
        ) : status === "warning" ? (
            <WarningIcon color={accentColor} />
        ) : (
            <CheckIcon color={accentColor} />
        );

    // The magnitude alone: "overdue" is carried by the label, not by a minus sign.
    const displayTime = formatBusinessDuration(remainingMs, config);

    const shortDeadline = deadline.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const fullDeadline = deadline.toLocaleString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const tooltipText =
        `Due ${fullDeadline}. Counted over business hours ` +
        `${config.startHour}:00-${config.endHour}:00 on working days only.`;

    const announcement = isOverdue
        ? `SLA breached, overdue by ${displayTime} of business time. Due ${shortDeadline}.`
        : `${displayTime} of business time remaining. Due ${shortDeadline}.`;

    return (
        <div className={classes.wrapper}>
            <Tooltip content={tooltipText} relationship="description">
                <div
                    className={classes.root}
                    style={{ borderLeftColor: accentColor }}
                    role="status"
                    aria-live="polite"
                    aria-label={announcement}
                >
                    <div className={classes.iconWrap}>{icon}</div>
                    <div className={classes.body}>
                        <span className={classes.timeText} style={{ color: accentColor }}>
                            {displayTime}
                        </span>
                        <span className={classes.labelText}>{statusLabel}</span>
                        <span className={classes.deadlineText}>Due {shortDeadline}</span>
                    </div>
                </div>
            </Tooltip>
        </div>
    );
};