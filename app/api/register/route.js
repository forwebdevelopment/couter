import pool from "../../lib/db";
import bcrypt from "bcrypt";

export async function POST(request) {
    try {
        const body = await request.json();

        const { name, email, password } = body;

        if (!name || !email || !password) {
            return Response.json(
                {
                    success: false,
                    message: "Name, email and password are required"
                },
                {
                    status: 400
                }
            );
        }

        const existingUser = await pool.query(
            `SELECT UserId
             FROM UserTable
             WHERE Email = $1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return Response.json(
                {
                    success: false,
                    message: "Email already registered"
                },
                {
                    status: 409
                }
            );
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO UserTable
                (Name, Email, Password)
             VALUES
                ($1, $2, $3)
             RETURNING UserId, Name, Email`,
            [name, email, passwordHash]
        );

        return Response.json(
            {
                success: true,
                message: "User registered successfully",
                user: result.rows[0]
            },
            {
                status: 201
            }
        );

    } catch (error) {
        console.error("Register Error:", error);

        return Response.json(
            {
                success: false,
                message: "Registration failed",
                error: error?.message || "Unknown error"
            },
            {
                status: 500
            }
        );
    }
}