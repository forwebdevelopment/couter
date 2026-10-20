
"use client";

import { useCallback, useEffect, useState } from "react";
import HabitForm from "./components/HabitForm";
import HabitCard from "./components/HabitCard";
import styles from "./page.module.css";

function localDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function unwrapList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  return [];
}

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [streaks, setStreaks] = useState({});
const [checkinHistory, setCheckinHistory] = useState({});

const loadStreaks = useCallback(async (habitList) => {
    const dailyHabits = habitList.filter(
      (habit) => habit.frequency === "daily"
    );

    const results = await Promise.all(
      dailyHabits.map(async (habit) => {
        try {
          const response = await fetch(
            `/api/habits/${habit.id}/streak`,
            { cache: "no-store" }
          );

          if (!response.ok) {
            return [habit.id, null];
          }

          const data = await response.json();
          return [habit.id, data];
        } catch {
          return [habit.id, null];
        }
      })
    );

    setStreaks((previous) => {
      const updated = {};

      // Keep streak data for habits that still exist.
      for (const habit of habitList) {
        if (previous[habit.id]) {
          updated[habit.id] = previous[habit.id];
        }
      }

      for (const [habitId, data] of results) {
        if (data) {
          updated[habitId] = data;
        }
      }

      return updated;
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [habitResponse, categoryResponse] = await Promise.all([
        fetch("/api/habits", { cache: "no-store" }),
        fetch("/api/habits/categories", { cache: "no-store" }),
      ]);

      if (!habitResponse.ok) {
        throw new Error("Unable to load habits.");
      }

      if (!categoryResponse.ok) {
        throw new Error("Unable to load habit categories.");
      }

      const [habitData, categoryData] = await Promise.all([
        habitResponse.json(),
        categoryResponse.json(),
      ]);

      const habitList = unwrapList(habitData, "data");

      setHabits(habitList);
      const historyResults = await Promise.all(
  habitList
    .filter((habit) => habit.status === "active")
    .map(async (habit) => {
      try {
        const response = await fetch(
          `/api/habits/${habit.id}/checkins`,
          { cache: "no-store" }
        );

        if (!response.ok) return [habit.id, []];

        const result = await response.json();

        return [
          habit.id,
          Array.isArray(result.data) ? result.data : [],
        ];
      } catch {
        return [habit.id, []];
      }
    })
);

setCheckinHistory(Object.fromEntries(historyResults));
      await loadStreaks(habitList);
      setCategories(unwrapList(categoryData, "categories"));
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [loadStreaks]);


  

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createHabit = async (formData) => {
    debugger
    console.log(formData)
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Could not create habit.");
      }

      setShowForm(false);
      setNotice("Habit created successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not create habit.");
    } finally {
      setSaving(false);
    }
  };

  const checkIn = async (habit) => {
    console.log(habit)
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/habits/${habit.id}/checkins`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkin_date: localDateString(),
            completed: true,
            progress_value: Number(habit.target_per_period || 1),
            notes: "",
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Check-in failed.");
      }

      setNotice(`${habit.name} marked complete for today.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save check-in.");
    }
  };

  const changeStatus = async (habit, status) => {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Status update failed.");
      }

      setNotice(`Habit ${status === "active" ? "resumed" : "paused"}.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update habit.");
    }
  };

  const visibleHabits = habits.filter((habit) => {
    const matchesSearch = `${habit.name || ""} ${habit.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      String(habit.category_id) === categoryFilter;

    const matchesStatus =
      statusFilter === "all" || habit.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = habits.filter((habit) => habit.status === "active").length;
  const pausedCount = habits.filter(
  (habit) => habit.status === "paused"
).length;
const today = getLocalDateString(new Date());

const todayEligibleHabits = habits.filter((habit) =>
  isHabitEligibleOnDate(habit, today)
);

const todayCompletedCount = todayEligibleHabits.filter((habit) => {
  const records = checkinHistory[habit.id] || [];

  return records.some(
    (record) =>
      record.checkin_date === today &&
      record.completed === true
  );
}).length;

const todayProgressLabel =
  `${todayCompletedCount} / ${todayEligibleHabits.length}`;

const weekStart = new Date();
weekStart.setHours(0, 0, 0, 0);
weekStart.setDate(weekStart.getDate() - weekStart.getDay());

const weekDates = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + index);
  return getLocalDateString(date);
});

