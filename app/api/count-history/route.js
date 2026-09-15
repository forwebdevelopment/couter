import pool from "../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // ----------------------------------
    // Query parameters
    // ----------------------------------

    const userId = searchParams.get("userId");

    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const limit = Math.max(
      1,
      Number(searchParams.get("limit")) || 5
    );

    // ----------------------------------
    // Validation
    // ----------------------------------

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

    // ----------------------------------
    // Calculate OFFSET
    // ----------------------------------

    const offset = (page - 1) * limit;

    // ----------------------------------
    // Total records
    // ----------------------------------

    const countResult = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM counthistory
      WHERE userid = $1
      `,
      [userId]
    );

    const totalRecords = Number(
      countResult.rows[0].total
    );

    const totalPages = Math.max(
      1,
      Math.ceil(totalRecords / limit)
    );

    // ----------------------------------
    // Fetch current page
    // ----------------------------------

    const result = await pool.query(
      `
      SELECT
        id,
        count,
        dates AS "date"
      FROM counthistory
      WHERE userid = $1
      ORDER BY dates DESC
      LIMIT $2
      OFFSET $3
      `,
      [
        userId,
        limit,
        offset,
      ]
    );

    // ----------------------------------
    // Response
    // ----------------------------------

    return Response.json({
      success: true,

      data: result.rows,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });

  } catch (error) {

    console.error(
      "COUNT HISTORY GET ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to fetch history",
      },
      {
        status: 500,
      }
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