import { Navigate } from "react-router-dom";

export default function SellerRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || user.role !== "seller") {
    return <Navigate to="/" />;
  }

  return children;
}
