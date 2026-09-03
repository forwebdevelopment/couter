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
        {
          status: 400,
        }
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
      {
        status: 500,
      }
    );
  }
}