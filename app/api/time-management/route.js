import pool from "../../lib/db";

// ======================================================
// ALLOWED STATUS VALUES
// ======================================================

const allowedStatuses = [
  "pending",
  "completed",
  "partial",
  "missed",
  "changed",
];


// ======================================================
// GET
// Load records for one user and one date
//
// Example:
// /api/time-management?userId=abc&date=2026-09-15
// ======================================================

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams.get("userId");

    const date =
      searchParams.get("date");


    // ------------------------------
    // Validation
    // ------------------------------

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


    if (!date) {
      return Response.json(
        {
          success: false,
          message: "Date is required",
        },
        {
          status: 400,
        }
      );
    }


    // ------------------------------------------------
    // Important:
    //
    // User enters date in Indian timezone.
    // We convert start and end of that Indian day
    // into real timestamptz values.
    //
    // Example:
    //
    // date = 2026-09-15
    //
    // Indian day:
    // 15 Sep 00:00 IST
    //     to
    // 16 Sep 00:00 IST
    // ------------------------------------------------

    const result =
      await pool.query(
        `
        SELECT
          id,
          userid AS "userId",
          slot_start AS "slotStart",
          slot_end AS "slotEnd",
          planned_task AS "plannedTask",
          actual_task AS "actualTask",
          status,
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"

        FROM timemanagement

        WHERE userid = $1

        AND slot_start >=
          (
            $2::date::timestamp
            AT TIME ZONE 'Asia/Kolkata'
          )

        AND slot_start <
          (
            (($2::date + 1)::timestamp)
            AT TIME ZONE 'Asia/Kolkata'
          )

        ORDER BY slot_start ASC
        `,
        [
          userId,
          date,
        ]
      );


    return Response.json({
      success: true,

      data:
        result.rows,
    });

  } catch (error) {

    console.error(
      "TIME MANAGEMENT GET ERROR:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          error.message ||
          "Unable to fetch time management records",
      },
      {
        status: 500,
      }
    );
  }
}


// ======================================================
// POST
//
// Create an hourly record.
//
// If the same user + same time slot already exists,
// update that record instead.
//
// Expected JSON:
//
// {
//   "userId": "...",
//   "date": "2026-09-15",
//   "startTime": "08:00",
//   "endTime": "09:00",
//   "plannedTask": "Learn DSA",
//   "actualTask": "",
//   "status": "pending",
//   "notes": ""
// }
// ======================================================

export async function POST(request) {
  try {

    const body =
      await request.json();


    const {
      userId,
      date,
      startTime,
      endTime,
      plannedTask,
      actualTask,
      status = "pending",
      notes,
    } = body;


    // ------------------------------
    // Validation
    // ------------------------------

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


    if (!date) {
      return Response.json(
        {
          success: false,
          message: "Date is required",
        },
        {
          status: 400,
        }
      );
    }


    if (!startTime) {
      return Response.json(
        {
          success: false,
          message:
            "Start time is required",
        },
        {
          status: 400,
        }
      );
    }


    if (!endTime) {
      return Response.json(
        {
          success: false,
          message:
            "End time is required",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !allowedStatuses.includes(
        status
      )
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid status",
        },
        {
          status: 400,
        }
      );
    }


    // ------------------------------------------------
    // Convert entered Indian date/time
    // into TIMESTAMPTZ.
    //
    // Example:
    //
    // 2026-09-15 + 08:00
    //
    // means:
    //
    // 15 Sep 2026 08:00 AM IST
    // ------------------------------------------------

    const result =
      await pool.query(
        `
        INSERT INTO timemanagement
        (
          userid,
          slot_start,
          slot_end,
          planned_task,
          actual_task,
          status,
          notes
        )

        VALUES
        (
          $1,

          (
            ($2::date + $3::time)
            AT TIME ZONE 'Asia/Kolkata'
          ),

          (
            ($2::date + $4::time)
            AT TIME ZONE 'Asia/Kolkata'
          ),

          $5,
          $6,
          $7,
          $8
        )

        ON CONFLICT
        (
          userid,
          slot_start
        )

        DO UPDATE SET

          slot_end =
            EXCLUDED.slot_end,

          planned_task =
            EXCLUDED.planned_task,

          actual_task =
            COALESCE(
              EXCLUDED.actual_task,
              timemanagement.actual_task
            ),

          status =
            EXCLUDED.status,

          notes =
            EXCLUDED.notes,

          updated_at =
            CURRENT_TIMESTAMP

        RETURNING

          id,

          userid AS "userId",

          slot_start AS "slotStart",

          slot_end AS "slotEnd",

          planned_task AS "plannedTask",

          actual_task AS "actualTask",

          status,

          notes,

          created_at AS "createdAt",

          updated_at AS "updatedAt"
        `,
        [
          userId,
          date,
          startTime,
          endTime,
          plannedTask || null,
          actualTask || null,
          status,
          notes || null,
        ]
      );


    return Response.json(
      {
        success: true,

        message:
          "Time record saved successfully",

        data:
          result.rows[0],
      },
      {
        status: 201,
      }
    );

  } catch (error) {

    console.error(
      "TIME MANAGEMENT POST ERROR:",
      error
    );


    return Response.json(
      {
        success: false,

        message:
          error.message ||
          "Unable to save time record",
      },
      {
        status: 500,
      }
    );
  }
}


