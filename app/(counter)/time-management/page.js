"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


// ======================================================
// INDIA DATE HELPERS
// ======================================================

function getTodayIST() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;

  return `${year}-${month}-${day}`;
}


function shiftDate(dateString, amount) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  date.setUTCDate(
    date.getUTCDate() + amount
  );

  const newYear = date.getUTCFullYear();

  const newMonth = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  const newDay = String(
    date.getUTCDate()
  ).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
}


function formatSelectedDate(dateString) {
  const date = new Date(
    `${dateString}T12:00:00+05:30`
  );

  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}


// ======================================================
// TIME HELPERS
// ======================================================

function formatHour(hour) {
  const date = new Date();

  date.setHours(hour, 0, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}


function timeKeyFromTimestamp(timestamp) {
  const parts = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  ).formatToParts(
    new Date(timestamp)
  );

  let hour =
    parts.find(
      (part) => part.type === "hour"
    )?.value || "00";

  const minute =
    parts.find(
      (part) => part.type === "minute"
    )?.value || "00";

  if (hour === "24") {
    hour = "00";
  }

  return `${hour}:${minute}`;
}


// ======================================================
// CREATE 24 HOURLY SLOTS
// ======================================================

function createEmptyRows() {
  return Array.from(
    { length: 24 },
    (_, hour) => {
      const nextHour =
        (hour + 1) % 24;

      const startTime =
        `${String(hour).padStart(
          2,
          "0"
        )}:00`;

      /*
        PostgreSQL TIME does not support
        24:00.

        For 11 PM - 12 AM we use 23:59:59
        as slot_end for now.
      */

      const endTime =
        hour === 23
          ? "23:59:59"
          : `${String(nextHour).padStart(
              2,
              "0"
            )}:00`;

      return {
        id: null,

        startTime,

        endTime,

        label:
          hour === 23
            ? `${formatHour(
                23
              )} - 12:00 AM`
            : `${formatHour(
                hour
              )} - ${formatHour(
                nextHour
              )}`,

        plannedTask: "",

        actualTask: "",

        status: "pending",

        notes: "",
      };
    }
  );
}


// ======================================================
// PAGE
// ======================================================

