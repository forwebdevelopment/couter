import pool from "../../lib/db";

export async function GET() {
    try {
        console.log("===== DATABASE CONFIG =====");
        console.log("HOST:", process.env.DB_HOST);
        console.log("PORT:", process.env.DB_PORT);
        console.log("DATABASE:", process.env.DB_NAME);
        console.log("USER:", process.env.DB_USER);
        console.log("===========================");

        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        return Response.json({
            success: true,
            message: "Database connected successfully",
            data: result.rows
        });

    } catch (error) {

        console.error("DATABASE ERROR:", error);
        console.error("INNER ERRORS:", error?.errors);

        return Response.json(
            {
                success: false,
                message: "Database connection failed",
                error: error?.message || "Unknown error",
                code: error?.code || null
            },
            {
                status: 500
            }
        );
    }
}