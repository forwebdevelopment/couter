
import pool from "../../lib/db";

const schema = "habit_maker";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const values = [];
    const filters = [];

    if (status) {
      const allowed = [
        "active",
        "paused",
        "completed",
        "archived",
      ];

      if (!allowed.includes(status)) {
        return Response.json(
          { error: "Invalid status." },
          { status: 400 }
        );
      }

      values.push(status);
      filters.push(`h.status = $${values.length}`);
    }

    if (search?.trim()) {
      values.push(`%${search.trim()}%`);
      filters.push(`h.name ILIKE $${values.length}`);
    }

    const where = filters.length
      ? `WHERE ${filters.join(" AND ")}`
      : "";

    const result = await pool.query(
       `SELECT
     h.*,
     c.name AS category_name,
     COALESCE(
       (
         SELECT json_agg(s.day_of_week ORDER BY s.day_of_week)
         FROM ${schema}.habit_schedules s
         WHERE s.habit_id = h.id
       ),
       '[]'::json
     ) AS schedule_days,
     COALESCE(
       (
         SELECT hc.completed
         FROM ${schema}.habit_checkins hc
         WHERE hc.habit_id = h.id
           AND hc.checkin_date = CURRENT_DATE
       ),
       false
     ) AS completed_today,
     (
       SELECT hc.progress_value
       FROM ${schema}.habit_checkins hc
       WHERE hc.habit_id = h.id
         AND hc.checkin_date = CURRENT_DATE
     ) AS progress_today
   FROM ${schema}.habits h
   LEFT JOIN ${schema}.habit_categories c
     ON c.id = h.category_id
   ${where}
   ORDER BY h.created_at DESC`,
  values
    );

    return Response.json({ data: result.rows });
  } catch (error) {
    console.error("GET habits error:", error);
    return Response.json(
      { error: "Failed to fetch habits." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const {
      name,
      description = null,
      category_id = null,
      frequency = "daily",
      target_per_period = 1,
      unit = "completion",
      start_date,
      end_date = null,
      color = null,
      icon = null,
      schedule_days = [],
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 150
    ) {
      return Response.json(
        { error: "Name is required and must be 150 characters or fewer." },
        { status: 400 }
      );
    }

    if (!start_date || !isDate(start_date)) {
      return Response.json(
        { error: "A valid start_date (YYYY-MM-DD) is required." },
        { status: 400 }
      );
    }

    if (end_date && !isDate(end_date)) {
      return Response.json(
        { error: "Invalid end_date." },
        { status: 400 }
      );
    }

    if (end_date && end_date < start_date) {
      return Response.json(
        { error: "end_date must be on or after start_date." },
        { status: 400 }
      );
    }

    if (!["daily", "weekly", "selected_days"].includes(frequency)) {
      return Response.json(
        { error: "Invalid frequency." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(target_per_period) ||
      target_per_period < 1
    ) {
      return Response.json(
        { error: "target_per_period must be a positive integer." },
        { status: 400 }
      );
    }

    if (!Array.isArray(schedule_days) ||
        schedule_days.some(
          day => !Number.isInteger(day) || day < 0 || day > 6
        ) ||
        new Set(schedule_days).size !== schedule_days.length) {
      return Response.json(
        { error: "schedule_days must contain unique integers from 0 to 6." },
        { status: 400 }
      );
    }

    if (
      frequency === "selected_days" &&
      schedule_days.length === 0
    ) {
      return Response.json(
        { error: "Select at least one scheduled weekday." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO ${schema}.habits (
         name, description, category_id, frequency,
         target_per_period, unit, start_date, end_date,
         color, icon
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name.trim(),
        description,
        category_id,
        frequency,
        target_per_period,
        unit,
        start_date,
        end_date,
        color,
        icon,
      ]
    );

    const habit = result.rows[0];

    if (schedule_days.length) {
      for (const day of schedule_days) {
        await client.query(
          `INSERT INTO ${schema}.habit_schedules
             (habit_id, day_of_week)
           VALUES ($1, $2)`,
          [habit.id, day]
        );
      }
    }

    await client.query("COMMIT");

    return Response.json(
      { message: "Habit created.", data: habit },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("POST habits error:", error);

    if (error.code === "23503") {
      return Response.json(
        { error: "The selected category does not exist." },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Failed to create habit." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

function isDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}
