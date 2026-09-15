
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();

  // ==========================================
  // USER + HISTORY STATES
  // ==========================================

  const [user, setUser] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  // ==========================================
  // EDIT STATES
  // ==========================================

  const [editingId, setEditingId] = useState(null);

  const [editCount, setEditCount] = useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  // ==========================================
  // PAGINATION STATES
  // ==========================================

  const [currentPage, setCurrentPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalRecords, setTotalRecords] =
    useState(0);

  // Number of rows per page
  const pageSize = 5;

  // ==========================================
  // LOAD USER
  // ==========================================

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
        "Unable to parse user:",
        error
      );

      localStorage.removeItem("user");

      router.push("/login");
    }
  }, [router]);

  // ==========================================
  // FETCH HISTORY WHEN PAGE CHANGES
  // ==========================================

  useEffect(() => {
    if (!user) {
      return;
    }

    loadHistory(
      user.userId,
      currentPage
    );
  }, [user, currentPage]);

  // ==========================================
  // LOAD HISTORY
  // ==========================================

  async function loadHistory(
    userId,
    page = 1
  ) {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/count-history?userId=${encodeURIComponent(
          userId
        )}&page=${page}&limit=${pageSize}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          data.message ||
          "Unable to fetch history"
        );

        return;
      }

      if (data.success) {
        setHistory(
          data.data || []
        );

        if (data.pagination) {
          setCurrentPage(
            Number(
              data.pagination.page
            ) || 1
          );

          setTotalPages(
            Number(
              data.pagination.totalPages
            ) || 1
          );

          setTotalRecords(
            Number(
              data.pagination.totalRecords
            ) || 0
          );
        }
      }
    } catch (error) {
      console.error(
        "History Error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // START EDIT
  // ==========================================

  function startEdit(item) {
    setEditingId(item.id);

    setEditCount(
      item.count.toString()
    );
  }

  // ==========================================
  // CANCEL EDIT
  // ==========================================

  function cancelEdit() {
    setEditingId(null);

    setEditCount("");
  }

  // ==========================================
  // UPDATE COUNT
  // ==========================================

  async function updateCount(id) {
    if (!user) {
      return;
    }

    const count =
      Number(editCount);

    if (
      !Number.isInteger(count) ||
      count < 0
    ) {
      alert(
        "Please enter a valid count"
      );

      return;
    }

    try {
      setActionLoading(true);

      const response =
        await fetch(
          "/api/count-history",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: id,

              userId:
                user.userId,

              count: count,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
          "Unable to update record"
        );

        return;
      }

      /*
        Update the count directly
        on the current page.
      */

      setHistory(
        (previous) =>
          previous.map(
            (item) =>
              item.id === id
                ? {
                  ...item,

                  count:
                    Number(
                      data.data
                        .count
                    ),
                }
                : item
          )
      );

      setEditingId(null);

      setEditCount("");
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong"
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ==========================================
  // DELETE COUNT
  // ==========================================

  async function deleteCount(id) {
    if (!user) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this record?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);

      const response =
        await fetch(
          "/api/count-history",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: id,

              userId:
                user.userId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
          "Unable to delete record"
        );

        return;
      }

      /*
        After deleting a record,
        calculate how many pages
        should remain.
      */

      const newTotalRecords =
        Math.max(
          totalRecords - 1,
          0
        );

      const newTotalPages =
        Math.max(
          1,

          Math.ceil(
            newTotalRecords /
            pageSize
          )
        );

      /*
        Example:

        currentPage = 5

        After delete,
        totalPages becomes 4.

        Move user back to
        page 4 automatically.
      */

      if (
        currentPage >
        newTotalPages
      ) {
        setCurrentPage(
          newTotalPages
        );
      } else {
        /*
          Reload current page
          so next DB record fills
          the deleted row position.
        */

        await loadHistory(
          user.userId,
          currentPage
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Something went wrong"
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ==========================================
  // CHANGE PAGE
  // ==========================================

  function changePage(page) {
    if (
      page < 1 ||
      page > totalPages ||
      page === currentPage
    ) {
      return;
    }

    /*
      Close edit mode
      while moving page
    */

    setEditingId(null);

    setEditCount("");

    setCurrentPage(page);
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  function logout() {
    localStorage.removeItem(
      "user"
    );

    router.push("/login");
  }

  // ==========================================
  // PAGE NUMBERS
  // ==========================================

  function getPageNumbers() {
    /*
      If there are only a few
      pages, show all of them.
    */

    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },

        (_, index) =>
          index + 1
      );
    }

    /*
      For large numbers of pages,
      show limited page buttons.
    */

    let startPage =
      Math.max(
        currentPage - 2,
        1
      );

    let endPage =
      Math.min(
        startPage + 4,
        totalPages
      );

    if (
      endPage - startPage <
      4
    ) {
      startPage =
        Math.max(
          endPage - 4,
          1
        );
    }

    return Array.from(
      {
        length:
          endPage -
          startPage +
          1,
      },

      (_, index) =>
        startPage + index
    );
  }

  // ==========================================
  // JSX
  // ==========================================

  return (
    <main className="history-page">

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <section className="content">

        {/* PAGE HEADING */}

        <div className="page-heading">

          <div>

            <span className="small-title">
              COUNT HISTORY
            </span>

            <h1>
              Your Saved Counts
            </h1>

            <p>
              View all count values
              that you have previously
              saved.
            </p>

          </div>


          <div className="record-count">

            {totalRecords}{" "}

            {totalRecords === 1
              ? "Record"
              : "Records"}

          </div>

        </div>


        {/* ====================================
            HISTORY CARD
        ==================================== */}

        <div className="history-card">

          {loading ? (

            // ================================
            // LOADING
            // ================================

            <div className="status">

              Loading history...

            </div>

          ) : history.length === 0 ? (

            // ================================
            // EMPTY STATE
            // ================================

            <div className="empty-state">

              <div className="empty-icon">
                0
              </div>

              <h3>
                No history found
              </h3>

              <p>
                Save your first count
                from the dashboard.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard"
                  )
                }
              >
                Go to Dashboard
              </button>

            </div>

          ) : (

            // ================================
            // TABLE
            // ================================

            <>

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>
                        #
                      </th>

                      <th>
                        Count
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Time
                      </th>

                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {history.map(
                      (
                        item,
                        index
                      ) => {

                        const date =
                          new Date(
                            item.date
                          );

                        const isEditing =
                          editingId ===
                          item.id;

                        /*
                          Correct serial
                          number for
                          pagination.

                          Page 1:
                          1-5

                          Page 2:
                          6-10
                        */

                        const rowNumber =
                          (currentPage -
                            1) *
                          pageSize +
                          index +
                          1;

                        return (

                          <tr
                            key={
                              item.id
                            }
                          >

                            {/* NUMBER */}

                            <td>

                              {
                                rowNumber
                              }

                            </td>


                            {/* COUNT */}

                            <td>

                              {isEditing ? (

                                <input
                                  type="number"

                                  min="0"

                                  value={
                                    editCount
                                  }

                                  onChange={(
                                    e
                                  ) =>
                                    setEditCount(
                                      e
                                        .target
                                        .value
                                    )
                                  }

                                  className="edit-input"
                                />

                              ) : (

                                <span className="count">

                                  {
                                    item.count
                                  }

                                </span>

                              )}

                            </td>


                            {/* DATE */}

                            <td>

                               {date.toLocaleDateString("en-IN")}


                            </td>


                            {/* TIME */}

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


                            {/* ACTIONS */}

                            <td>

                              <div className="action-buttons">

                                {isEditing ? (

                                  <>

                                    <button
                                      className="save-btn"

                                      disabled={
                                        actionLoading
                                      }

                                      onClick={() =>
                                        updateCount(
                                          item.id
                                        )
                                      }
                                    >
                                      Save
                                    </button>


                                    <button
                                      className="cancel-btn"

                                      disabled={
                                        actionLoading
                                      }

                                      onClick={
                                        cancelEdit
                                      }
                                    >
                                      Cancel
                                    </button>

                                  </>

                                ) : (

                                  <>

                                    <button
                                      className="edit-btn"

                                      disabled={
                                        actionLoading
                                      }

                                      onClick={() =>
                                        startEdit(
                                          item
                                        )
                                      }
                                    >
                                      Edit
                                    </button>


                                    <button
                                      className="delete-btn"

                                      disabled={
                                        actionLoading
                                      }

                                      onClick={() =>
                                        deleteCount(
                                          item.id
                                        )
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
                      }
                    )}

                  </tbody>

                </table>

              </div>


              {/* ==============================
                  PAGINATION
              ============================== */}

              {totalPages > 1 && (

                <div className="pagination-container">

                  {/* INFORMATION */}

                  <div className="pagination-info">

                    Page{" "}

                    <strong>
                      {currentPage}
                    </strong>

                    {" "}of{" "}

                    <strong>
                      {totalPages}
                    </strong>

                  </div>


                  {/* BUTTONS */}

                  <div className="pagination">

                    {/* PREVIOUS */}

                    <button
                      className="pagination-nav"

                      disabled={
                        currentPage ===
                        1
                      }

                      onClick={() =>
                        changePage(
                          currentPage -
                          1
                        )
                      }
                    >
                      Previous
                    </button>


                    {/* FIRST PAGE */}

                    {totalPages >
                      7 &&
                      getPageNumbers()[0] >
                      1 && (

                        <>

                          <button
                            className={
                              currentPage ===
                                1
                                ? "page-number active-page"
                                : "page-number"
                            }

                            onClick={() =>
                              changePage(
                                1
                              )
                            }
                          >
                            1
                          </button>

                          {getPageNumbers()[0] >
                            2 && (

                              <span className="pagination-dots">
                                ...
                              </span>

                            )}

                        </>

                      )}


                    {/* PAGE NUMBERS */}

                    {getPageNumbers().map(
                      (
                        pageNumber
                      ) => (

                        <button
                          key={
                            pageNumber
                          }

                          className={
                            currentPage ===
                              pageNumber
                              ? "page-number active-page"
                              : "page-number"
                          }

                          onClick={() =>
                            changePage(
                              pageNumber
                            )
                          }
                        >
                          {
                            pageNumber
                          }
                        </button>

                      )
                    )}


                    {/* LAST PAGE */}

                    {totalPages >
                      7 &&
                      getPageNumbers()[
                      getPageNumbers()
                        .length - 1
                      ] <
                      totalPages && (

                        <>

                          {getPageNumbers()[
                            getPageNumbers()
                              .length - 1
                          ] <
                            totalPages -
                            1 && (

                              <span className="pagination-dots">
                                ...
                              </span>

                            )}

                          <button
                            className={
                              currentPage ===
                                totalPages
                                ? "page-number active-page"
                                : "page-number"
                            }

                            onClick={() =>
                              changePage(
                                totalPages
                              )
                            }
                          >
                            {
                              totalPages
                            }
                          </button>

                        </>

                      )}


                    {/* NEXT */}

                    <button
                      className="pagination-nav"

                      disabled={
                        currentPage ===
                        totalPages
                      }

                      onClick={() =>
                        changePage(
                          currentPage +
                          1
                        )
                      }
                    >
                      Next
                    </button>

                  </div>

                </div>

              )}

            </>

          )}

        </div>

      </section>


      {/* ======================================
          CSS
      ====================================== */}

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


        /* ===================================
           CONTENT
        =================================== */

        .content {
          width: 100%;

          max-width: 1100px;

          margin: 0 auto;

          padding: 60px 24px;
        }


        /* ===================================
           PAGE HEADING
        =================================== */

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


        /* ===================================
           TOTAL RECORDS
        =================================== */

        .record-count {
          padding: 10px 15px;

          background: #eff6ff;

          border-radius: 999px;

          color: #2563eb;

          font-size: 13px;

          font-weight: 700;

          white-space: nowrap;
        }


        /* ===================================
           CARD
        =================================== */

        .history-card {
          background: white;

          border:
            1px solid #e8edf5;

          border-radius: 20px;

          overflow: hidden;

          box-shadow:
            0 14px 40px
            rgba(
              15,
              23,
              42,
              0.05
            );
        }


        /* ===================================
           TABLE
        =================================== */

        .table-wrapper {
          width: 100%;
           max-height:500px;
          overflow-x: auto;
        }


        table {
          width: 100%;

          border-collapse:
            collapse;

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

          letter-spacing: 0.5px;

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


        /* ===================================
           COUNT
        =================================== */

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


        /* ===================================
           STATUS
        =================================== */

        .status {
          padding: 60px 20px;

          text-align: center;

          color: #94a3b8;
        }


        /* ===================================
           EMPTY STATE
        =================================== */

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


        /* ===================================
           ACTION BUTTONS
        =================================== */

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


        .edit-btn:hover:not(:disabled) {
          background: #dbeafe;
        }


        .delete-btn {
          background: #fef2f2;

          color: #dc2626;
        }


        .delete-btn:hover:not(:disabled) {
          background: #fee2e2;
        }


        .save-btn {
          background: #dcfce7;

          color: #15803d;
        }


        .save-btn:hover:not(:disabled) {
          background: #bbf7d0;
        }


        .cancel-btn {
          background: #f1f5f9;

          color: #475569;
        }


        .cancel-btn:hover:not(:disabled) {
          background: #e2e8f0;
        }


        .action-buttons button:disabled {
          opacity: 0.55;

          cursor: not-allowed;
        }


        /* ===================================
           EDIT INPUT
        =================================== */

        .edit-input {
          width: 110px;

          height: 38px;

          padding: 0 10px;

          border:
            1px solid #cbd5e1;

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
            rgba(
              37,
              99,
              235,
              0.08
            );
        }


        /* ===================================
           PAGINATION CONTAINER
        =================================== */

        .pagination-container {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          padding:
            18px 22px;

          border-top:
            1px solid #edf2f7;

          background: #ffffff;
        }


        /* ===================================
           PAGINATION INFORMATION
        =================================== */

        .pagination-info {
          color: #64748b;

          font-size: 13px;

          white-space: nowrap;
        }


        .pagination-info strong {
          color: #0f172a;
        }


        /* ===================================
           PAGINATION BUTTON AREA
        =================================== */

        .pagination {
          display: flex;

          align-items: center;

          justify-content:
            flex-end;

          gap: 7px;

          flex-wrap: wrap;
        }


        .pagination button {
          min-width: 38px;

          height: 38px;

          padding: 0 12px;

          border:
            1px solid #e2e8f0;

          border-radius: 8px;

          background: white;

          color: #475569;

          font-size: 13px;

          font-weight: 700;

          cursor: pointer;

          transition:
            all 0.2s ease;
        }


        .pagination button:hover:not(:disabled) {
          background: #eff6ff;

          color: #2563eb;

          border-color: #bfdbfe;
        }


        /* ACTIVE PAGE */

        .pagination .active-page {
          background: #2563eb;

          border-color: #2563eb;

          color: white;
        }


        .pagination .active-page:hover {
          background: #1d4ed8;

          border-color: #1d4ed8;

          color: white;
        }


        /* DISABLED */

        .pagination button:disabled {
          opacity: 0.4;

          cursor: not-allowed;

          background: #f8fafc;
        }


        /* PREVIOUS + NEXT */

        .pagination-nav {
          padding-left: 15px !important;

          padding-right: 15px !important;
        }


        /* DOTS */

        .pagination-dots {
          min-width: 25px;

          text-align: center;

          color: #94a3b8;

          font-weight: 700;
        }


        /* ===================================
           MOBILE
        =================================== */

        @media(max-width: 700px) {

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


          .pagination-container {
            flex-direction:
              column;

            align-items:
              flex-start;
          }


          .pagination {
            width: 100%;

            justify-content:
              flex-start;

            overflow-x: auto;

            padding-bottom: 4px;
          }

        }

      `}</style>

    </main>
  );
}