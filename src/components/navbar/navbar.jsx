
import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../utils/firebaseconfig";
import { doc, getDoc } from "firebase/firestore";

function NavbarPremium() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMenu = () => setMobileOpen(false);
const links = [
  { name: "Home", to: "/" },
  
  { name: "Products", to: "/products" },
  { name: "Categories", to: "/categories" },
  { name: "Cart", to: "/cart" },
  {name:"Myorder", to:"/Myorder"},
   { name: "About", to: "/about" },
  { name: "Contact", to: "/contact" },
 
];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));

          if (snap.exists()) {
            setIsAdmin(snap.data().role === "admin");
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error(error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 769px)");

    const handleResize = (e) => {
      if (e.matches) {
        setMobileOpen(false);
      }
    };

    media.addEventListener("change", handleResize);

    return () => {
      media.removeEventListener("change", handleResize);
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      closeMenu();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <nav className="navbar-premium">
        <Link to="/" className="logo-link">
          <div className="logo">TechStore</div>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-items desktop">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.to}
              className={({ isActive }) =>
                `item ${isActive ? "item-selected" : ""}`
              }
            >
              {link.name}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `item ${isActive ? "item-selected" : ""}`
              }
            >
              Dashboard
            </NavLink>
          )}
        </div>

        {/* Desktop User Area */}
        <div className="auth-area desktop">
          {currentUser ? (
            <div className="user-box">
              <span>
                👤 {currentUser.displayName || "User"}
              </span>

              <button onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <Link to="/authentication" className="btn-auth">
              Account
            </Link>
          )}
        </div>

        {/* Mobile Menu Icon */}
        <button
          className="mobile-menu-icon"
          onClick={toggleMobile}
          aria-label="Toggle Menu"
        >
          {mobileOpen ? (
            <FaTimes size={24} />
          ) : (
            <FaBars size={24} />
          )}
        </button>

        {/* Mobile Menu */}
        <div className={`mobile-dropdown ${mobileOpen ? "open" : ""}`}>
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.to}
              onClick={closeMenu}
              className={({ isActive }) =>
                `item ${isActive ? "item-selected" : ""}`
              }
            >
              {link.name}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/dashboard"
              onClick={closeMenu}
              className="item"
            >
              Dashboard
            </NavLink>
          )}

          {currentUser ? (
            <div className="mobile-user">
              <span>
                👋 {currentUser.displayName || "User"}
              </span>

              <button onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="mobile-auth">
              <Link
                to="/authentication"
                className="btn-auth"
                onClick={closeMenu}
              >
                Account
              </Link>
            </div>
          )}
        </div>
      </nav>

      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={closeMenu}
        />
      )}
    </>
  );
}

export default NavbarPremium;
