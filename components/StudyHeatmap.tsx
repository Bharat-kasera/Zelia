"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { ActivityCalendar } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";
import type { StudyLog } from "@/hooks/useStudyLogs";

interface StudyHeatmapProps {
  logs: StudyLog[];
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// 53 week-columns in a year, weekday label width ~45px
const WEEKS_IN_YEAR = 53;
const LABEL_WIDTH = 48;

export function StudyHeatmap({ logs }: StudyHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blockSize, setBlockSize] = useState(12);
  const [blockMargin, setBlockMargin] = useState(3);

  const calcSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Available width inside the container (minus padding)
    const available = el.clientWidth - 32; // 16px padding each side
    // blockSize + blockMargin per column, minus one margin
    // total = LABEL_WIDTH + WEEKS * (blockSize + margin) - margin
    // so: blockSize + margin = (available - LABEL_WIDTH + margin) / WEEKS
    // blockSize = (available - LABEL_WIDTH) / WEEKS - margin
    const margin = 4;
    const size = Math.floor((available - LABEL_WIDTH) / WEEKS_IN_YEAR - margin);
    const clamped = Math.max(10, Math.min(18, size)); // keep between 10-18px
    setBlockSize(clamped);
    setBlockMargin(margin);
  }, []);

  useEffect(() => {
    calcSize();
    const observer = new ResizeObserver(calcSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calcSize]);

  const data = useMemo(() => {
    const logMap = new Map<string, number>();
    for (const log of logs) {
      logMap.set(log.date, log.totalMinutes);
    }

    const today = new Date();
    const start = subDays(today, 365);
    const days = eachDayOfInterval({ start, end: today });

    const allMinutes = logs.map((l) => l.totalMinutes);
    const maxMinutes = allMinutes.length > 0 ? Math.max(...allMinutes) : 1;

    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const minutes = logMap.get(key) ?? 0;

      let level = 0;
      if (minutes > 0) {
        const ratio = minutes / maxMinutes;
        if (ratio <= 0.25) level = 1;
        else if (ratio <= 0.5) level = 2;
        else if (ratio <= 0.75) level = 3;
        else level = 4;
      }

      return { date: key, count: minutes, level };
    });
  }, [logs]);

  const totalSummary = useMemo(() => {
    const totalMins = logs.reduce((sum, l) => sum + l.totalMinutes, 0);
    return formatDuration(totalMins);
  }, [logs]);

  const totalDays = useMemo(() => logs.length, [logs]);

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-lg font-semibold">Study Heatmap</h2>
      <div
        ref={containerRef}
        className="rounded-xl border border-border/50 p-4"
      >
        {blockSize > 0 && (
          <ActivityCalendar
            data={data}
            colorScheme="dark"
            blockSize={blockSize}
            blockMargin={blockMargin}
            blockRadius={2}
            fontSize={12}
            weekStart={1}
            showWeekdayLabels={["mon", "wed", "fri"]}
            showTotalCount={false}
            theme={{
              dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
            }}
            labels={{
              legend: {
                less: "Less",
                more: "More",
              },
            }}
            tooltips={{
              activity: {
                text: (activity) => {
                  const dateLabel = format(parseISO(activity.date), "dd MMM yyyy");
                  if (activity.count === 0) {
                    return `No study on ${dateLabel}`;
                  }
                  return `${formatDuration(activity.count)} on ${dateLabel}`;
                },
              },
            }}
          />
        )}
      </div>
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        {totalSummary} studied across {totalDays} days in the last year
      </p>
    </div>
  );
}
