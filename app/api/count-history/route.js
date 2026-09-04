import pool from "../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json(
        {
          success: false,
          message: "UserId is required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        id,
        userid,
        count,
        dates
      FROM counthistory
      WHERE userid = $1
      ORDER BY dates DESC
      `,
      [userId]
    );

    return Response.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        userId: row.userid,
        count: Number(row.count),
        date: row.dates,
      })),
    });

  } catch (error) {
    console.error("Count History Error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to load count history",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   UPDATE COUNT
========================================================= */

export async function PUT(request) {
  try {
    const { id, userId, count } = await request.json();

    if (!id || !userId) {
      return Response.json(
        {
          success: false,
          message: "Id and UserId are required",
        },
        { status: 400 }
      );
    }

    const numericCount = Number(count);

    if (!Number.isInteger(numericCount) || numericCount < 0) {
      return Response.json(
        {
          success: false,
          message: "Count must be a valid whole number",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE counthistory

      SET count = $1

      WHERE id = $2
        AND userid = $3

      RETURNING
        id,
        userid,
        count,
        dates
      `,
      [numericCount, id, userId]
    );

    if (result.rows.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Record not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Count updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Update Count Error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to update count",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}


/* =========================================================
   DELETE COUNT
========================================================= */

export async function DELETE(request) {
  try {
    const { id, userId } = await request.json();

    if (!id || !userId) {
      return Response.json(
        {
          success: false,
          message: "Id and UserId are required",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM counthistory

      WHERE id = $1
        AND userid = $2

      RETURNING id
      `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Record not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Record deleted successfully",
    });

  } catch (error) {
    console.error("Delete Count Error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to delete record",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}