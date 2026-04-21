import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function Navbar({ cart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdminPage = location.pathname.startsWith("/admin");
  const isSellerPage = location.pathname.startsWith("/seller");
  const canUseCart = !isAdminPage && !isSellerPage && user?.role !== "seller";

  return (
    <div className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-lg">

      <div className="flex items-center justify-between">

        {/* Logo */}
        <BrandLogo
          size="sm"
          onClick={() => navigate("/")}
          className="cursor-pointer"
        />

        {/* Desktop Menu */}
        <div className="hidden items-center gap-6 md:flex">

          {!isAdminPage && (
            <span
              onClick={() => navigate("/")}
              className="cursor-pointer text-slate-700 transition hover:text-sky-600"
            >
              Home
            </span>
          )}

          {canUseCart && (
            <span
              onClick={() => navigate("/cart")}
              className="relative cursor-pointer text-slate-700 transition hover:text-sky-600"
            >
              Cart 🛒
              {cart?.length > 0 && (
                <span className="absolute -right-3 -top-2 min-w-5 rounded-full bg-rose-500 px-1 text-center text-xs text-white">
                  {cart.length}
                </span>
              )}
            </span>
          )}

          {user?.role === "admin" && (
            <span
              onClick={() => navigate("/admin")}
              className="cursor-pointer text-slate-700 transition hover:text-sky-600"
            >
              Admin Panel
            </span>
          )}

          {user?.role === "seller" && (
            <span
              onClick={() => navigate("/seller")}
              className="cursor-pointer text-slate-700 transition hover:text-sky-600"
            >
              Seller
            </span>
          )}

          {/* User */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">
                👋 {user.name}
              </span>

              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-white transition hover:bg-rose-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <span
              onClick={() => navigate("/login")}
              className="cursor-pointer text-slate-700 transition hover:text-sky-600"
            >
              Login
            </span>
          )}
        </div>

        {/* Mobile Menu */}
        <div
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 md:hidden"
          onClick={() => setOpen(!open)}
        >
          ☰
        </div>
      </div>

      {/* Mobile Dropdown */}
      {open && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">

          {!isAdminPage && (
            <span onClick={() => navigate("/")} className="text-slate-700">
              Home
            </span>
          )}
          {canUseCart && (
            <span onClick={() => navigate("/cart")} className="text-slate-700">
              Cart
            </span>
          )}

          {user?.role === "admin" && (
            <span onClick={() => navigate("/admin")} className="text-slate-700">
              Admin Panel
            </span>
          )}

          {user?.role === "seller" && (
            <span onClick={() => navigate("/seller")} className="text-slate-700">
              Seller
            </span>
          )}

          {user ? (
            <button
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="text-left text-rose-500"
            >
              Logout
            </button>
          ) : (
            <span onClick={() => navigate("/login")} className="text-slate-700">
              Login
            </span>
          )}
        </div>
      )}
    </div>
  );
}
