"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [view, setView] = useState("day");

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [data, setData] = useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const parsedUser =
      JSON.parse(storedUser);

    setUser(parsedUser);

    loadAnalytics(
      parsedUser.userId,
      view,
      selectedDate
    );
  }, []);

  useEffect(() => {
    if (!user) return;

    loadAnalytics(
      user.userId,
      view,
      selectedDate
    );

  }, [view, selectedDate]);


  function getToday() {
    const today = new Date();

    const year =
      today.getFullYear();

    const month =
      String(today.getMonth() + 1)
        .padStart(2, "0");

    const day =
      String(today.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
  }


  function formatLocalDate(date) {
    const year =
      date.getFullYear();

    const month =
      String(date.getMonth() + 1)
        .padStart(2, "0");

    const day =
      String(date.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
  }


  function getDateRange(type, dateValue) {
    const selected =
      new Date(
        `${dateValue}T00:00:00`
      );

    let start;
    let end;


    /* DAY */

    if (type === "day") {
      start = new Date(selected);

      end = new Date(selected);

      end.setDate(
        end.getDate() + 1
      );
    }


    /* WEEK */

    if (type === "week") {
      start = new Date(selected);

      const day =
        start.getDay();

      const difference =
        day === 0
          ? -6
          : 1 - day;

      start.setDate(
        start.getDate() +
        difference
      );

      end = new Date(start);

      end.setDate(
        end.getDate() + 7
      );
    }


    /* MONTH */

    if (type === "month") {
      start = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        1
      );

      end = new Date(
        selected.getFullYear(),
        selected.getMonth() + 1,
        1
      );
    }


    return {
      startDate:
        formatLocalDate(start),

      endDate:
        formatLocalDate(end),
    };
  }


  async function loadAnalytics(
    userId,
    selectedView,
    date
  ) {

    try {
      setLoading(true);

      const range =
        getDateRange(
          selectedView,
          date
        );

      const response =
        await fetch(
          `/api/count-analytics` +
          `?userId=${userId}` +
          `&startDate=${range.startDate}` +
          `&endDate=${range.endDate}`
        );

      const result =
        await response.json();

      if (result.success) {
        setData(result.data);
      }

    } catch (error) {

      console.error(
        "Analytics Error:",
        error
      );

    } finally {

      setLoading(false);

    }
  }


  const chartData =
    useMemo(() => {

      if (view === "day") {

        return data.map(
          (item) => {

            const date =
              new Date(item.date);

            return {
              label:
                date.toLocaleTimeString(
                  "en-IN",
                  {
                    hour:
                      "2-digit",

                    minute:
                      "2-digit",
                  }
                ),

              count:
                item.count,
            };
          }
        );

      }


      /*
        For week/month,
        group records by date.

        Since CountHistory stores
        snapshots, we show the LAST
        saved count of each day.
      */

      const grouped = {};

      data.forEach(
        (item) => {

          const date =
            new Date(item.date);

          const key =
            date.toLocaleDateString(
              "en-CA"
            );

          grouped[key] = {
            date,
            count:
              item.count,
          };

        }
      );


      return Object.values(
        grouped
      ).map(
        (item) => ({
          label:
            item.date
              .toLocaleDateString(
                "en-IN",
                {
                  day:
                    "2-digit",

                  month:
                    "short",
                }
              ),

          count:
            item.count,
        })
      );

    }, [data, view]);


  const startCount =
    data.length
      ? data[0].count
      : 0;


  const endCount =
    data.length
      ? data[
          data.length - 1
        ].count
      : 0;


  const difference =
    endCount -
    startCount;


  function logout() {

    localStorage.removeItem(
      "user"
    );

    router.push("/login");

  }


  return (
    <main className="analytics-page">

      <header className="topbar">

        <div className="brand">
          Counter App
        </div>

        <nav>

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              router.push(
                "/history"
              )
            }
          >
            History
          </button>

          <button
            className="active"
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

        <div className="heading">

          <span>
            COUNT ANALYTICS
          </span>

          <h1>
            Track your progress
          </h1>

          <p>
            View your saved count
            by day, week or month.
          </p>

        </div>


        {/* FILTER */}

        <div className="filters">

          <div className="view-buttons">

            <button
              className={
                view === "day"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setView("day")
              }
            >
              Day
            </button>

            <button
              className={
                view === "week"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setView("week")
              }
            >
              Week
            </button>

            <button
              className={
                view === "month"
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setView("month")
              }
            >
              Month
            </button>

          </div>


          <div className="calendar">

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


        {/* SUMMARY */}

        <div className="summary-grid">

          <div className="summary-card">

            <span>
              Records
            </span>

            <strong>
              {data.length}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              Start Count
            </span>

            <strong>
              {startCount}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              Latest Count
            </span>

            <strong>
              {endCount}
            </strong>

          </div>


          <div className="summary-card">

            <span>
              Change
            </span>

            <strong
              className={
                difference >= 0
                  ? "positive"
                  : "negative"
              }
            >
              {difference > 0
                ? "+"
                : ""}

              {difference}
            </strong>

          </div>

        </div>


        {/* CHART */}

        <div className="chart-card">

          <div className="chart-heading">

            <div>

              <span>
                COUNT TREND
              </span>

              <h2>
                {view === "day" &&
                  "Daily Count"}

                {view === "week" &&
                  "Weekly Count"}

                {view === "month" &&
                  "Monthly Count"}
              </h2>

            </div>

          </div>


          {loading ? (

            <div className="message">
              Loading chart...
            </div>

          ) : chartData.length === 0 ? (

            <div className="message">
              No count records
              found for this
              period.
            </div>

          ) : (

            <div
              className="chart-container"
            >

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={
                    chartData
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={
                      false
                    }
                  />

                  <XAxis
                    dataKey="label"
                  />

                  <YAxis />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          )}

        </div>

      </section>


      <style jsx>{`

        * {
          box-sizing:
            border-box;
        }


        .analytics-page {

          min-height:
            100vh;

          background:
            #f8fafc;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          color:
            #0f172a;

        }


        .topbar {

          min-height:
            76px;

          display:
            flex;

          align-items:
            center;

          gap:
            30px;

          padding:
            0 40px;

          background:
            white;

          border-bottom:
            1px solid
            #e2e8f0;

        }


        .brand {

          color:
            #2563eb;

          font-size:
            21px;

          font-weight:
            800;

        }


        nav {

          display:
            flex;

          gap:
            8px;

        }


        nav button {

          padding:
            10px 14px;

          border:
            none;

          border-radius:
            9px;

          background:
            transparent;

          color:
            #64748b;

          font-weight:
            600;

          cursor:
            pointer;

        }


        nav button:hover {

          background:
            #f1f5f9;

        }


        nav .active {

          background:
            #eff6ff;

          color:
            #2563eb;

        }


        .user-area {

          margin-left:
            auto;

          display:
            flex;

          align-items:
            center;

          gap:
            15px;

        }


        .user-area span {

          font-size:
            14px;

          font-weight:
            600;

        }


        .logout {

          padding:
            9px 15px;

          border:
            1px solid
            #e2e8f0;

          border-radius:
            9px;

          background:
            white;

          cursor:
            pointer;

        }


        .content {

          max-width:
            1150px;

          margin:
            auto;

          padding:
            55px 24px;

        }


        .heading {

          margin-bottom:
            30px;

        }


        .heading > span {

          color:
            #2563eb;

          font-size:
            12px;

          font-weight:
            800;

          letter-spacing:
            1.5px;

        }


        .heading h1 {

          margin:
            9px 0 8px;

          font-size:
            38px;

        }


        .heading p {

          margin:
            0;

          color:
            #64748b;

        }


        /* FILTER */


        .filters {

          display:
            flex;

          justify-content:
            space-between;

          align-items:
            flex-end;

          gap:
            20px;

          margin-bottom:
            28px;

          padding:
            22px;

          background:
            white;

          border:
            1px solid
            #e8edf5;

          border-radius:
            16px;

        }


        .view-buttons {

          display:
            flex;

          gap:
            8px;

          padding:
            5px;

          background:
            #f1f5f9;

          border-radius:
            11px;

        }


        .view-buttons button {

          padding:
            10px 18px;

          border:
            none;

          border-radius:
            8px;

          background:
            transparent;

          color:
            #64748b;

          font-weight:
            700;

          cursor:
            pointer;

        }


        .view-buttons .selected {

          background:
            white;

          color:
            #2563eb;

          box-shadow:
            0 3px 10px
            rgba(
              15,
              23,
              42,
              .08
            );

        }


        .calendar label {

          display:
            block;

          margin-bottom:
            7px;

          color:
            #475569;

          font-size:
            13px;

          font-weight:
            700;

        }


        .calendar input {

          height:
            43px;

          padding:
            0 12px;

          border:
            1px solid
            #dbe3ef;

          border-radius:
            9px;

          outline:
            none;

        }


        /* SUMMARY */


        .summary-grid {

          display:
            grid;

          grid-template-columns:
            repeat(
              4,
              1fr
            );

          gap:
            18px;

          margin-bottom:
            28px;

        }


        .summary-card {

          padding:
            22px;

          background:
            white;

          border:
            1px solid
            #e8edf5;

          border-radius:
            15px;

        }


        .summary-card span {

          display:
            block;

          margin-bottom:
            9px;

          color:
            #64748b;

          font-size:
            13px;

          font-weight:
            600;

        }


        .summary-card strong {

          font-size:
            27px;

        }


        .positive {

          color:
            #059669;

        }


        .negative {

          color:
            #dc2626;

        }


        /* CHART */


        .chart-card {

          padding:
            30px;

          background:
            white;

          border:
            1px solid
            #e8edf5;

          border-radius:
            20px;

          box-shadow:
            0 14px 40px
            rgba(
              15,
              23,
              42,
              .04
            );

        }


        .chart-heading {

          margin-bottom:
            25px;

        }


        .chart-heading span {

          color:
            #2563eb;

          font-size:
            11px;

          font-weight:
            800;

          letter-spacing:
            1.5px;

        }


        .chart-heading h2 {

          margin:
            8px 0 0;

          font-size:
            25px;

        }


        .chart-container {

          width:
            100%;

          height:
            390px;

        }


        .message {

          padding:
            90px 20px;

          text-align:
            center;

          color:
            #94a3b8;

        }


        @media(
          max-width:
            850px
        ) {

          .summary-grid {

            grid-template-columns:
              repeat(
                2,
                1fr
              );

          }

        }


        @media(
          max-width:
            650px
        ) {

          .topbar {

            padding:
              16px 20px;

            flex-wrap:
              wrap;

          }


          nav {

            order:
              3;

            width:
              100%;

          }


          .user-area span {

            display:
              none;

          }


          .content {

            padding:
              40px 18px;

          }


          .heading h1 {

            font-size:
              30px;

          }


          .filters {

            align-items:
              stretch;

            flex-direction:
              column;

          }


          .view-buttons {

            width:
              100%;

          }


          .view-buttons button {

            flex:
              1;

          }


          .calendar input {

            width:
              100%;

          }


          .summary-grid {

            grid-template-columns:
              1fr 1fr;

          }


          .chart-card {

            padding:
              22px 12px;

          }

        }

      `}</style>

    </main>
  );
}