"use client";

import { CheckCircle2, Loader2, AlertCircle, Circle } from "lucide-react";

export type StepState = "pending" | "running" | "completed" | "failed";

export interface TimelineStep {
  key: string;
  label: string;
  state: StepState;
}

interface WorkflowTimelineProps {
  steps: TimelineStep[];
}

export function WorkflowTimeline({ steps }: WorkflowTimelineProps) {
  return (
    <article className="panel" style={{ position: "sticky", top: "24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "18px" }}>مسار العمل الذكي</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}>
        {/* Vertical line connecting nodes */}
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "10px",
            bottom: "10px",
            width: "2px",
            background: "var(--border)",
            zIndex: 0,
          }}
        />

        {steps.map((step, idx) => {
          const isPending = step.state === "pending";
          const isRunning = step.state === "running";
          const isCompleted = step.state === "completed";
          const isFailed = step.state === "failed";

          let icon = <Circle size={18} style={{ color: "var(--muted)", fill: "var(--surface)" }} />;
          let textColor = "var(--muted)";
          let statusText = "في الانتظار";
          let statusClass = "badge--neutral";

          if (isRunning) {
            icon = <Loader2 size={18} className="animate-spin" style={{ color: "var(--blue)" }} />;
            textColor = "var(--blue)";
            statusText = "جاري المعالجة";
            statusClass = "badge--info";
          } else if (isCompleted) {
            icon = <CheckCircle2 size={18} style={{ color: "var(--green)", fill: "var(--green-soft)" }} />;
            textColor = "var(--foreground)";
            statusText = "مكتمل";
            statusClass = "badge--success";
          } else if (isFailed) {
            icon = <AlertCircle size={18} style={{ color: "var(--red)", fill: "var(--red-soft)" }} />;
            textColor = "var(--red)";
            statusText = "فشل";
            statusClass = "badge--failed";
          }

          return (
            <div key={step.key} style={{ display: "flex", gap: "12px", alignItems: "flex-start", zIndex: 1 }}>
              <div style={{ display: "grid", placeItems: "center", width: "26px", height: "26px", borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)" }}>
                {icon}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "13.5px", fontWeight: "600", color: textColor }}>
                  {step.label}
                </span>
                <span className={"badge " + statusClass} style={{ fontSize: "10px", padding: "2px 6px", alignSelf: "flex-start" }}>
                  {statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
