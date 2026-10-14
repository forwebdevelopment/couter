
import  pool  from "../../../lib/db";


const schema = "habit_maker";

const validStatuses = [
  "active",
  "paused",
  "completed",
  "archived",
];

export async function GET(request, { params }) {
  try {
    const { id } = await params;

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
             SELECT json_agg(
               json_build_object(
                 'date', ci.checkin_date,
                 'completed', ci.completed,
                 'progress_value', ci.progress_value,
                 'notes', ci.notes
               )
               ORDER BY ci.checkin_date DESC
             )
             FROM ${schema}.habit_checkins ci
             WHERE ci.habit_id = h.id
           ),
           '[]'::json
         ) AS checkins
       FROM ${schema}.habits h
       LEFT JOIN ${schema}.habit_categories c
         ON c.id = h.category_id
       WHERE h.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return Response.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    return Response.json({ data: result.rows[0] });
  } catch (error) {
    console.error("GET habit details error:", error);
    return Response.json(
      { error: "Failed to fetch habit details." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "name",
      "description",
      "category_id",
      "frequency",
      "target_per_period",
      "unit",
      "start_date",
      "end_date",
      "color",
      "icon",
      "status",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (!Object.hasOwn(body, field)) continue;

      const value = body[field];

      if (field === "name" &&
          (typeof value !== "string" ||
           !value.trim() ||
           value.trim().length > 150)) {
        return Response.json(
          { error: "Invalid habit name." },
          { status: 400 }
        );
      }

      if (
        field === "frequency" &&
        !["daily", "weekly", "selected_days"].includes(value)
      ) {
        return Response.json(
          { error: "Invalid frequency." },
          { status: 400 }
        );
      }

      if (
        field === "status" &&
        !validStatuses.includes(value)
      ) {
        return Response.json(
          { error: "Invalid status." },
          { status: 400 }
        );
      }

      if (
        field === "target_per_period" &&
        (!Number.isInteger(value) || value < 1)
      ) {
        return Response.json(
          { error: "Target must be a positive integer." },
          { status: 400 }
        );
      }

      if (
        ["start_date", "end_date"].includes(field) &&
        value !== null &&
        !isDate(value)
      ) {
        return Response.json(
          { error: `Invalid ${field}. Use YYYY-MM-DD.` },
          { status: 400 }
        );
      }

      values.push(field === "name" ? value.trim() : value);
      updates.push(`${field} = $${values.length}`);
    }

    const scheduleDaysProvided =
      Object.hasOwn(body, "schedule_days");

    if (scheduleDaysProvided) {
      const days = body.schedule_days;

      if (
        !Array.isArray(days) ||
        days.some(
          d => !Number.isInteger(d) || d < 0 || d > 6
        ) ||
        new Set(days).size !== days.length
      ) {
        return Response.json(
          { error: "Invalid schedule_days." },
          { status: 400 }
        );
      }
    }

    if (!updates.length && !scheduleDaysProvided) {
      return Response.json(
        { error: "No fields provided to update." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // Lock the habit and verify that it exists.
    const existing = await client.query(
      `SELECT * FROM ${schema}.habits
       WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (!existing.rows.length) {
      await client.query("ROLLBACK");
      return Response.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    const current = existing.rows[0];

    const nextStart = body.start_date ?? current.start_date;
    const nextEnd = Object.hasOwn(body, "end_date")
      ? body.end_date
      : current.end_date;

    if (nextEnd && nextEnd < nextStart) {
      await client.query("ROLLBACK");
      return Response.json(
        { error: "end_date must be on or after start_date." },
        { status: 400 }
      );
    }

    if (scheduleDaysProvided) {
      const nextFrequency = body.frequency ?? current.frequency;

      if (
        nextFrequency === "selected_days" &&
        body.schedule_days.length === 0
      ) {
        await client.query("ROLLBACK");
        return Response.json(
          { error: "Select at least one scheduled weekday." },
          { status: 400 }
        );
      }
    }

    if (updates.length) {
      values.push(id);

      await client.query(
        `UPDATE ${schema}.habits
         SET ${updates.join(", ")},
             updated_at = NOW()
         WHERE id = $${values.length}`,
        values
      );
    } else {
      await client.query(
        `UPDATE ${schema}.habits
         SET updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    }

    if (scheduleDaysProvided) {
      await client.query(
        `DELETE FROM ${schema}.habit_schedules
         WHERE habit_id = $1`,
        [id]
      );

      for (const day of body.schedule_days) {
        await client.query(
          `INSERT INTO ${schema}.habit_schedules
             (habit_id, day_of_week)
           VALUES ($1, $2)`,
          [id, day]
        );
      }
    }

    const updated = await client.query(
      `SELECT * FROM ${schema}.habits WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    return Response.json({
      message: "Habit updated.",
      data: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH habit error:", error);

    if (error.code === "23503") {
      return Response.json(
        { error: "The selected category does not exist." },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Failed to update habit." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `DELETE FROM ${schema}.habits
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rowCount) {
      return Response.json(
        { error: "Habit not found." },
        { status: 404 }
      );
    }

    return Response.json({
      message: "Habit and its associated records deleted.",
    });
  } catch (error) {
    console.error("DELETE habit error:", error);
    return Response.json(
      { error: "Failed to delete habit." },
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
