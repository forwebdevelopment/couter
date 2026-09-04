"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  // Last count saved in DB
  const [savedCount, setSavedCount] = useState(0);

  // Current count being edited locally
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    setUser(parsedUser);

    loadCount(parsedUser.userId);
  }, []);

  async function loadCount(userId) {
    try {
      const response = await fetch(
        `/api/count?userId=${userId}`
      );

      const data = await response.json();

      if (data.success) {
        const currentCount = Number(data.count);

        setCount(currentCount);
        setSavedCount(currentCount);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // No API call
  function increaseCount() {
    setCount((previous) => previous + 1);
    setMessage("");
  }

  // No API call
  function decreaseCount() {
    setCount((previous) =>
      previous > 0 ? previous - 1 : 0
    );

    setMessage("");
  }

  // Direct manual count
  function handleCountInput(e) {
    const value = e.target.value;

    if (value === "") {
      setCount("");
      return;
    }

    const number = Number(value);

    if (number >= 0) {
      setCount(number);
    }

    setMessage("");
  }

  async function saveCount() {
    if (!user) return;

    const finalCount = Number(count);

    if (!Number.isInteger(finalCount) || finalCount < 0) {
      setMessage("Please enter a valid count.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/count", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId: user.userId,
          count: finalCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Unable to save count"
        );

        return;
      }

      setSavedCount(Number(data.data.count));

      setMessage("Count saved successfully.");

    } catch (error) {
      console.error(error);

      setMessage("Something went wrong.");

    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setCount(savedCount);
    setMessage("");
  }

  function logout() {
    localStorage.removeItem("user");

    router.push("/login");
  }

  const hasChanges =
    Number(count) !== Number(savedCount);

  if (loading) {
    return (
      <main className="loading-page">
        Loading dashboard...
      </main>
    );
  }

  return (
    <main className="dashboard">

      <header className="topbar">

        <div className="logo">
          Counter App
        </div>
        <div className="dashboard-nav">

          <button className="active">
            Dashboard
          </button>

          <button
            onClick={() => router.push("/history")}
          >
            History
          </button>
          <button
            onClick={() =>
              router.push("/analytics")
            }
          >
            Analytics
          </button>
        </div>

        <div className="user-area">

          <span>
            {user?.name}
          </span>

          <button onClick={logout}>
            Logout
          </button>

        </div>

      </header>

      <section className="content">

        <div className="welcome">

          <span>DASHBOARD</span>

          <h1>
            Welcome, {user?.name}
          </h1>

          <p>
            Update your count locally and save it
            when you're ready.
          </p>

        </div>

        <div className="counter-layout">

          {/* COUNTER */}

          <div className="counter-card" onClick={increaseCount}>

            <span className="label">
              CURRENT COUNT
            </span>

            <div className="counter-number">
              {count === "" ? 0 : count}
            </div>

            <div className="counter-actions">

              <button
                className="counter-button minus"
                onClick={decreaseCount}
              >
                −
              </button>

              <button
                className="counter-button plus"
              // onClick={increaseCount}
              >
                +
              </button>

            </div>

            <p className="helper">
              These buttons update the count only
              in the browser. No API request is made.
            </p>

          </div>


          {/* DIRECT INPUT */}

          <div className="edit-card">

            <span className="label">
              SET COUNT DIRECTLY
            </span>

            <h2>
              Enter a count
            </h2>

            <p>
              You can directly enter the final count
              instead of clicking the + button repeatedly.
            </p>

            <div className="input-group">

              <label>
                Count
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={count}
                onChange={handleCountInput}
                placeholder="Enter count"
              />

            </div>

            <div className="saved-info">

              <span>
                Last saved count
              </span>

              <strong>
                {savedCount}
              </strong>

            </div>

            {hasChanges && (
              <div className="unsaved">
                You have unsaved changes.
              </div>
            )}

            <div className="save-actions">

              <button
                className="reset-button"
                onClick={resetChanges}
                disabled={!hasChanges || saving}
              >
                Reset
              </button>

              <button
                className="save-button"
                onClick={saveCount}
                disabled={!hasChanges || saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Count"}
              </button>

            </div>

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

          </div>

        </div>

      </section>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .dashboard {
          min-height: 100vh;
          background: #f8fafc;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }

        .topbar {
          height: 76px;

          display: flex;
          justify-content: space-between;
          align-items: center;

          padding: 0 40px;

          background: white;

          border-bottom:
            1px solid #e2e8f0;
        }

        .logo {
          color: #2563eb;

          font-size: 21px;
          font-weight: 800;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-area span {
          font-weight: 600;
          color: #334155;
        }

        .user-area button {
          padding: 9px 16px;

          border:
            1px solid #e2e8f0;

          border-radius: 9px;

          background: white;

          cursor: pointer;
        }

        .content {
          width: 100%;
          max-width: 1100px;

          margin: auto;

          padding: 65px 24px;
        }

        .welcome {
          margin-bottom: 36px;
        }

        .welcome > span {
          color: #2563eb;

          font-size: 12px;
          font-weight: 800;

          letter-spacing: 1.5px;
        }

        .welcome h1 {
          margin:
            10px 0 9px;

          font-size: 38px;

          letter-spacing: -1px;
        }

        .welcome p {
          margin: 0;

          color: #64748b;
        }

        .counter-layout {
          display: grid;

          grid-template-columns:
            minmax(300px, 420px)
            minmax(350px, 1fr);

          gap: 28px;

          align-items: stretch;
        }

        .counter-card,
        .edit-card {
          background: white;

          border:
            1px solid #e8edf5;

          border-radius: 22px;

          box-shadow:
            0 16px 40px
            rgba(15,23,42,.06);
        }

        .counter-card {
          padding: 40px;

          text-align: center;
        }

        .label {
          display: block;

          color: #64748b;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 1.5px;
        }

        .counter-number {
          margin:
            35px 0;

          font-size: 88px;
          line-height: 1;

          font-weight: 800;
          color: #0f172a;
        }

        .counter-actions {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 12px;
        }

        .counter-button {
          height: 54px;

          border: none;

          border-radius: 12px;

          font-size: 30px;
          font-weight: 500;

          cursor: pointer;
        }

        .minus {
          background: #f1f5f9;

          color: #334155;
        }

        .plus {
          background: #2563eb;

          color: white;
        }

        .helper {
          margin:
            22px 0 0;

          color: #94a3b8;

          font-size: 13px;
          line-height: 1.6;
        }

        .edit-card {
          padding: 40px;
        }

        .edit-card h2 {
          margin:
            10px 0 8px;

          font-size: 27px;
        }

        .edit-card > p {
          margin:
            0 0 26px;

          color: #64748b;

          line-height: 1.6;
        }

        .input-group label {
          display: block;

          margin-bottom: 8px;

          color: #334155;

          font-size: 14px;
          font-weight: 700;
        }

        .input-group input {
          width: 100%;
          height: 55px;

          padding: 0 16px;

          border:
            1px solid #dbe3ef;

          border-radius: 12px;

          background: #f8fafc;

          outline: none;

          font-size: 17px;
          font-weight: 600;
        }

        .input-group input:focus {
          border-color:
            #2563eb;

          background: white;

          box-shadow:
            0 0 0 4px
            rgba(37,99,235,.08);
        }

        .saved-info {
          margin-top: 22px;

          padding: 15px 16px;

          display: flex;
          justify-content: space-between;
          align-items: center;

          border-radius: 11px;

          background: #f8fafc;

          color: #64748b;

          font-size: 14px;
        }

        .saved-info strong {
          color: #0f172a;

          font-size: 18px;
        }

        .unsaved {
          margin-top: 16px;

          padding: 11px 13px;

          border-radius: 9px;

          background: #fffbeb;

          color: #92400e;

          font-size: 13px;
        }

        .save-actions {
          margin-top: 22px;

          display: grid;

          grid-template-columns:
            120px 1fr;

          gap: 12px;
        }

        .save-actions button {
          height: 52px;

          border-radius: 11px;

          font-weight: 700;

          cursor: pointer;
        }

        .reset-button {
          border:
            1px solid #dbe3ef;

          background: white;

          color: #475569;
        }

        .save-button {
          border: none;

          background: #2563eb;

          color: white;
        }

        .save-actions button:disabled {
          opacity: .5;

          cursor:
            not-allowed;
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

        .loading-page {
          min-height: 100vh;

          display: flex;

          justify-content: center;
          align-items: center;
        }

        @media(max-width:800px) {

          .counter-layout {
            grid-template-columns: 1fr;
          }

        }

        @media(max-width:560px) {

          .topbar {
            padding: 0 20px;
          }

          .user-area span {
            display: none;
          }

          .content {
            padding:
              40px 18px;
          }

          .welcome h1 {
            font-size: 30px;
          }

          .counter-card,
          .edit-card {
            padding: 28px 22px;
          }

          .counter-number {
            font-size: 70px;
          }

        }
          .dashboard-nav {
  display: flex;
  gap: 8px;
  margin-left: 30px;
}

.dashboard-nav button {
  padding: 10px 14px;

  border: none;
  border-radius: 9px;

  background: transparent;

  color: #64748b;

  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
}

.dashboard-nav button:hover {
  background: #f1f5f9;
}

.dashboard-nav .active {
  background: #eff6ff;

  color: #2563eb;
}

      `}</style>

    </main>
  );
}