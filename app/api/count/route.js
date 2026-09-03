import pool from "../../lib/db";

export async function POST(request) {
  try {
    const { userId, count } = await request.json();

    if (!userId) {
      return Response.json(
        {
          success: false,
          message: "UserId is required",
        },
        {
          status: 400,
        }
      );
    }

    const numericCount = Number(count);

    if (!Number.isInteger(numericCount) || numericCount < 0) {
      return Response.json(
        {
          success: false,
          message: "Count must be a valid positive whole number",
        },
        {
          status: 400,
        }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO counthistory
        (userid, count)
      VALUES
        ($1, $2)
      RETURNING id, userid, count, dates
      `,
      [userId, numericCount]
    );

    return Response.json({
      success: true,
      message: "Count saved successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Save Count Error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to save count",
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}

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
        {
          status: 400,
        }
      );
    }

    const result = await pool.query(
      `
      SELECT count, dates
      FROM counthistory
      WHERE userid = $1
      ORDER BY dates DESC
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return Response.json({
        success: true,
        count: 0,
      });
    }

    return Response.json({
      success: true,
      count: Number(result.rows[0].count),
      date: result.rows[0].dates,
    });

  } catch (error) {
    console.error("Get Count Error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to get count",
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}