// ======================================================
// PUT
//
// Update an existing record.
//
// Mainly used after the hour is completed.
//
// Example:
//
// {
//   "id": "...",
//   "userId": "...",
//   "plannedTask": "Learn DSA",
//   "actualTask": "Studied Arrays",
//   "status": "completed",
//   "notes": "Solved 5 questions"
// }
// ======================================================

export async function PUT(request) {
  try {

    const body =
      await request.json();


    const {
      id,
      userId,
      plannedTask,
      actualTask,
      status,
      notes,
    } = body;


    // ------------------------------
    // Validation
    // ------------------------------

    if (!id) {
      return Response.json(
        {
          success: false,
          message:
            "Record id is required",
        },
        {
          status: 400,
        }
      );
    }


    if (!userId) {
      return Response.json(
        {
          success: false,
          message:
            "UserId is required",
        },
        {
          status: 400,
        }
      );
    }


    if (
      status &&
      !allowedStatuses.includes(
        status
      )
    ) {

      return Response.json(
        {
          success: false,
          message:
            "Invalid status",
        },
        {
          status: 400,
        }
      );
    }


    // ------------------------------------------------
    // COALESCE means:
    //
    // If frontend does not send a field,
    // keep the existing database value.
    // ------------------------------------------------

    const result =
      await pool.query(
        `
        UPDATE timemanagement

        SET

          planned_task =
            COALESCE(
              $3,
              planned_task
            ),

          actual_task =
            COALESCE(
              $4,
              actual_task
            ),

          status =
            COALESCE(
              $5,
              status
            ),

          notes =
            COALESCE(
              $6,
              notes
            ),

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $1

        AND userid = $2

        RETURNING

          id,

          userid AS "userId",

          slot_start AS "slotStart",

          slot_end AS "slotEnd",

          planned_task AS "plannedTask",

          actual_task AS "actualTask",

          status,

          notes,

          created_at AS "createdAt",

          updated_at AS "updatedAt"
        `,
        [
          id,
          userId,
          plannedTask ?? null,
          actualTask ?? null,
          status ?? null,
          notes ?? null,
        ]
      );


    // ------------------------------
    // Record not found
    // ------------------------------

    if (
      result.rows.length === 0
    ) {

      return Response.json(
        {
          success: false,

          message:
            "Record not found",
        },
        {
          status: 404,
        }
      );
    }


    return Response.json({
      success: true,

      message:
        "Time record updated successfully",

      data:
        result.rows[0],
    });

  } catch (error) {

    console.error(
      "TIME MANAGEMENT PUT ERROR:",
      error
    );


    return Response.json(
      {
        success: false,

        message:
          error.message ||
          "Unable to update time record",
      },
      {
        status: 500,
      }
    );
  }
}


// ======================================================
// DELETE
//
// Expected:
//
// {
//   "id": "...",
//   "userId": "..."
// }
// ======================================================

export async function DELETE(
  request
) {
  try {

    const body =
      await request.json();


    const {
      id,
      userId,
    } = body;


    // ------------------------------
    // Validation
    // ------------------------------

    if (!id) {
      return Response.json(
        {
          success: false,

          message:
            "Record id is required",
        },
        {
          status: 400,
        }
      );
    }


    if (!userId) {
      return Response.json(
        {
          success: false,

          message:
            "UserId is required",
        },
        {
          status: 400,
        }
      );
    }


    const result =
      await pool.query(
        `
        DELETE FROM timemanagement

        WHERE id = $1

        AND userid = $2

        RETURNING id
        `,
        [
          id,
          userId,
        ]
      );


    if (
      result.rows.length === 0
    ) {

      return Response.json(
        {
          success: false,

          message:
            "Record not found",
        },
        {
          status: 404,
        }
      );
    }


    return Response.json({
      success: true,

      message:
        "Time record deleted successfully",
    });

  } catch (error) {

    console.error(
      "TIME MANAGEMENT DELETE ERROR:",
      error
    );


    return Response.json(
      {
        success: false,

        message:
          error.message ||
          "Unable to delete time record",
      },
      {
        status: 500,
      }
    );
  }
}