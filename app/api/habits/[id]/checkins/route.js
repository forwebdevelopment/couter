
import pool from "../../../../lib/db";

const schema = "habit_maker";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const values = [id];
    let filters = "WHERE habit_id = $1";

    if (from) {
      values.push(from);
      filters += ` AND checkin_date >= $${values.length}`;
    }

    if (to) {
      values.push(to);
      filters += ` AND checkin_date <= $${values.length}`;
    }

    const result = await pool.query(
      `SELECT
     id,
     habit_id,
     TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date,
     completed,
     progress_value,
     notes,
     created_at,
     updated_at
   FROM ${schema}.habit_checkins
   ${filters}
   ORDER BY checkin_date DESC`,
      values
    );

    return Response.json({ data: result.rows });
  } catch (error) {
    console.error("GET check-ins error:", error);
    return Response.json(
      { error: "Failed to fetch check-in history." },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      checkin_date,
      completed = true,
      progress_value = 1,
      notes = null,
    } = body;

    if (!isDate(checkin_date)) {
      return Response.json(
        { error: "A valid checkin_date is required (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (typeof completed !== "boolean") {
      return Response.json(
        { error: "completed must be a boolean." },
        { status: 400 }
      );
    }

    if (
      typeof progress_value !== "number" ||
      !Number.isFinite(progress_value) ||
      progress_value < 0
    ) {
      return Response.json(
        { error: "progress_value must be a non-negative number." },
        { status: 400 }
      );
    }

    // Validate the habit and its eligible date range.
    const habitResult = await pool.query(
      `SELECT
      id,
      TO_CHAR(start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date,
      status
   FROM habit_maker.habits
   WHERE id = $1`,
      [id]
    );



    if (!habitResult.rowCount) {
      return Response.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    const habit = habitResult.rows[0];


    const normalizeDate = (value) => {
      debugger
      if (!value) return null;
      return String(value).slice(0, 10);
    };

    const checkinDate = normalizeDate(checkin_date);
    const startDate = normalizeDate(habit.start_date);
    const endDate = normalizeDate(habit.end_date);

    if (
      !checkinDate ||
      !startDate ||
      checkinDate < startDate ||
      (endDate && checkinDate > endDate)
    ) {
      const row = habitResult.rowCount
      return Response.json(
        {
          error: "Check-in date is outside the habit date range.",
          dates: {
            checkinDate,
            startDate,
            endDate,
            row,
            habitResult
          },
        },
        { status: 400 }
      );
    }

    if (habit.status !== "active") {
      return Response.json(
        { error: "Only active habits can be checked in." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO ${schema}.habit_checkins (
         habit_id, checkin_date, completed,
         progress_value, notes
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (habit_id, checkin_date)
       DO UPDATE SET
         completed = EXCLUDED.completed,
         progress_value = EXCLUDED.progress_value,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [id, checkin_date, completed, progress_value, notes]
    );

    return Response.json({
      message: "Check-in saved.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("POST check-in error:", error);
    return Response.json(
      { error: `Failed to save check-in. checkinDate: ${checkinDate} startDate : ${startDate} endDate: ${endDate}` },
      { status: 500 }
    );
  }
}

function isDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}
