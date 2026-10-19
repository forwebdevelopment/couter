
"use client";

import styles from "./HabitCard.module.css";
import { useRouter } from "next/navigation";
export default function HabitCard({
  habit,
  categories,
  streak,
  onCheckIn,
  onChangeStatus,
}) {
  const category = categories.find(
    (item) => String(item.id) === String(habit.category_id)
  );
  const router = useRouter();
  const isActive = habit.status === "active";
  const supportsStreak = habit.frequency === "daily";

  return (
    <article
      className={styles.card}
      style={{ "--habit-color": habit.color || "#2563eb" }}
    >
      <div className={styles.top}>
        <div className={styles.icon} aria-hidden="true">
          {habit.icon === "book-open"
            ? "📖"
            : habit.icon === "activity"
              ? "🏃"
              : habit.icon === "brain"
                ? "🧠"
                : "✓"}
        </div>

        <span className={`${styles.status} ${styles[habit.status] || ""}`}>
          {habit.status}
        </span>
      </div>

      <h2 className={styles.name}>{habit.name}</h2>

      <p className={styles.description}>
        {habit.description || "One small step at a time."}
      </p>

      <div className={styles.metadata}>
        <span className={styles.category}>
          {category?.name || "Uncategorized"}
        </span>

        <span>
          {habit.frequency === "selected_days"
            ? "Selected days"
            : habit.frequency === "weekly"
              ? "Weekly"
              : "Daily"}
        </span>
      </div>

      <div className={styles.target}>
        <span>Target</span>
        <strong>
          {habit.target_per_period || 1} {habit.unit || "times"}
        </strong>
      </div>

      {/* Streak statistics: currently supported for daily habits */}
      {supportsStreak && (
        <div className={styles.streakSection}>
          <div className={styles.streakItem}>
            <span>🔥 Current streak</span>
            <strong>
              {streak?.current_streak ?? "—"}{" "}
              {streak ? "days" : ""}
            </strong>
          </div>

          <div className={styles.streakItem}>
            <span>🏆 Best streak</span>
            <strong>
              {streak?.best_streak ?? "—"}{" "}
              {streak ? "days" : ""}
            </strong>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {isActive && (
          <button
            type="button"
            className={
              habit.completed_today
                ? styles.completedButton
                : styles.completeButton
            }
            disabled={habit.completed_today}
            onClick={() => onCheckIn(habit)}
          >
            {habit.completed_today
              ? "✓ Completed today"
              : "✓ Complete today"}
          </button>
        )}

        {isActive ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onChangeStatus(habit, "paused")}
          >
            Pause
          </button>
        ) : habit.status === "paused" ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onChangeStatus(habit, "active")}
          >
            Resume
          </button>
        ) : null}

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push(`/habits/${habit.id}`)}
        >
          View Details
        </button>

      </div>
    </article>
  );
}
