"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editCount, setEditCount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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


  function startEdit(item) {
    setEditingId(item.id);

    setEditCount(item.count);
  }


  function cancelEdit() {
    setEditingId(null);

    setEditCount("");
  }


  async function updateCount(id) {
    if (!user) return;

    const count = Number(editCount);

    if (!Number.isInteger(count) || count < 0) {
      alert("Please enter a valid count");

      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch("/api/count-history", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: id,
          userId: user.userId,
          count: count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to update record");

        return;
      }

      setHistory((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
              ...item,
              count: Number(data.data.count),
            }
            : item
        )
      );

      setEditingId(null);

      setEditCount("");

    } catch (error) {
      console.error(error);

      alert("Something went wrong");

    } finally {
      setActionLoading(false);
    }
  }


  async function deleteCount(id) {
    if (!user) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this record?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch("/api/count-history", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: id,
          userId: user.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to delete record");

        return;
      }

      setHistory((previous) =>
        previous.filter(
          (item) => item.id !== id
        )
      );

    } catch (error) {
      console.error(error);

      alert("Something went wrong");

    } finally {
      setActionLoading(false);
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
           <button
            onClick={() =>
              router.push("/analytics")
            }
          >
            Analytics
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
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {history.map((item, index) => {

    const date = new Date(item.date);

    const isEditing =
      editingId === item.id;

    return (
      <tr key={item.id}>

        <td>
          {index + 1}
        </td>

        <td>

          {isEditing ? (

            <input
              type="number"
              min="0"
              value={editCount}
              onChange={(e) =>
                setEditCount(e.target.value)
              }
              className="edit-input"
            />

          ) : (

            <span className="count">
              {item.count}
            </span>

          )}

        </td>

        <td>
          {date.toLocaleDateString("en-IN")}
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

        <td>

          <div className="action-buttons">

            {isEditing ? (
              <>
                <button
                  className="save-btn"
                  disabled={actionLoading}
                  onClick={() =>
                    updateCount(item.id)
                  }
                >
                  Save
                </button>

                <button
                  className="cancel-btn"
                  disabled={actionLoading}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-btn"
                  onClick={() =>
                    startEdit(item)
                  }
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  disabled={actionLoading}
                  onClick={() =>
                    deleteCount(item.id)
                  }
                >
                  Delete
                </button>
              </>
            )}

          </div>

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
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons button {
  padding: 8px 13px;

  border: none;
  border-radius: 8px;

  font-size: 13px;
  font-weight: 700;

  cursor: pointer;

  transition: 0.2s;
}

.edit-btn {
  background: #eff6ff;

  color: #2563eb;
}

.edit-btn:hover {
  background: #dbeafe;
}

.delete-btn {
  background: #fef2f2;

  color: #dc2626;
}

.delete-btn:hover {
  background: #fee2e2;
}

.save-btn {
  background: #dcfce7;

  color: #15803d;
}

.save-btn:hover {
  background: #bbf7d0;
}

.cancel-btn {
  background: #f1f5f9;

  color: #475569;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.action-buttons button:disabled {
  opacity: 0.55;

  cursor: not-allowed;
}

.edit-input {
  width: 110px;

  height: 38px;

  padding: 0 10px;

  border: 1px solid #cbd5e1;

  border-radius: 8px;

  outline: none;

  font-size: 14px;
  font-weight: 700;

  color: #0f172a;
}

.edit-input:focus {
  border-color: #2563eb;

  box-shadow:
    0 0 0 3px
    rgba(37, 99, 235, 0.08);
}
      `}</style>

    </main>
  );
}