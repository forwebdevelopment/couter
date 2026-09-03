"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    setUser(parsedUser);

    loadHistory(parsedUser.userId);
  }, []);

  async function loadHistory(userId) {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/count-history?userId=${userId}`
      );

      const data = await response.json();

      if (data.success) {
        setHistory(data.data);
      }

    } catch (error) {
      console.error("History Error:", error);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("user");

    router.push("/login");
  }

  return (
    <main className="history-page">

      <header className="topbar">

        <div className="brand">
          Counter App
        </div>

        <nav className="nav">

          <button
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </button>

          <button className="active">
            History
          </button>

        </nav>

        <div className="user-area">

          <span>
            {user?.name}
          </span>

          <button
            className="logout"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>


      <section className="content">

        <div className="page-heading">

          <div>
            <span className="small-title">
              COUNT HISTORY
            </span>

            <h1>
              Your Saved Counts
            </h1>

            <p>
              View all count values that you have
              previously saved.
            </p>
          </div>

          <div className="record-count">
            {history.length} Records
          </div>

        </div>


        <div className="history-card">

          {loading ? (

            <div className="status">
              Loading history...
            </div>

          ) : history.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                0
              </div>

              <h3>
                No history found
              </h3>

              <p>
                Save your first count from the
                dashboard.
              </p>

              <button
                onClick={() =>
                  router.push("/dashboard")
                }
              >
                Go to Dashboard
              </button>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Count</th>
                    <th>Date</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>

                  {history.map((item, index) => {

                    const date =
                      new Date(item.date);

                    return (
                      <tr key={item.id}>

                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <span className="count">
                            {item.count}
                          </span>
                        </td>

                        <td>
                          {date.toLocaleDateString(
                            "en-IN"
                          )}
                        </td>

                        <td>
                          {date.toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </section>


      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .history-page {
          min-height: 100vh;

          background: #f8fafc;

          color: #0f172a;

          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .topbar {
          min-height: 76px;

          padding: 0 40px;

          display: flex;
          align-items: center;

          gap: 30px;

          background: white;

          border-bottom:
            1px solid #e2e8f0;
        }

        .brand {
          color: #2563eb;

          font-size: 21px;
          font-weight: 800;

          margin-right: 20px;
        }

        .nav {
          display: flex;

          align-items: center;

          gap: 8px;
        }

        .nav button {
          padding: 10px 14px;

          border: none;

          border-radius: 9px;

          background: transparent;

          color: #64748b;

          font-size: 14px;
          font-weight: 600;

          cursor: pointer;
        }

        .nav button:hover {
          background: #f1f5f9;

          color: #0f172a;
        }

        .nav .active {
          background: #eff6ff;

          color: #2563eb;
        }

        .user-area {
          margin-left: auto;

          display: flex;

          align-items: center;

          gap: 16px;
        }

        .user-area span {
          color: #334155;

          font-size: 14px;
          font-weight: 600;
        }

        .logout {
          padding: 9px 15px;

          border:
            1px solid #e2e8f0;

          border-radius: 9px;

          background: white;

          color: #475569;

          font-weight: 600;

          cursor: pointer;
        }

        .content {
          width: 100%;

          max-width: 1100px;

          margin: 0 auto;

          padding: 60px 24px;
        }

        .page-heading {
          display: flex;

          justify-content:
            space-between;

          align-items:
            flex-end;

          gap: 20px;

          margin-bottom: 30px;
        }

        .small-title {
          color: #2563eb;

          font-size: 12px;

          font-weight: 800;

          letter-spacing: 1.4px;
        }

        .page-heading h1 {
          margin: 9px 0 8px;

          font-size: 38px;

          letter-spacing: -1px;
        }

        .page-heading p {
          margin: 0;

          color: #64748b;

          line-height: 1.6;
        }

        .record-count {
          padding: 10px 15px;

          background: #eff6ff;

          border-radius: 999px;

          color: #2563eb;

          font-size: 13px;

          font-weight: 700;

          white-space: nowrap;
        }

        .history-card {
          background: white;

          border:
            1px solid #e8edf5;

          border-radius: 20px;

          overflow: hidden;

          box-shadow:
            0 14px 40px
            rgba(15, 23, 42, .05);
        }

        .table-wrapper {
          width: 100%;

          overflow-x: auto;
        }

        table {
          width: 100%;

          border-collapse: collapse;

          min-width: 650px;
        }

        thead {
          background: #f8fafc;
        }

        th {
          padding: 17px 22px;

          text-align: left;

          color: #64748b;

          font-size: 12px;

          font-weight: 800;

          letter-spacing: .5px;

          border-bottom:
            1px solid #e8edf5;
        }

        td {
          padding: 18px 22px;

          color: #475569;

          font-size: 14px;

          border-bottom:
            1px solid #edf2f7;
        }

        tbody tr:last-child td {
          border-bottom: none;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .count {
          display: inline-flex;

          justify-content: center;

          min-width: 60px;

          padding: 8px 14px;

          border-radius: 9px;

          background: #eff6ff;

          color: #1d4ed8;

          font-weight: 800;
        }

        .status {
          padding: 60px 20px;

          text-align: center;

          color: #94a3b8;
        }

        .empty-state {
          padding: 70px 20px;

          text-align: center;
        }

        .empty-icon {
          width: 70px;
          height: 70px;

          margin: auto;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          background: #eff6ff;

          color: #2563eb;

          font-size: 25px;

          font-weight: 800;
        }

        .empty-state h3 {
          margin:
            18px 0 8px;

          font-size: 20px;
        }

        .empty-state p {
          margin:
            0 0 20px;

          color: #64748b;
        }

        .empty-state button {
          padding:
            11px 18px;

          border: none;

          border-radius: 10px;

          background: #2563eb;

          color: white;

          font-weight: 700;

          cursor: pointer;
        }

        @media(max-width:700px) {

          .topbar {
            padding: 16px 20px;

            flex-wrap: wrap;
          }

          .brand {
            margin-right: auto;
          }

          .nav {
            order: 3;

            width: 100%;
          }

          .user-area span {
            display: none;
          }

          .content {
            padding:
              40px 18px;
          }

          .page-heading {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .page-heading h1 {
            font-size: 30px;
          }

        }

      `}</style>

    </main>
  );
}