const weeklyEligible = [];
const weeklyCompleted = [];

for (const habit of habits) {
  for (const dateString of weekDates) {
    if (dateString > today) continue;

    if (isHabitEligibleOnDate(habit, dateString)) {
      weeklyEligible.push({ habitId: habit.id, dateString });

      const records = checkinHistory[habit.id] || [];
      const completed = records.some(
        (record) =>
          record.checkin_date === dateString &&
          record.completed === true
      );

      if (completed) {
        weeklyCompleted.push({ habitId: habit.id, dateString });
      }
    }
  }
}

const weeklyCompletionRate = weeklyEligible.length
  ? Math.round(
      (weeklyCompleted.length / weeklyEligible.length) * 100
    )
  : 0;

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getScheduledDays(habit) {
  if (habit.frequency === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  if (habit.frequency === "selected_days") {
    return Array.isArray(habit.schedule_days)
      ? habit.schedule_days.map(Number)
      : [];
  }

  // Weekly frequency is not enough to infer a specific weekday.
  return [];
}

function isHabitEligibleOnDate(habit, dateString) {
  if (habit.status !== "active") return false;
  if (dateString < String(habit.start_date).slice(0, 10)) return false;

  if (
    habit.end_date &&
    dateString > String(habit.end_date).slice(0, 10)
  ) {
    return false;
  }

  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();

  if (habit.frequency === "weekly") {
    return true;
  }

  return getScheduledDays(habit).includes(day);
}

const completedCount = habits.filter(
  (habit) => habit.status === "completed"
).length;

const bestCurrentStreak = Math.max(
  0,
  ...Object.values(streaks).map((streak) =>
    Number(streak?.current_streak ?? streak?.currentStreak ?? 0)
  )
);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PERSONAL GROWTH</p>
          <h1>Habit Maker</h1>
          <p className={styles.subtitle}>
            Small actions. Consistent progress. Better habits.
          </p>
        </div>

        <button
          className={styles.primaryButton}
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? "Close form" : "+ New habit"}
        </button>
      </header>

    <section className={styles.stats}>
  <div className={styles.statCard}>
    <span>Total Habits</span>
    <strong>{habits.length}</strong>
  </div>

  <div className={styles.statCard}>
    <span>Active Habits</span>
    <strong>{activeCount}</strong>
  </div>

  <div className={styles.statCard}>
    <span>Paused Habits</span>
    <strong>{pausedCount}</strong>
  </div>

  <div className={styles.statCard}>
    <span>Best Current Streak</span>
    <strong>{bestCurrentStreak} days</strong>
  </div>
  <div className={styles.statCard}>
  <span>Today's Progress</span>
  <strong>{todayProgressLabel}</strong>
</div>

<div className={styles.statCard}>
  <span>Weekly Completion</span>
  <strong>{weeklyCompletionRate}%</strong>
</div>  
</section>

      {showForm && (
        <HabitForm
          categories={categories}
          saving={saving}
          onSubmit={createHabit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}

      <section className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search your habits..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search habits"
        />

        <select
          className={styles.filter}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          className={styles.filter}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
          <option value="all">All statuses</option>
        </select>
      </section>

      {loading ? (
        <div className={styles.state}>Loading your habits...</div>
      ) : visibleHabits.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✓</div>
          <h2>{habits.length ? "No matching habits" : "Start with one habit"}</h2>
          <p>
            {habits.length
              ? "Try changing your search or filters."
              : "Choose a small action you can repeat consistently."}
          </p>
          {!habits.length && (
            <button
              className={styles.primaryButton}
              onClick={() => setShowForm(true)}
            >
              Create your first habit
            </button>
          )}
        </div>
      ) : (
        <section className={styles.grid}>
          {visibleHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              categories={categories}
              streak={streaks[habit.id]}
              onCheckIn={checkIn}
              onChangeStatus={changeStatus}
            />
          ))}
        </section>
      )}
    </main>
  );
}
