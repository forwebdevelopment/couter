
import  pool  from "../../../lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, description
       FROM habit_maker.habit_categories
       ORDER BY name`
    );

    return Response.json({ data: result.rows });
  } catch (error) {
    console.error("GET habit categories error:", error);
    return Response.json(
      { error: "Failed to fetch habit categories." },
      { status: 500 }
    );
  }
}
