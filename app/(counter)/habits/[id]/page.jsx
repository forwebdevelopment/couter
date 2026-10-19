
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./page.module.css";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export default function HabitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [habit, setHabit] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetails = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const [habitResponse, checkinResponse] = await Promise.all([
        fetch(`/api/habits/${id}`, { cache: "no-store" }),
        fetch(`/api/habits/${id}/checkins`, { cache: "no-store" }),
      ]);

      const habitData = await habitResponse.json().catch(() => ({}));
      const checkinData = await checkinResponse.json().catch(() => ({}));

      if (!habitResponse.ok) {
        throw new Error(habitData.error || "Unable to load habit.");
      }

      if (!checkinResponse.ok) {
        throw new Error(
          checkinData.error || "Unable to load check-in history."
        );
      }

      setHabit(habitData.data);
      setCheckins(Array.isArray(checkinData.data) ? checkinData.data : []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const checkinByDate = useMemo(() => {
    const map = new Map();

    for (const checkin of checkins) {
      const date = String(checkin.checkin_date).slice(0, 10);
      map.set(date, checkin);
    }

    return map;
  }, [checkins]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstWeekday = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Convert Sunday-first JS weekday to Monday-first calendar.
    const leadingEmptyDays = (firstWeekday + 6) % 7;

    return [
      ...Array(leadingEmptyDays).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [month]);

  const monthStats = useMemo(() => {
    const year = month.getFullYear();
    const monthNumber = String(month.getMonth() + 1).padStart(2, "0");

    const monthCheckins = checkins.filter((item) => {
      const date = String(item.checkin_date).slice(0, 10);
      return date.startsWith(`${year}-${monthNumber}-`) && item.completed;
    });

    const today = localDateString();
    const start = habit?.start_date
      ? String(habit.start_date).slice(0, 10)
      : null;
    const end = habit?.end_date
      ? String(habit.end_date).slice(0, 10)
      : null;

    let eligibleDays = 0;

    for (const day of calendarDays) {
      if (!day) continue;

      const date = `${year}-${monthNumber}-${String(day).padStart(2, "0")}`;

      if (date > today || (start && date < start) || (end && date > end)) {
        continue;
      }

      // Only count days on which this habit is scheduled.
      if (
        habit?.frequency === "selected_days" &&
        Array.isArray(habit.schedule_days)
      ) {
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        if (!habit.schedule_days.includes(weekday)) continue;
      }

      if (habit?.frequency === "weekly") {
        // Weekly target is not equivalent to a daily target.
        // Weekly completion percentage needs separate weekly grouping.
        continue;
      }

      eligibleDays++;
    }

    const percentage =
      eligibleDays > 0
        ? Math.round((monthCheckins.length / eligibleDays) * 100)
        : 0;

    return {
      completed: monthCheckins.length,
      eligible: eligibleDays,
      percentage: Math.min(percentage, 100),
    };
  }, [checkins, month, calendarDays, habit]);

  if (loading) {
    return <main className={styles.page}>Loading habit details...</main>;
  }

  if (error || !habit) {
    return (
      <main className={styles.page}>
        <p className={styles.error}>{error || "Habit not found."}</p>
        <button onClick={() => router.push("/habits")}>
          Back to habits
        </button>
      </main>
    );
  }

  const monthTitle = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <main className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => router.push("/habits")}
      >
        ← Back to habits
      </button>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>HABIT DETAILS</p>
          <h1>{habit.name}</h1>
          <p className={styles.subtitle}>
            {habit.description || "One small step at a time."}
          </p>
        </div>

        <span className={styles.status}>{habit.status}</span>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <span>Frequency</span>
          <strong>
            {habit.frequency === "selected_days"
              ? "Selected days"
              : habit.frequency === "weekly"
                ? "Weekly"
                : "Daily"}
          </strong>
        </article>

        <article className={styles.statCard}>
          <span>Monthly completions</span>
          <strong>{monthStats.completed}</strong>
        </article>

        <article className={styles.statCard}>
          <span>Completion rate</span>
          <strong>
            {habit.frequency === "weekly"
              ? "—"
              : `${monthStats.percentage}%`}
          </strong>
        </article>
      </section>

      <section className={styles.calendarCard}>
        <div className={styles.calendarHeader}>
          <button
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
            aria-label="Previous month"
          >
            ←
          </button>

          <h2>{monthTitle}</h2>

          <button
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className={styles.calendarGrid}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className={styles.weekday}>
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }

            const year = month.getFullYear();
            const monthNumber = String(month.getMonth() + 1).padStart(2, "0");
            const date = `${year}-${monthNumber}-${String(day).padStart(2, "0")}`;
            const checkin = checkinByDate.get(date);
            const completed = Boolean(checkin?.completed);
            const today = date === localDateString();

            return (
              <div
                key={date}
                className={[
                  styles.calendarDay,
                  completed ? styles.completedDay : "",
                  today ? styles.today : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={
                  completed
                    ? `Completed: ${date}`
                    : `No completed check-in: ${date}`
                }
              >
                <span>{day}</span>
                {completed && <span aria-label="Completed">✓</span>}
              </div>
            );
          })}
        </div>

        <div className={styles.legend}>
          <span>
            <i className={styles.legendCompleted} /> Completed
          </span>
          <span>
            <i className={styles.legendToday} /> Today
          </span>
        </div>
      </section>

      <section className={styles.historyCard}>
        <h2>Check-in history</h2>

        {checkins.length === 0 ? (
          <p className={styles.empty}>
            No check-ins yet. Complete your habit to start tracking progress.
          </p>
        ) : (
          <div className={styles.historyList}>
            {checkins.map((item) => {
              const date = String(item.checkin_date).slice(0, 10);

              return (
                <article key={item.id} className={styles.historyItem}>
                  <div>
                    <strong>{formatDate(date)}</strong>
                    <p>
                      Progress: {item.progress_value ?? 0}{" "}
                      {habit.unit || "times"}
                    </p>
                    {item.notes && <p>{item.notes}</p>}
                  </div>

                  <span
                    className={
                      item.completed ? styles.completedLabel : styles.missedLabel
                    }
                  >
                    {item.completed ? "✓ Completed" : "Not completed"}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