export default function TimeManagementPage() {
  const router = useRouter();

  const [user, setUser] =
    useState(null);

  const [selectedDate, setSelectedDate] =
    useState(getTodayIST());

  const [rows, setRows] =
    useState(createEmptyRows());

  const [loading, setLoading] =
    useState(true);

  const [savingIndex, setSavingIndex] =
    useState(null);

  const [deletingIndex, setDeletingIndex] =
    useState(null);

  const [message, setMessage] =
    useState("");


  // ====================================================
  // LOAD USER
  // ====================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");

      return;
    }

    try {
      const parsedUser =
        JSON.parse(storedUser);

      setUser(parsedUser);
    } catch (error) {
      console.error(
        "User Parse Error:",
        error
      );

      localStorage.removeItem("user");

      router.push("/login");
    }
  }, [router]);


  // ====================================================
  // LOAD RECORDS WHEN DATE CHANGES
  // ====================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    loadRecords();
  }, [user, selectedDate]);


  // ====================================================
  // LOAD TIME MANAGEMENT RECORDS
  // ====================================================

  async function loadRecords() {
    try {
      setLoading(true);

      setMessage("");

      const response =
        await fetch(
          `/api/time-management?userId=${encodeURIComponent(
            user.userId
          )}&date=${selectedDate}`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load records"
        );
      }

      const emptyRows =
        createEmptyRows();

      /*
        Merge database records
        into hourly rows.
      */

      for (
        const record of data.data || []
      ) {
        const timeKey =
          timeKeyFromTimestamp(
            record.slotStart
          );

        const index =
          emptyRows.findIndex(
            (row) =>
              row.startTime ===
              timeKey
          );

        if (index !== -1) {
          emptyRows[index] = {
            ...emptyRows[index],

            id:
              record.id,

            plannedTask:
              record.plannedTask ||
              "",

            actualTask:
              record.actualTask ||
              "",

            status:
              record.status ||
              "pending",

            notes:
              record.notes ||
              "",
          };
        }
      }

      setRows(emptyRows);

    } catch (error) {
      console.error(
        "Load Time Management Error:",
        error
      );

      setMessage(
        error.message
      );

    } finally {
      setLoading(false);
    }
  }


  // ====================================================
  // UPDATE LOCAL ROW
  // ====================================================

  function updateRow(
    index,
    field,
    value
  ) {
    setRows((previous) =>
      previous.map(
        (row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                [field]: value,
              }
            : row
      )
    );
  }


  // ====================================================
  // SAVE ROW
  // ====================================================

  async function saveRow(
    row,
    index
  ) {
    if (!user) {
      return;
    }

    /*
      Don't save completely
      empty rows.
    */

    if (
      !row.plannedTask.trim() &&
      !row.actualTask.trim() &&
      !row.notes.trim()
    ) {
      alert(
        "Please enter planned task or actual work."
      );

      return;
    }

    try {
      setSavingIndex(index);

      setMessage("");

      let response;


      // ================================================
      // EXISTING RECORD → PUT
      // ================================================

      if (row.id) {
        response =
          await fetch(
            "/api/time-management",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  id:
                    row.id,

                  userId:
                    user.userId,

                  plannedTask:
                    row.plannedTask,

                  actualTask:
                    row.actualTask,

                  status:
                    row.status,

                  notes:
                    row.notes,
                }),
            }
          );
      }

      // ================================================
      // NEW RECORD → POST
      // ================================================

      else {
        response =
          await fetch(
            "/api/time-management",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  userId:
                    user.userId,

                  date:
                    selectedDate,

                  startTime:
                    row.startTime,

                  endTime:
                    row.endTime,

                  plannedTask:
                    row.plannedTask,

                  actualTask:
                    row.actualTask,

                  status:
                    row.status,

                  notes:
                    row.notes,
                }),
            }
          );
      }


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save record"
        );
      }


      /*
        Update returned database id
        without reloading whole page.
      */

      setRows(
        (previous) =>
          previous.map(
            (
              currentRow,
              rowIndex
            ) =>
              rowIndex === index
                ? {
                    ...currentRow,

                    id:
                      data.data.id,

                    plannedTask:
                      data.data
                        .plannedTask ??
                      currentRow
                        .plannedTask,

                    actualTask:
                      data.data
                        .actualTask ??
                      currentRow
                        .actualTask,

                    status:
                      data.data
                        .status ??
                      currentRow
                        .status,

                    notes:
                      data.data
                        .notes ??
                      currentRow
                        .notes,
                  }
                : currentRow
          )
      );


      setMessage(
        `${row.label} saved successfully.`
      );

    } catch (error) {
      console.error(
        "Save Record Error:",
        error
      );

      alert(
        error.message ||
          "Unable to save record"
      );

    } finally {
      setSavingIndex(null);
    }
  }


  // ====================================================
  // DELETE / CLEAR ROW
  // ====================================================

  async function deleteRow(
    row,
    index
  ) {

    /*
      Unsaved row:
      only clear local values.
    */

    if (!row.id) {
      clearRow(index);

      return;
    }


    const confirmed =
      window.confirm(
        `Delete record for ${row.label}?`
      );

    if (!confirmed) {
      return;
    }


    try {
      setDeletingIndex(index);

      const response =
        await fetch(
          "/api/time-management",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  row.id,

                userId:
                  user.userId,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to delete record"
        );
      }


      clearRow(index);


      setMessage(
        `${row.label} record deleted.`
      );

    } catch (error) {
      console.error(
        "Delete Record Error:",
        error
      );

      alert(
        error.message ||
          "Unable to delete record"
      );

    } finally {
      setDeletingIndex(null);
    }
  }


  // ====================================================
  // CLEAR ONE ROW
  // ====================================================

  function clearRow(index) {
    setRows((previous) =>
      previous.map(
        (row, rowIndex) => {

          if (
            rowIndex !== index
          ) {
            return row;
          }

          return {
            ...row,

            id: null,

            plannedTask: "",

            actualTask: "",

            status: "pending",

            notes: "",
          };
        }
      )
    );
  }


  // ====================================================
  // DATE NAVIGATION
  // ====================================================

  function previousDay() {
    setSelectedDate(
      (current) =>
        shiftDate(
          current,
          -1
        )
    );
  }


  function nextDay() {
    setSelectedDate(
      (current) =>
        shiftDate(
          current,
          1
        )
    );
  }


  function goToday() {
    setSelectedDate(
      getTodayIST()
    );
  }


  // ====================================================
  // SUMMARY
  // ====================================================

  const plannedHours =
    rows.filter(
      (row) =>
        row.plannedTask.trim()
    ).length;


  const completedHours =
    rows.filter(
      (row) =>
        row.status ===
        "completed"
    ).length;


  const partialHours =
    rows.filter(
      (row) =>
        row.status ===
        "partial"
    ).length;


  const missedHours =
    rows.filter(
      (row) =>
        row.status ===
        "missed"
    ).length;


  const changedHours =
    rows.filter(
      (row) =>
        row.status ===
        "changed"
    ).length;


  const completionPercentage =
    plannedHours > 0
      ? Math.round(
          (completedHours /
            plannedHours) *
            100
        )
      : 0;


  const today =
    getTodayIST();


  // ====================================================
  // CURRENT INDIA HOUR
  // ====================================================

  const currentHour =
    Number(
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone:
            "Asia/Kolkata",

          hour: "2-digit",

          hourCycle: "h23",
        }
      ).format(new Date())
    );


  // ====================================================
  // JSX
  // ====================================================

  return (
    <main className="time-page">

      <section className="content">

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="page-header">

          <div>

            <span className="small-title">
              TIME MANAGEMENT
            </span>

            <h1>
              Plan Your Day
            </h1>

            <p>
              Record what you planned
              to do and what you
              actually accomplished
              every hour.
            </p>

          </div>


          <div className="date-picker">

            <label>
              Select Date
            </label>

            <input
              type="date"

              value={
                selectedDate
              }

              onChange={(e) =>
                setSelectedDate(
                  e.target.value
                )
              }
            />

          </div>

        </div>


        {/* ======================================
            DATE NAVIGATION
        ====================================== */}

        <div className="date-navigation">

          <button
            onClick={
              previousDay
            }
          >
            ← Previous
          </button>


          <div className="selected-date">

            <strong>
              {formatSelectedDate(
                selectedDate
              )}
            </strong>

            {selectedDate ===
              today && (
              <span>
                Today
              </span>
            )}

          </div>


          <div className="date-actions">

            {selectedDate !==
              today && (

              <button
                className="today-btn"
                onClick={
                  goToday
                }
              >
                Today
              </button>

            )}


            <button
              onClick={
                nextDay
              }
            >
              Next →
            </button>

          </div>

        </div>


        {/* ======================================
            SUMMARY CARDS
        ====================================== */}

        <div className="summary-grid">

          <div className="summary-card">

            <span>
              Planned
            </span>

            <strong>
              {plannedHours}
            </strong>

            <small>
              hours
            </small>

          </div>


          <div className="summary-card completed">

            <span>
              Completed
            </span>

            <strong>
              {completedHours}
            </strong>

            <small>
              hours
            </small>

          </div>


          <div className="summary-card partial">

            <span>
              Partial
            </span>

            <strong>
              {partialHours}
            </strong>

            <small>
              hours
            </small>

          </div>


          <div className="summary-card missed">

            <span>
              Missed
            </span>

            <strong>
              {missedHours}
            </strong>

            <small>
              hours
            </small>

          </div>


          <div className="summary-card changed">

            <span>
              Changed
            </span>

            <strong>
              {changedHours}
            </strong>

            <small>
              hours
            </small>

          </div>


          <div className="summary-card rate">

            <span>
              Completion
            </span>

            <strong>
              {completionPercentage}%
            </strong>

            <small>
              today
            </small>

          </div>

        </div>


        {/* ======================================
            COMPLETION PROGRESS
        ====================================== */}

        <div className="progress-card">

          <div className="progress-heading">

            <span>
              Daily Progress
            </span>

            <strong>
              {completionPercentage}%
            </strong>

          </div>


          <div className="progress-track">

            <div
              className="progress-bar"

              style={{
                width:
                  `${Math.min(
                    completionPercentage,
                    100
                  )}%`,
              }}
            />

          </div>

        </div>


        {/* SUCCESS MESSAGE */}

        {message && (

          <div className="success-message">

            {message}

          </div>

        )}


        {/* ======================================
            TABLE
        ====================================== */}

        <div className="planner-card">

          {loading ? (

            <div className="loading">

              Loading your day...

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      Time
                    </th>

                    <th>
                      Planned Task
                    </th>

                    <th>
                      What I Did
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Notes
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {rows.map(
                    (
                      row,
                      index
                    ) => {

                      const isCurrentHour =
                        selectedDate ===
                          today &&
                        index ===
                          currentHour;


                      return (

                        <tr
                          key={
                            row.startTime
                          }

                          className={
                            isCurrentHour
                              ? "current-hour"
                              : ""
                          }
                        >

                          {/* TIME */}

                          <td className="time-cell">

                            <div className="time-label">

                              {
                                row.label
                              }

                              {isCurrentHour && (

                                <span className="now-badge">
                                  NOW
                                </span>

                              )}

                            </div>

                          </td>


                          {/* PLANNED */}

                          <td>

                            <textarea
                              value={
                                row.plannedTask
                              }

                              placeholder="What will you do?"

                              onChange={(e) =>
                                updateRow(
                                  index,
                                  "plannedTask",
                                  e.target.value
                                )
                              }
                            />

                          </td>


                          {/* ACTUAL */}

                          <td>

                            <textarea
                              value={
                                row.actualTask
                              }

                              placeholder="What did you actually do?"

                              onChange={(e) =>
                                updateRow(
                                  index,
                                  "actualTask",
                                  e.target.value
                                )
                              }
                            />

                          </td>


                          {/* STATUS */}

                          <td>

                            <select
                              value={
                                row.status
                              }

                              className={
                                `status-select status-${row.status}`
                              }

                              onChange={(e) =>
                                updateRow(
                                  index,
                                  "status",
                                  e.target.value
                                )
                              }
                            >

                              <option value="pending">
                                Pending
                              </option>

                              <option value="completed">
                                Completed
                              </option>

                              <option value="partial">
                                Partial
                              </option>

                              <option value="missed">
                                Missed
                              </option>

                              <option value="changed">
                                Changed
                              </option>

                            </select>

                          </td>


                          {/* NOTES */}

                          <td>

                            <textarea
                              className="notes-input"

                              value={
                                row.notes
                              }

                              placeholder="Optional note"

                              onChange={(e) =>
                                updateRow(
                                  index,
                                  "notes",
                                  e.target.value
                                )
                              }
                            />

                          </td>


                          {/* ACTIONS */}

                          <td>

                            <div className="action-buttons">

                              <button
                                className="save-btn"

                                disabled={
                                  savingIndex ===
                                    index ||
                                  deletingIndex ===
                                    index
                                }

                                onClick={() =>
                                  saveRow(
                                    row,
                                    index
                                  )
                                }
                              >

                                {savingIndex ===
                                index
                                  ? "Saving..."
                                  : row.id
                                  ? "Update"
                                  : "Save"}

                              </button>


                              <button
                                className="delete-btn"

                                disabled={
                                  savingIndex ===
                                    index ||
                                  deletingIndex ===
                                    index
                                }

                                onClick={() =>
                                  deleteRow(
                                    row,
                                    index
                                  )
                                }
                              >

                                {deletingIndex ===
                                index
                                  ? "..."
                                  : row.id
                                  ? "Delete"
                                  : "Clear"}

                              </button>

                            </div>

                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </section>


      {/* ========================================
          CSS
      ======================================== */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }


        .time-page {
          min-height: 100vh;

          background: #f8fafc;

          color: #0f172a;

          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }


        .content {
          width: 100%;

          max-width: 1400px;

          margin: 0 auto;

          padding: 50px 25px;
        }


        /* ====================================
           HEADER
        ==================================== */

        .page-header {
          display: flex;

          align-items:
            flex-end;

          justify-content:
            space-between;

          gap: 25px;

          margin-bottom: 25px;
        }


        .small-title {
          color: #2563eb;

          font-size: 12px;

          font-weight: 800;

          letter-spacing: 1.5px;
        }


        .page-header h1 {
          margin:
            8px 0;

          font-size: 38px;

          letter-spacing: -1px;
        }


        .page-header p {
          margin: 0;

          color: #64748b;

          line-height: 1.6;

          max-width: 650px;
        }


        /* ====================================
           DATE PICKER
        ==================================== */

        .date-picker {
          display: flex;

          flex-direction: column;

          gap: 6px;
        }


        .date-picker label {
          color: #64748b;

          font-size: 12px;

          font-weight: 700;
        }


        .date-picker input {
          height: 42px;

          padding: 0 12px;

          border:
            1px solid #cbd5e1;

          border-radius: 9px;

          background: white;

          color: #0f172a;

          font-size: 14px;

          outline: none;
        }


        .date-picker input:focus {
          border-color:
            #2563eb;

          box-shadow:
            0 0 0 3px
            rgba(
              37,
              99,
              235,
              0.08
            );
        }


        /* ====================================
           DATE NAVIGATION
        ==================================== */

        .date-navigation {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          padding: 16px 18px;

          margin-bottom: 20px;

          background: white;

          border:
            1px solid #e2e8f0;

          border-radius: 14px;
        }


        .date-navigation button {
          padding: 9px 14px;

          border:
            1px solid #dbe3ef;

          border-radius: 8px;

          background: white;

          color: #334155;

          font-size: 13px;

          font-weight: 700;

          cursor: pointer;
        }


        .date-navigation button:hover {
          background: #eff6ff;

          color: #2563eb;
        }


        .selected-date {
          display: flex;

          align-items: center;

          gap: 10px;
        }


        .selected-date strong {
          font-size: 15px;
        }


        .selected-date span {
          padding: 5px 9px;

          border-radius: 999px;

          background: #dcfce7;

          color: #15803d;

          font-size: 11px;

          font-weight: 800;
        }


        .date-actions {
          display: flex;

          gap: 8px;
        }


        .today-btn {
          color:
            #2563eb !important;
        }


        /* ====================================
           SUMMARY
        ==================================== */

        .summary-grid {
          display: grid;

          grid-template-columns:
            repeat(
              6,
              minmax(
                130px,
                1fr
              )
            );

          gap: 12px;

          margin-bottom: 16px;
        }


        .summary-card {
          padding: 17px;

          background: white;

          border:
            1px solid #e2e8f0;

          border-radius: 14px;

          display: flex;

          flex-direction: column;

          gap: 5px;
        }


        .summary-card span {
          color: #64748b;

          font-size: 12px;

          font-weight: 700;
        }


        .summary-card strong {
          color: #2563eb;

          font-size: 26px;
        }


        .summary-card small {
          color: #94a3b8;
        }


        .completed strong {
          color: #15803d;
        }


        .partial strong {
          color: #b45309;
        }


        .missed strong {
          color: #dc2626;
        }


        .changed strong {
          color: #7c3aed;
        }


        .rate strong {
          color: #0369a1;
        }


        /* ====================================
           PROGRESS
        ==================================== */

        .progress-card {
          padding: 16px 18px;

          margin-bottom: 20px;

          background: white;

          border:
            1px solid #e2e8f0;

          border-radius: 14px;
        }


        .progress-heading {
          display: flex;

          justify-content:
            space-between;

          margin-bottom: 10px;

          color: #475569;

          font-size: 13px;
        }


        .progress-heading strong {
          color: #2563eb;
        }


        .progress-track {
          height: 8px;

          overflow: hidden;

          border-radius: 999px;

          background: #e2e8f0;
        }


        .progress-bar {
          height: 100%;

          border-radius: 999px;

          background: #2563eb;

          transition:
            width 0.3s ease;
        }


        /* ====================================
           MESSAGE
        ==================================== */

        .success-message {
          padding: 12px 16px;

          margin-bottom: 15px;

          background: #f0fdf4;

          border:
            1px solid #bbf7d0;

          border-radius: 10px;

          color: #15803d;

          font-size: 13px;

          font-weight: 700;
        }


        /* ====================================
           TABLE
        ==================================== */

        .planner-card {
          overflow: hidden;

          background: white;

          border:
            1px solid #e2e8f0;

          border-radius: 18px;

          box-shadow:
            0 12px 35px
            rgba(
              15,
              23,
              42,
              0.05
            );
        }


        .table-wrapper {
          width: 100%;

          max-height: 650px;

          overflow: auto;
        }


        table {
          width: 100%;

          min-width: 1200px;

          border-collapse:
            collapse;
        }


        thead {
          position: sticky;

          top: 0;

          z-index: 10;

          background: #f8fafc;
        }


        th {
          padding: 15px;

          text-align: left;

          color: #64748b;

          font-size: 12px;

          font-weight: 800;

          letter-spacing:
            0.4px;

          border-bottom:
            1px solid #e2e8f0;
        }


        td {
          padding: 11px 15px;

          vertical-align: top;

          border-bottom:
            1px solid #edf2f7;
        }


        tbody tr:hover {
          background: #fafcff;
        }


        /* CURRENT HOUR */

        .current-hour {
          background: #eff6ff;
        }


        .time-cell {
          min-width: 155px;

          white-space: nowrap;
        }


        .time-label {
          display: flex;

          flex-direction: column;

          align-items:
            flex-start;

          gap: 5px;

          color: #334155;

          font-size: 13px;

          font-weight: 700;
        }


        .now-badge {
          padding: 3px 7px;

          border-radius: 999px;

          background: #2563eb;

          color: white;

          font-size: 9px;

          letter-spacing: 0.5px;
        }


        /* ====================================
           TEXT AREA
        ==================================== */

        textarea {
          width: 100%;

          min-width: 220px;

          min-height: 62px;

          padding: 9px 10px;

          resize: vertical;

          border:
            1px solid #dbe3ef;

          border-radius: 8px;

          outline: none;

          font-family: inherit;

          font-size: 13px;

          color: #334155;

          background: white;
        }


        textarea:focus {
          border-color: #2563eb;

          box-shadow:
            0 0 0 3px
            rgba(
              37,
              99,
              235,
              0.07
            );
        }


        .notes-input {
          min-width: 170px;
        }


        /* ====================================
           STATUS
        ==================================== */

        .status-select {
          min-width: 125px;

          height: 38px;

          padding: 0 9px;

          border:
            1px solid #dbe3ef;

          border-radius: 8px;

          outline: none;

          font-size: 12px;

          font-weight: 700;

          cursor: pointer;
        }


        .status-pending {
          background: #f8fafc;

          color: #64748b;
        }


        .status-completed {
          background: #f0fdf4;

          color: #15803d;
        }


        .status-partial {
          background: #fffbeb;

          color: #b45309;
        }


        .status-missed {
          background: #fef2f2;

          color: #dc2626;
        }


        .status-changed {
          background: #f5f3ff;

          color: #7c3aed;
        }


        /* ====================================
           ACTIONS
        ==================================== */

        .action-buttons {
          display: flex;

          gap: 7px;
        }


        .action-buttons button {
          padding: 9px 12px;

          border: none;

          border-radius: 8px;

          font-size: 12px;

          font-weight: 700;

          cursor: pointer;

          transition: 0.2s;
        }


        .save-btn {
          background: #eff6ff;

          color: #2563eb;
        }


        .save-btn:hover:not(:disabled) {
          background: #dbeafe;
        }


        .delete-btn {
          background: #fef2f2;

          color: #dc2626;
        }


        .delete-btn:hover:not(:disabled) {
          background: #fee2e2;
        }


        .action-buttons button:disabled {
          opacity: 0.5;

          cursor:
            not-allowed;
        }


        .loading {
          padding: 80px 20px;

          text-align: center;

          color: #94a3b8;
        }


        /* ====================================
           RESPONSIVE
        ==================================== */

        @media(
          max-width: 1100px
        ) {

          .summary-grid {
            grid-template-columns:
              repeat(
                3,
                1fr
              );
          }

        }


        @media(
          max-width: 700px
        ) {

          .content {
            padding:
              35px 15px;
          }


          .page-header {
            align-items:
              flex-start;

            flex-direction:
              column;
          }


          .page-header h1 {
            font-size: 30px;
          }


          .date-picker {
            width: 100%;
          }


          .date-picker input {
            width: 100%;
          }


          .date-navigation {
            align-items:
              stretch;

            flex-direction:
              column;
          }


          .selected-date {
            justify-content:
              center;

            text-align: center;
          }


          .date-actions {
            justify-content:
              space-between;
          }


          .summary-grid {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

        }

      `}</style>

    </main>
  );
}