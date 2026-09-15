"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./Navbar.css";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // =========================================
  // Load logged-in user
  // =========================================

  useEffect(() => {
    const userdata = localStorage.getItem("user");

    if (userdata) {
      try {
        const data = JSON.parse(userdata);

        setUser(data);
      } catch (error) {
        console.error("Invalid user data:", error);
      }
    }
  }, []);

  // =========================================
  // Close mobile menu after page changes
  // =========================================

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // =========================================
  // Navigation
  // =========================================

  const menus = [
    {
      name: "Dashboard",
      href: "/dashboard",
    },
    {
      name: "History",
      href: "/history",
    },
    {
      name: "Analytics",
      href: "/analytics",
    },
    {
      name: "Time Management",
      href: "/time-management",
    },
  ];

  // =========================================
  // Logout
  // =========================================

  function logout() {
    localStorage.removeItem("user");

    setUser(null);

    setMobileMenuOpen(false);

    router.push("/login");
  }

  return (
    <header className="counter-navbar">
      <div className="counter-navbar-inner">

        {/* ====================================
            LOGO
        ==================================== */}

        <Link
          href="/dashboard"
          className="counter-logo"
        >
          Counter App
        </Link>


        {/* ====================================
            DESKTOP NAVIGATION
        ==================================== */}

        <nav className="counter-nav-links">

          {menus.map((menu) => (

            <Link
              key={menu.href}
              href={menu.href}
              className={`counter-nav-link ${
                pathname === menu.href
                  ? "active"
                  : ""
              }`}
            >
              {menu.name}
            </Link>

          ))}

        </nav>


        {/* ====================================
            DESKTOP USER
        ==================================== */}

        <div className="counter-nav-user">

          <span className="counter-user-name">
            {user?.name || "User"}
          </span>

          <button
            className="counter-logout-btn"
            onClick={logout}
          >
            Logout
          </button>

        </div>


        {/* ====================================
            MOBILE HAMBURGER
        ==================================== */}

        <button
          className={`counter-menu-toggle ${
            mobileMenuOpen ? "open" : ""
          }`}
          onClick={() =>
            setMobileMenuOpen(
              (previous) => !previous
            )
          }
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
        >

          <span></span>
          <span></span>
          <span></span>

        </button>

      </div>


      {/* ======================================
          MOBILE MENU
      ====================================== */}

      <div
        className={`counter-mobile-menu ${
          mobileMenuOpen
            ? "show"
            : ""
        }`}
      >

        {/* User Information */}

        <div className="counter-mobile-user">

          <div className="counter-mobile-avatar">

            {user?.name
              ? user.name
                  .charAt(0)
                  .toUpperCase()
              : "U"}

          </div>

          <div>

            <span className="counter-mobile-user-label">
              Logged in as
            </span>

            <strong>
              {user?.name || "User"}
            </strong>

          </div>

        </div>


        {/* Navigation */}

        <nav className="counter-mobile-links">

          {menus.map((menu) => (

            <Link
              key={menu.href}
              href={menu.href}
              className={`counter-mobile-link ${
                pathname === menu.href
                  ? "active"
                  : ""
              }`}
            >
              <span>
                {getMenuIcon(menu.name)}
              </span>

              {menu.name}
            </Link>

          ))}

        </nav>


        {/* Logout */}

        <button
          className="counter-mobile-logout"
          onClick={logout}
        >
          Logout
        </button>

      </div>

    </header>
  );
}


// ===========================================
// Simple navigation icons
// ===========================================

function getMenuIcon(name: string) {

  switch (name) {

    case "Dashboard":
      return "⌂";

    case "History":
      return "↺";

    case "Analytics":
      return "▥";

    case "Time Management":
      return "◷";

    default:
      return "•";
  }

}