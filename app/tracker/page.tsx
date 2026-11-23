"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  isAfter,
  parseISO,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useStudyLogs } from "@/hooks/useStudyLogs";
import { saveStudyLog, deleteStudyLog } from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { StudyHeatmap } from "@/components/StudyHeatmap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDefaultDate(): string {
  const now = new Date();
  // If between 12 AM – 4 AM, default to yesterday
  if (now.getHours() < 4) {
    return format(subDays(now, 1), "yyyy-MM-dd");
  }
  return format(now, "yyyy-MM-dd");
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Tracker Page ───────────────────────────────────────────────────────────

type ViewMode = "daily" | "weekly" | "monthly";

export default function TrackerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [selectedDate, setSelectedDate] = useState(getDefaultDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [chartPage, setChartPage] = useState(0); // 0 = latest, 1 = one page back, etc.

  // Logs display
  const [visibleCount, setVisibleCount] = useState(10);
  const LOGS_STEP = 10;

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const { logs, loading: logsLoading } = useStudyLogs(user?.uid);

  // Build log map for quick lookup
  const logMap = useMemo(() => {
    const map = new Map<string, { hours: number; minutes: number; totalMinutes: number }>();
    for (const log of logs) {
      map.set(log.date, { hours: log.hours, minutes: log.minutes, totalMinutes: log.totalMinutes });
    }
    return map;
  }, [logs]);

  // Today's log
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayLog = logMap.get(todayKey);

  // Max hours studied in a single day (all time)
  const maxStudyMinutes = useMemo(() => {
    if (logs.length === 0) return 0;
    return Math.max(...logs.map((l) => l.totalMinutes));
  }, [logs]);

  // Weekly average per day (current week, Mon–Sun)
  const weeklyAvgPerDay = useMemo(() => {
    if (logs.length === 0) return 0;
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({
      start: weekStart,
      end: today > weekEnd ? weekEnd : today,
    });
    let totalMins = 0;
    let daysWithData = 0;
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const log = logMap.get(key);
      if (log) {
        totalMins += log.totalMinutes;
        daysWithData++;
      }
    }
    // Average over elapsed days in the week (not just days with data)
    return days.length > 0 ? totalMins / days.length : 0;
  }, [logs, logMap]);

  // Chart data with pagination
  const chartData = useMemo(() => {
    if (logs.length === 0) return [];

    if (viewMode === "daily") {
      // 30 days per page
      const end = subDays(new Date(), chartPage * 30);
      const start = subDays(end, 29);
      const days = eachDayOfInterval({ start, end });
      return days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const log = logMap.get(key);
        return {
          label: format(day, "dd MMM"),
          value: log ? +(log.totalMinutes / 60).toFixed(1) : 0,
        };
      });
    }

    if (viewMode === "weekly") {
      // 12 weeks per page
      const end = subDays(new Date(), chartPage * 84);
      const start = subDays(end, 83);
      const weeks = eachWeekOfInterval({ start, end });
      return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart);
        const days = eachDayOfInterval({ start: weekStart, end: isAfter(weekEnd, end) ? end : weekEnd });
        let totalMins = 0;
        for (const day of days) {
          const log = logMap.get(format(day, "yyyy-MM-dd"));
          if (log) totalMins += log.totalMinutes;
        }
        return {
          label: `${format(weekStart, "dd MMM")}`,
          value: +(totalMins / 60).toFixed(1),
        };
      });
    }

    // Monthly — show all months (no pagination needed, usually few)
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    if (sortedLogs.length === 0) return [];
    const firstDate = parseISO(sortedLogs[sortedLogs.length - 1].date); // logs are desc
    const lastDate = parseISO(sortedLogs[0].date);
    const months: { label: string; value: number }[] = [];
    let current = startOfMonth(firstDate > lastDate ? lastDate : firstDate);
    const limit = startOfMonth(firstDate > lastDate ? firstDate : lastDate);

    while (current <= limit) {
      const mEnd = endOfMonth(current);
      const days = eachDayOfInterval({ start: current, end: mEnd });
      let totalMins = 0;
      for (const day of days) {
        const log = logMap.get(format(day, "yyyy-MM-dd"));
        if (log) totalMins += log.totalMinutes;
      }
      months.push({
        label: format(current, "MMM yyyy"),
        value: +(totalMins / 60).toFixed(1),
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return months;
  }, [logs, logMap, viewMode, chartPage]);

  // Chart date range label
  const chartRangeLabel = useMemo(() => {
    if (viewMode === "daily") {
      const end = subDays(new Date(), chartPage * 30);
      const start = subDays(end, 29);
      return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
    }
    if (viewMode === "weekly") {
      const end = subDays(new Date(), chartPage * 84);
      const start = subDays(end, 83);
      return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
    }
    return "All Time";
  }, [viewMode, chartPage]);

  // Can go further back?
  const canGoBack = useMemo(() => {
    if (logs.length === 0 || viewMode === "monthly") return false;
    const sortedDates = logs.map((l) => l.date).sort();
    const earliest = parseISO(sortedDates[0]);
    if (viewMode === "daily") {
      const pageStart = subDays(new Date(), (chartPage + 1) * 30);
      return pageStart >= earliest;
    }
    // weekly
    const pageStart = subDays(new Date(), (chartPage + 1) * 84);
    return pageStart >= earliest;
  }, [logs, viewMode, chartPage]);

  // Average for the chart
  const avgValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    return +(total / chartData.length).toFixed(1);
  }, [chartData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h === 0 && m === 0) return;

    setSaving(true);
    await saveStudyLog(user.uid, selectedDate, h, m);
    setHours("");
    setMinutes("");
    setSaving(false);
  };

  const handleEdit = (dateKey: string, h: number, m: number) => {
    setEditDate(dateKey);
    setEditHours(String(h));
    setEditMinutes(String(m));
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!user || !editDate) return;
    const h = parseInt(editHours) || 0;
    const m = parseInt(editMinutes) || 0;
    if (h === 0 && m === 0) return;
    await saveStudyLog(user.uid, editDate, h, m);
    setEditDialogOpen(false);
  };

  const handleDelete = async (dateKey: string) => {
    if (!user) return;
    await deleteStudyLog(user.uid, dateKey);
  };

  if (authLoading || (user && logsLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Tracker</h1>
          <p className="text-muted-foreground">
            Log your daily study hours and track consistency.
          </p>
        </div>

        {/* Stats Cards */}
        {logs.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Max Hours */}
            <div className="rounded-xl border border-border/50 bg-muted/10 p-5">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Max in a Day
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formatDuration(maxStudyMinutes)}
              </p>
            </div>
            {/* Weekly Avg */}
            <div className="rounded-xl border border-border/50 bg-muted/10 p-5">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                This Week Avg/Day
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formatDuration(Math.round(weeklyAvgPerDay))}
              </p>
            </div>
          </div>
        )}

        {/* Quick Input */}
        <div className="mb-10 rounded-xl border border-border/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Log Study Time</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Hours</label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Minutes</label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-20"
                />
              </div>
            </div>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 sm:w-auto">
                  <CalendarIcon className="size-4" />
                  {format(parseISO(selectedDate), "dd MMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseISO(selectedDate)}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(format(date, "yyyy-MM-dd"));
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={{ after: new Date() }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              type="submit"
              disabled={saving || (!hours && !minutes)}
              className="sm:w-auto"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </div>

        {/* Chart */}
        {logs.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Study Hours</h2>
              <div className="flex rounded-lg border border-border/50 p-0.5">
                {(["daily", "weekly", "monthly"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => { setViewMode(mode); setChartPage(0); }}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      viewMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart navigation */}
            {viewMode !== "monthly" && (
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setChartPage((p) => p + 1)}
                  disabled={!canGoBack}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                >
                  <ChevronLeft className="size-3.5" />
                  Older
                </button>
                <span className="text-xs text-muted-foreground">
                  {chartRangeLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setChartPage((p) => Math.max(0, p - 1))}
                  disabled={chartPage === 0}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                >
                  Newer
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}

            <div className="rounded-xl border border-border/50 p-4">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <defs>
                    <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.3}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval={viewMode === "daily" ? 4 : 0}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    unit="h"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value) => [`${value}h`, "Study Time"]}
                  />
                  <ReferenceLine
                    y={avgValue}
                    stroke="#6b7280"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Avg: ${avgValue}h`,
                      position: "right",
                      fill: "#6b7280",
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#34d399"
                    strokeWidth={2}
                    fill="url(#studyGradient)"
                    dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#34d399", stroke: "#064e3b", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Heatmap */}
        {logs.length > 0 && <StudyHeatmap logs={logs} />}

        {/* Recent Logs */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Recent Logs</h2>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground/60">
              No study logs yet. Log your first session above.
            </p>
          ) : (
            <div className="flex flex-col">
              {logs.slice(0, visibleCount).map((log) => (
                <div
                  key={log.id}
                  className="group flex items-center gap-4 border-b border-border/20 py-3 last:border-0"
                >
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {format(parseISO(log.date), "EEEE, dd MMMM yyyy")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.date === todayKey ? "Today" : ""}
                    </span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {formatDuration(log.totalMinutes)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/50 hover:text-foreground"
                      onClick={() => handleEdit(log.date, log.hours, log.minutes)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground/50 hover:text-destructive"
                      onClick={() => handleDelete(log.date)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {logs.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + LOGS_STEP)}
                  className="mt-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Show More ({logs.length - visibleCount} more)
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Edit — {editDate && format(parseISO(editDate), "dd MMM yyyy")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Hours</label>
              <Input
                type="number"
                min="0"
                max="24"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                className="w-20"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Minutes</label>
              <Input
                type="number"
                min="0"
                max="59"
                value={editMinutes}
                onChange={(e) => setEditMinutes(e.target.value)}
                className="w-20"
              />
            </div>
          </div>
          <Button
            onClick={handleEditSave}
            disabled={!editHours && !editMinutes}
            className="w-full"
          >
            Update
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
