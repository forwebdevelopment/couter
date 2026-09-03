"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
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
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }

      setMessage("Account created successfully!");

      setForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (error) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="register-wrapper">

        <section className="register-left">
          <div className="brand">
            <div className="brand-icon">C</div>
            <span>Counter App</span>
          </div>

          <div className="welcome-content">
            <span className="welcome-badge">Simple • Fast • Secure</span>

            <h1>
              Track your activity
              <span> effortlessly.</span>
            </h1>

            <p>
              Create your account and start tracking your count history
              with a simple and clean dashboard.
            </p>

            <div className="features">
              <div className="feature-item">
                <span>✓</span>
                Secure account registration
              </div>

              <div className="feature-item">
                <span>✓</span>
                Cloud database storage
              </div>

              <div className="feature-item">
                <span>✓</span>
                Track count history
              </div>
            </div>
          </div>
        </section>

        <section className="register-right">
          <div className="register-card">

            <div className="form-heading">
              <span className="small-title">GET STARTED</span>

              <h2>Create your account</h2>

              <p>
                Enter your details below to create a new account.
              </p>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label htmlFor="name">Full Name</label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>

                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>

                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="register-btn"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              {message && (
                <div
                  className={
                    message.includes("successfully")
                      ? "message success"
                      : "message error"
                  }
                >
                  {message}
                </div>
              )}
            </form>

            <div className="login-link">
              Already have an account?{" "}
              <a href="/login">Sign in</a>
            </div>
          </div>
        </section>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .register-page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: Arial, Helvetica, sans-serif;
        }

        .register-wrapper {
          width: 100%;
          max-width: 1120px;
          min-height: 680px;
          background: #ffffff;
          border-radius: 28px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
          box-shadow:
            0 25px 70px rgba(15, 23, 42, 0.12);
        }

        /* LEFT SIDE */

        .register-left {
          position: relative;
          padding: 48px;
          color: #ffffff;
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
          overflow: hidden;
        }

        .register-left::before {
          content: "";
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          right: -120px;
          bottom: -100px;
        }

        .register-left::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          right: 60px;
          top: 100px;
        }

        .brand {
          position: relative;
          z-index: 2;
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
          background: #ffffff;
          color: #1d4ed8;
          font-size: 22px;
          font-weight: 800;
        }

        .welcome-content {
          position: relative;
          z-index: 2;
          margin-top: 120px;
          max-width: 470px;
        }

        .welcome-badge {
          display: inline-block;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 13px;
          margin-bottom: 24px;
        }

        .welcome-content h1 {
          margin: 0;
          font-size: 50px;
          line-height: 1.1;
          letter-spacing: -1.5px;
        }

        .welcome-content h1 span {
          color: #93c5fd;
        }

        .welcome-content p {
          margin-top: 22px;
          font-size: 17px;
          line-height: 1.8;
          color: #cbd5e1;
        }

        .features {
          margin-top: 36px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-item {
          display: flex;
          gap: 12px;
          align-items: center;
          color: #e2e8f0;
          font-size: 15px;
        }

        .feature-item span {
          width: 27px;
          height: 27px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(147, 197, 253, 0.15);
          color: #bfdbfe;
          font-weight: 700;
        }

        /* RIGHT SIDE */

        .register-right {
          padding: 60px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #ffffff;
        }

        .register-card {
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
          letter-spacing: -0.8px;
        }

        .form-heading p {
          margin: 12px 0 0;
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
          border: 1px solid #dbe3ef;
          border-radius: 12px;
          outline: none;
          font-size: 15px;
          color: #0f172a;
          background: #f8fafc;
          transition: 0.2s ease;
        }

        .form-group input::placeholder {
          color: #94a3b8;
        }

        .form-group input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
        }

        .register-btn {
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
          transition: 0.2s ease;
        }

        .register-btn:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .register-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .message {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.5;
        }

        .message.success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .message.error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .login-link {
          margin-top: 26px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }

        .login-link a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 700;
        }

        .login-link a:hover {
          text-decoration: underline;
        }

        /* TABLET */

        @media (max-width: 900px) {
          .register-wrapper {
            grid-template-columns: 1fr;
            max-width: 620px;
          }

          .register-left {
            padding: 38px;
            min-height: 360px;
          }

          .welcome-content {
            margin-top: 60px;
          }

          .welcome-content h1 {
            font-size: 40px;
          }

          .features {
            display: none;
          }

          .register-right {
            padding: 48px;
          }
        }

        /* MOBILE */

        @media (max-width: 560px) {
          .register-page {
            padding: 0;
            background: #ffffff;
          }

          .register-wrapper {
            min-height: 100vh;
            border-radius: 0;
            box-shadow: none;
          }

          .register-left {
            min-height: 260px;
            padding: 28px 24px;
          }

          .welcome-content {
            margin-top: 40px;
          }

          .welcome-badge {
            display: none;
          }

          .welcome-content h1 {
            font-size: 34px;
          }

          .welcome-content p {
            font-size: 15px;
            margin-bottom: 0;
          }

          .register-right {
            padding: 40px 24px 50px;
          }

          .form-heading h2 {
            font-size: 29px;
          }
        }
      `}</style>
    </main>
  );
}