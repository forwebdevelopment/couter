
import pool from "../../../../lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Fetch the habit
    const habitResult = await pool.query(
      `SELECT id, name, start_date, end_date, frequency
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

    // This first version supports daily habits only.
    if (habit.frequency !== "daily") {
      return Response.json({
        habit_id: id,
        frequency: habit.frequency,
        current_streak: null,
        best_streak: null,
        message: "Streak calculation is currently available for daily habits only.",
      });
    }

    // Use date-only values to avoid timestamp/timezone conversion issues.
    const result = await pool.query(
      `SELECT TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date
       FROM habit_maker.habit_checkins
       WHERE habit_id = $1
         AND completed = TRUE
       ORDER BY checkin_date ASC`,
      [id]
    );

    const completedDates = result.rows.map(
      (row) => row.checkin_date
    );

    // Use India-local calendar date.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const yesterdayDate = new Date(`${today}T00:00:00Z`);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);

    const completedSet = new Set(completedDates);

    // Current streak: start from today if completed;
    // otherwise start from yesterday.
    let currentStreak = 0;
    let cursor = completedSet.has(today) ? today : yesterday;

    while (completedSet.has(cursor)) {
      currentStreak++;

      const previous = new Date(`${cursor}T00:00:00Z`);
      previous.setUTCDate(previous.getUTCDate() - 1);
      cursor = previous.toISOString().slice(0, 10);
    }

    // Best streak: longest sequence of consecutive dates.
    let bestStreak = 0;
    let runningStreak = 0;
    let previousDate = null;

    for (const date of completedDates) {
      if (date === previousDate) continue;

      if (previousDate) {
        const nextExpected = new Date(`${previousDate}T00:00:00Z`);
        nextExpected.setUTCDate(nextExpected.getUTCDate() + 1);

        if (nextExpected.toISOString().slice(0, 10) === date) {
          runningStreak++;
        } else {
          runningStreak = 1;
        }
      } else {
        runningStreak = 1;
      }

      bestStreak = Math.max(bestStreak, runningStreak);
      previousDate = date;
    }

    return Response.json({
      habit_id: id,
      current_streak: currentStreak,
      best_streak: bestStreak,
      completed_days: completedDates.length,
    });
  } catch (error) {
    console.error("Streak API error:", error);

    return Response.json(
      { error: "Unable to calculate habit streak." },
      { status: 500 }
    );
  }
}
