import pool from "../../lib/db";
import bcrypt from "bcrypt";

export async function POST(request) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        {
          success: false,
          message: "Email and password are required",
        },
        {
          status: 400,
        }
      );
    }

    const result = await pool.query(
      `
      SELECT
        UserId,
        Name,
        Email,
        Password
      FROM UserTable
      WHERE Email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    const user = result.rows[0];

    const passwordMatched = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatched) {
      return Response.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    return Response.json({
      success: true,
      message: "Login successful",
      user: {
        userId: user.userid,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);

    return Response.json(
      {
        success: false,
        message: "Login failed",
        error: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}