"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./Navbar.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
    const router = useRouter();
  const [user , setUser] = useState<any>("Test")
 const userdata = localStorage.getItem("user")
 


 useEffect(()=>{
 if(userdata){
   const data =   JSON.parse(userdata)
    setUser(data)
 }
 },[])


  const menus = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "History", href: "/history" },
    { name: "Analytics", href: "/analytics" },
  ];


 function logout() {
    localStorage.removeItem("user");

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
            {user.name}
          </span>

          <button className="counter-logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}