"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./Navbar.css";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

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

  const menus = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "History", href: "/history" },
    { name: "Analytics", href: "/analytics" },
  ];

  function logout() {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }

  return (
    <header className="counter-navbar">
      <div className="counter-navbar-inner">

        {/* Logo */}
        <Link href="/dashboard" className="counter-logo">
          Counter App
        </Link>

        {/* Navigation */}
        <nav className="counter-nav-links">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className={`counter-nav-link ${
                pathname === menu.href ? "active" : ""
              }`}
            >
              {menu.name}
            </Link>
          ))}
        </nav>

        {/* User */}
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

      </div>
    </header>
  );
}