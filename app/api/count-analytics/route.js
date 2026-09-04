import pool from "../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!userId || !startDate || !endDate) {
      return Response.json(
        {
          success: false,
          message: "UserId, startDate and endDate are required",
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
        count,
        dates
      FROM counthistory
      WHERE userid = $1
        AND dates >= $2
        AND dates < $3
      ORDER BY dates ASC
      `,
      [
        userId,
        startDate,
        endDate,
      ]
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      count: Number(row.count),
      date: row.dates,
    }));

    return Response.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error("Analytics Error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to load analytics",
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}