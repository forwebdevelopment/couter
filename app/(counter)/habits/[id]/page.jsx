
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

  const [isEditing, setIsEditing] = useState(false);
const [saving, setSaving] = useState(false);
const [editError, setEditError] = useState("");
const [categories, setCategories] = useState([]);
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
const [deleting, setDeleting] = useState(false);
const [deleteError, setDeleteError] = useState("");
const [editForm, setEditForm] = useState({
  name: "",
  description: "",
  category_id: "",
  frequency: "daily",
  target_per_period: 1,
  unit: "times",
  start_date: "",
  end_date: "",
  schedule_days: [],
});

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

const openEditForm = async () => {
  setEditError("");

  try {
    const response = await fetch("/api/habits/categories", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load categories.");
    }

    const categoryList = Array.isArray(result.categories)
      ? result.categories
      : Array.isArray(result.data)
        ? result.data
        : [];

    setCategories(categoryList);

    setEditForm({
      name: habit.name || "",
      description: habit.description || "",
      category_id: habit.category_id || "",
      frequency: habit.frequency || "daily",
      target_per_period: habit.target_per_period || 1,
      unit: habit.unit || "times",
      start_date: String(habit.start_date || "").slice(0, 10),
      end_date: String(habit.end_date || "").slice(0, 10),
      schedule_days: Array.isArray(habit.schedule_days)
        ? habit.schedule_days.map(Number)
        : [],
    });

    setIsEditing(true);
  } catch (err) {
    setEditError(err.message || "Unable to open edit form.");
  }
};

const updateEditField = (event) => {
  const { name, value } = event.target;

  setEditForm((current) => ({
    ...current,
    [name]: name === "target_per_period" ? Number(value) : value,
  }));
};

const toggleScheduleDay = (day) => {
  setEditForm((current) => ({
    ...current,
    schedule_days: current.schedule_days.includes(day)
      ? current.schedule_days.filter((item) => item !== day)
      : [...current.schedule_days, day].sort((a, b) => a - b),
  }));
};

const saveHabitChanges = async (event) => {
  event.preventDefault();
  setEditError("");

  if (!editForm.name.trim()) {
    setEditError("Habit name is required.");
    return;
  }

  if (
    !Number.isInteger(Number(editForm.target_per_period)) ||
    Number(editForm.target_per_period) < 1
  ) {
    setEditError("Target must be a positive whole number.");
    return;
  }

  if (
    editForm.end_date &&
    editForm.end_date < editForm.start_date
  ) {
    setEditError("End date must be on or after start date.");
    return;
  }

  if (
    editForm.frequency === "selected_days" &&
    editForm.schedule_days.length === 0
  ) {
    setEditError("Select at least one weekday.");
    return;
  }

  setSaving(true);

  try {
    const payload = {
      ...editForm,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      category_id: editForm.category_id || null,
      target_per_period: Number(editForm.target_per_period),
      end_date: editForm.end_date || null,
      schedule_days:
        editForm.frequency === "selected_days"
          ? editForm.schedule_days
          : [],
    };

    const response = await fetch(`/api/habits/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to update habit.");
    }

    setIsEditing(false);
    await loadDetails();
  } catch (err) {
    setEditError(err.message || "Failed to save changes.");
  } finally {
    setSaving(false);
  }
};
const deleteHabit = async () => {
  if (deleting) return;

  setDeleting(true);
  setDeleteError("");

  try {
    const response = await fetch(`/api/habits/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete habit.");
    }

    router.push("/habits");
  } catch (error) {
    setDeleteError(error.message || "Something went wrong.");
    setDeleting(false);
  }
};

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

       <div className={styles.headerActions}>
  <span className={styles.status}>{habit.status}</span>

  {!isEditing && (
    <button
      type="button"
      className={styles.editButton}
      onClick={openEditForm}
    >
      ✎ Edit Habit
    </button>
  )}

  <button
  type="button"
  className={styles.deleteButton}
  onClick={() => {
    setDeleteError("");
    setShowDeleteDialog(true);
  }}
>
  Delete Habit
</button>
</div>
      </header>

{isEditing && (
  <section className={styles.editCard}>
    <div className={styles.editHeading}>
      <div>
        <p className={styles.eyebrow}>HABIT SETTINGS</p>
        <h2>Edit Habit</h2>
      </div>

      <button
        type="button"
        className={styles.cancelButton}
        disabled={saving}
        onClick={() => {
          setIsEditing(false);
          setEditError("");
        }}
      >
        Cancel
      </button>
    </div>

    {editError && (
      <p className={styles.editError} role="alert">
        {editError}
      </p>
    )}

    <form onSubmit={saveHabitChanges} className={styles.editForm}>
      <label>
        Habit name *
        <input
          name="name"
          value={editForm.name}
          onChange={updateEditField}
          maxLength={150}
          required
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={editForm.description}
          onChange={updateEditField}
          rows={3}
        />
      </label>

      <label>
        Category
        <select
          name="category_id"
          value={editForm.category_id}
          onChange={updateEditField}
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.formRow}>
        <label>
          Frequency *
          <select
            name="frequency"
            value={editForm.frequency}
            onChange={updateEditField}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="selected_days">Selected days</option>
          </select>
        </label>

        <label>
          Target *
          <input
            name="target_per_period"
            type="number"
            min="1"
            step="1"
            value={editForm.target_per_period}
            onChange={updateEditField}
            required
          />
        </label>
      </div>

      <label>
        Unit
        <input
          name="unit"
          value={editForm.unit}
          onChange={updateEditField}
          maxLength={50}
        />
      </label>

      {editForm.frequency === "selected_days" && (
        <fieldset className={styles.scheduleField}>
          <legend>Choose weekdays *</legend>

          <div className={styles.weekdayOptions}>
            {[
              { label: "Sun", value: 0 },
              { label: "Mon", value: 1 },
              { label: "Tue", value: 2 },
              { label: "Wed", value: 3 },
              { label: "Thu", value: 4 },
              { label: "Fri", value: 5 },
              { label: "Sat", value: 6 },
            ].map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  checked={editForm.schedule_days.includes(day.value)}
                  onChange={() => toggleScheduleDay(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={styles.formRow}>
        <label>
          Start date *
          <input
            type="date"
            name="start_date"
            value={editForm.start_date}
            onChange={updateEditField}
            required
          />
        </label>

        <label>
          End date
          <input
            type="date"
            name="end_date"
            value={editForm.end_date}
            min={editForm.start_date || undefined}
            onChange={updateEditField}
          />
        </label>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelButton}
          disabled={saving}
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </button>

        <button
          type="submit"
          className={styles.saveButton}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  </section>
)}



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


      {showDeleteDialog && (
  <div className={styles.dialogOverlay}>
    <div
      className={styles.deleteDialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <h2 id="delete-dialog-title">Delete Habit?</h2>

      <p id="delete-dialog-description">
        Are you sure you want to delete "{habit.name}"?
        All schedules and check-in history will be permanently deleted.
        This action cannot be undone.
      </p>

      {deleteError && (
        <p className={styles.deleteError} role="alert">
          {deleteError}
        </p>
      )}

      <div className={styles.dialogActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => setShowDeleteDialog(false)}
          disabled={deleting}
        >
          Cancel
        </button>

        <button
          type="button"
          className={styles.confirmDeleteButton}
          onClick={deleteHabit}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Permanently"}
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}
