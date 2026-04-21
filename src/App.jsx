import { useState, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import SellerRoute from "./components/SellerRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Cart from "./pages/Cart";
import AdminDashboard from "./pages/AdminDashboard";
import SellerDashboard from "./pages/SellerDashboard";

export default function App() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  return (
    <>
      {location.pathname !== "/login" && <Navbar cart={cart} />}

      <Routes>

        <Route path="/" element={<Home cart={cart} setCart={setCart} />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              {user?.role === "seller" ? (
                <Navigate to="/seller" replace />
              ) : (
                <Cart cart={cart} setCart={setCart} />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/seller"
          element={
            <SellerRoute>
              <SellerDashboard />
            </SellerRoute>
          }
        />

      </Routes>
    </>
  );
}
