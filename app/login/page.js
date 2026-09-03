"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      setMessage("Login successful");

      // temporary
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setTimeout(() => {
        router.push("/dashboard");
      }, 700);

    } catch (error) {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-wrapper">

        <section className="login-left">
          <div className="brand">
            <div className="brand-icon">C</div>
            <span>Counter App</span>
          </div>

          <div className="welcome-content">
            <span className="welcome-badge">
              Welcome Back
            </span>

            <h1>
              Continue tracking
              <span> your progress.</span>
            </h1>

            <p>
              Sign in to access your dashboard,
              update your count and view your
              activity history.
            </p>
          </div>
        </section>

        <section className="login-right">
          <div className="login-card">

            <div className="form-heading">
              <span className="small-title">
                SIGN IN
              </span>

              <h2>Welcome back</h2>

              <p>
                Enter your email and password
                to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-btn"
              >
                {loading
                  ? "Signing in..."
                  : "Sign In"}
              </button>

              {message && (
                <div
                  className={
                    message === "Login successful"
                      ? "message success"
                      : "message error"
                  }
                >
                  {message}
                </div>
              )}
            </form>

            <div className="register-link">
              Don't have an account?{" "}
              <a href="/register">
                Create account
              </a>
            </div>

          </div>
        </section>
      </div>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          background: #f8fafc;
          font-family: Arial, Helvetica, sans-serif;
        }

        .login-wrapper {
          width: 100%;
          max-width: 1100px;
          min-height: 650px;

          display: grid;
          grid-template-columns: 1fr 1fr;

          background: white;
          border-radius: 28px;
          overflow: hidden;

          box-shadow:
            0 25px 70px rgba(15, 23, 42, 0.12);
        }

        .login-left {
          position: relative;
          padding: 48px;

          color: white;

          background:
            radial-gradient(
              circle at 20% 20%,
              rgba(59, 130, 246, 0.55),
              transparent 35%
            ),
            linear-gradient(
              145deg,
              #0f172a,
              #172554 55%,
              #1e3a8a
            );
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;

          font-size: 20px;
          font-weight: 700;
        }

        .brand-icon {
          width: 42px;
          height: 42px;

          display: flex;
          justify-content: center;
          align-items: center;

          border-radius: 12px;

          background: white;
          color: #1d4ed8;

          font-size: 22px;
          font-weight: 800;
        }

        .welcome-content {
          margin-top: 140px;
          max-width: 450px;
        }

        .welcome-badge {
          display: inline-block;

          padding: 8px 14px;
          margin-bottom: 24px;

          border-radius: 999px;

          background: rgba(255,255,255,.1);

          border:
            1px solid rgba(255,255,255,.15);

          font-size: 13px;
        }

        .welcome-content h1 {
          margin: 0;

          font-size: 48px;
          line-height: 1.12;

          letter-spacing: -1px;
        }

        .welcome-content h1 span {
          color: #93c5fd;
        }

        .welcome-content p {
          margin-top: 22px;

          color: #cbd5e1;

          font-size: 17px;
          line-height: 1.8;
        }

        .login-right {
          display: flex;
          justify-content: center;
          align-items: center;

          padding: 60px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
        }

        .form-heading {
          margin-bottom: 34px;
        }

        .small-title {
          display: block;

          margin-bottom: 10px;

          color: #2563eb;

          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .form-heading h2 {
          margin: 0;

          color: #0f172a;

          font-size: 34px;
        }

        .form-heading p {
          margin-top: 12px;

          color: #64748b;

          line-height: 1.6;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;

          margin-bottom: 8px;

          color: #334155;

          font-size: 14px;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          height: 52px;

          padding: 0 16px;

          border:
            1px solid #dbe3ef;

          border-radius: 12px;

          outline: none;

          background: #f8fafc;

          color: #0f172a;

          font-size: 15px;

          transition: .2s;
        }

        .form-group input:focus {
          border-color: #2563eb;

          background: white;

          box-shadow:
            0 0 0 4px
            rgba(37,99,235,.08);
        }

        .login-btn {
          width: 100%;
          height: 52px;

          margin-top: 6px;

          border: none;
          border-radius: 12px;

          background: #2563eb;

          color: white;

          font-size: 15px;
          font-weight: 700;

          cursor: pointer;

          transition: .2s;
        }

        .login-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .message {
          margin-top: 16px;

          padding: 12px 14px;

          border-radius: 10px;

          font-size: 14px;
        }

        .success {
          background: #ecfdf5;
          color: #047857;

          border:
            1px solid #a7f3d0;
        }

        .error {
          background: #fef2f2;
          color: #b91c1c;

          border:
            1px solid #fecaca;
        }

        .register-link {
          margin-top: 26px;

          text-align: center;

          color: #64748b;

          font-size: 14px;
        }

        .register-link a {
          color: #2563eb;

          font-weight: 700;

          text-decoration: none;
        }

        @media(max-width:900px) {

          .login-wrapper {
            grid-template-columns: 1fr;
            max-width: 620px;
          }

          .login-left {
            min-height: 330px;
          }

          .welcome-content {
            margin-top: 60px;
          }

          .welcome-content h1 {
            font-size: 40px;
          }
        }

        @media(max-width:560px) {

          .login-page {
            padding: 0;
          }

          .login-wrapper {
            min-height: 100vh;
            border-radius: 0;
          }

          .login-left {
            padding: 28px 24px;
            min-height: 250px;
          }

          .welcome-content {
            margin-top: 40px;
          }

          .welcome-content h1 {
            font-size: 34px;
          }

          .login-right {
            padding: 40px 24px;
          }

        }

      `}</style>
    </main>
  );
}