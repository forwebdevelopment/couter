
import pool from "../../../../lib/db";

const MILESTONES = [
  { percent: 25, level: "Bronze" },
  { percent: 50, level: "Silver" },
  { percent: 75, level: "Gold" },
  { percent: 100, level: "Platinum" },
];

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return dateString(result);
}

function getTodayIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}



function normalizeDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // Handle values like "Tue Oct 20 2026 ..."
  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${text}`);
  }

  return parsed.toISOString().slice(0, 10);
}

function getScheduledDays(frequency, scheduleDays) {
  if (frequency === "daily") {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  if (frequency === "selected_days") {
    return scheduleDays;
  }

  return [];
}

function getDayOfWeek(date) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}


function getScheduledDates(startDate, endDate, days) {
  const dates = [];

  if (!startDate || !endDate || !Array.isArray(days)) {
    throw new Error("Invalid date range or schedule days.");
  }

  // Parse YYYY-MM-DD as UTC to avoid timezone shifts.
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    throw new Error(
      `Invalid date range: start=${startDate}, end=${endDate}`
    );
  }

  // Prevent accidentally iterating over an enormous date range.
  const totalDays =
    Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

  if (totalDays > 36600) {
    throw new Error(`Date range is too large: ${totalDays} days.`);
  }

  const validDays = new Set(days);

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start.getTime() + i * 86400000);
    const dayOfWeek = date.getUTCDay();

    if (validDays.has(dayOfWeek)) {
      dates.push(date.toISOString().slice(0, 10));
    }
  }

  return dates;
}

function calculateStreaks(scheduledDates, completedSet, today) {
  let bestStreak = 0;
  let runningStreak = 0;
  let currentStreak = 0;
  let currentSequence = true;

  for (const date of scheduledDates) {
    const completed = completedSet.has(date);

    if (completed) {
      runningStreak++;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }

    // Ignore future dates when calculating current streak.
    if (date <= today) {
      if (completed && currentSequence) {
        currentStreak++;
      } else if (!completed) {
        currentStreak = 0;
        currentSequence = false;
      }
    }
  }

  // Recalculate the current streak from the latest scheduled date.
  const pastDates = scheduledDates.filter((date) => date <= today);
  currentStreak = 0;

  for (let i = pastDates.length - 1; i >= 0; i--) {
    if (!completedSet.has(pastDates[i])) break;
    currentStreak++;
  }

  return { currentStreak, bestStreak };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const habitResult = await pool.query(
      `SELECT
  id,
  name,
  TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
  TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
  frequency,
  total_task_goal,
  certificate_mode,
  status
FROM habit_maker.habits
WHERE id = $1`,
      [id]
    );

    if (habitResult.rows.length === 0) {
      return Response.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    const habit = habitResult.rows[0];

    const scheduleResult = await pool.query(
      `SELECT day_of_week
       FROM habit_maker.habit_schedules
       WHERE habit_id = $1
       ORDER BY day_of_week`,
      [id]
    );

    const scheduleDays = scheduleResult.rows.map(
      (row) => Number(row.day_of_week)
    );

    const days = getScheduledDays(
      habit.frequency,
      scheduleDays
    );

    if (days.length === 0) {
      return Response.json({
        habit_id: id,
        current_streak: 0,
        best_streak: 0,
        completed_days: 0,
        certificates: [],
        message: "No scheduled days are configured for this habit.",
      });
    }

    const today = getTodayIndia();
    const startDate = normalizeDate(habit.start_date);
    const endDate = habit.end_date
      ? normalizeDate(habit.end_date)
      : today;

    const effectiveEndDate = endDate < today ? endDate : today;

    const checkinResult = await pool.query(
      `SELECT TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date
       FROM habit_maker.habit_checkins
       WHERE habit_id = $1
         AND completed = TRUE
         AND checkin_date >= $2::date
         AND checkin_date <= $3::date
       ORDER BY checkin_date ASC`,
      [id, startDate, effectiveEndDate]
    );

    const completedDates = checkinResult.rows.map(
      (row) => row.checkin_date
    );
    const completedSet = new Set(completedDates);

    const scheduledDates = getScheduledDates(
      startDate,
      effectiveEndDate,
      days
    );

    const { currentStreak, bestStreak } = calculateStreaks(
      scheduledDates,
      completedSet,
      today
    );

    // Determine the certificate target.
    let targetDays = Number(habit.total_task_goal || 0);

    if (
      habit.certificate_mode === "duration" ||
      (habit.certificate_mode === "both" && habit.end_date)
    ) {
      const durationEnd = String(habit.end_date || today).slice(0, 10);
      targetDays = getScheduledDates(
        startDate,
        durationEnd,
        days
      ).length;
    }

    // Award certificates only when the best streak reaches a milestone.
    if (
      targetDays > 0 &&
      ["task_target", "duration", "both"].includes(
        habit.certificate_mode
      )
    ) {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        for (const milestone of MILESTONES) {
          const requiredDays = Math.ceil(
            (targetDays * milestone.percent) / 100
          );

          if (bestStreak < requiredDays) continue;

          await client.query(
            `INSERT INTO habit_maker.habit_certificates
              (
                habit_id,
                milestone_percent,
                certificate_level,
                best_streak_at_award
              )
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (habit_id, milestone_percent)
             DO NOTHING`,
            [
              id,
              milestone.percent,
              milestone.level,
              bestStreak,
            ]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    const certificateResult = await pool.query(
      `SELECT
         id,
         milestone_percent,
         certificate_level,
         best_streak_at_award,
         earned_at
       FROM habit_maker.habit_certificates
       WHERE habit_id = $1
       ORDER BY milestone_percent`,
      [id]
    );

    return Response.json({
      habit_id: id,
      frequency: habit.frequency,
      current_streak: currentStreak,
      best_streak: bestStreak,
      completed_days: completedDates.length,
      total_task_goal: targetDays,
      certificates: certificateResult.rows,
    });
  } catch (error) {
    console.error("Streak and certificate API error:", error);

    return Response.json(
      { error: "Unable to calculate streak or certificates." },
      { status: 500 }
    );
  }

}
