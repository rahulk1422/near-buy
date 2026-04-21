import { Navigate } from "react-router-dom";
import { OWNER_ADMIN_EMAIL } from "../config/auth";

export default function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const normalizedEmail = user?.email?.trim?.().toLowerCase?.() || "";

  if (!token || !user || user.role !== "admin" || normalizedEmail !== OWNER_ADMIN_EMAIL) {
    return <Navigate to="/" />;
  }

  return children;
}
