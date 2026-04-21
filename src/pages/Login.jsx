import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import getApiErrorMessage from "../lib/getApiErrorMessage";
import BrandLogo from "../components/BrandLogo";
import { OWNER_ADMIN_EMAIL } from "../config/auth";

export default function Login() {
  const navigate = useNavigate();

  // 🔹 State
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const redirectByRole = (user) => {
    if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "seller") {
      navigate("/seller");
    } else {
      navigate("/");
    }
  };

  // 🔐 Login / Signup
  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    try {
      if (isSignup) {
        // 👉 Signup
        await apiClient.post("/api/auth/signup", {
          name: normalizedName,
          email: normalizedEmail,
          password,
          role,
        });

        alert("Signup successful ✅");
      }

      const res = await apiClient.post("/api/auth/login", {
        email: normalizedEmail,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      alert(isSignup ? "Account ready 🎉" : "Login successful 🎉");
      redirectByRole(res.data.user);
    } catch (err) {
      alert(
        getApiErrorMessage(
          err,
          "There was a problem with login or signup. Please try again."
        )
      );
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-red from-blue-500 to-purple-600">
      <div className="bg-white p-6 rounded-xl shadow w-80">
        {/* Toggle */}
        <div className="flex justify-between mb-3">
          <button
            onClick={() => setIsSignup(false)}
            className={!isSignup ? "font-bold text-blue-600" : "text-gray-500"}
          >
            Login
          </button>
          <button
            onClick={() => setIsSignup(true)}
            className={isSignup ? "font-bold text-blue-600" : "text-gray-500"}
          >
            Signup
          </button>
        </div>

        {/* Logo */}
        <BrandLogo size="lg" showTagline centered className="mx-auto mb-4" />

        {/* Title */}
        <h2 className="text-center font-bold mb-4">
          {isSignup ? "Create Account" : "Login"}
        </h2>

        {isSignup ? (
          <>
            <select
              className="w-full border p-2 mb-3 rounded focus:outline-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="seller">Seller</option>
            </select>

          </>
        ) : (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            The admin panel is reserved for the owner account only:
            {" "}
            <b>{OWNER_ADMIN_EMAIL}</b>
          </div>
        )}

        {/* Name (Signup only) */}
        {isSignup && (
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border p-2 mb-3 rounded focus:outline-blue-500"
            autoCapitalize="words"
          />
        )}

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 mb-3 rounded focus:outline-blue-500"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 mb-3 rounded focus:outline-blue-500"
          autoCapitalize="none"
          autoCorrect="off"
        />

        {/* Forgot Password */}
        {!isSignup && (
          <p
            onClick={() => setShowReset(true)}
            className="text-blue-500 text-sm cursor-pointer mb-3 hover:underline"
          >

            {showReset && (
  <>
    <input
      type="password"
      placeholder="New Password"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      className="w-full border p-2 mb-3 rounded"
    />

    <button
      onClick={async () => {
        try {
          await apiClient.post("/api/auth/reset-password", {
            email: email.trim().toLowerCase(),
            newPassword,
          });

          alert("Password updated successfully.");
          setShowReset(false);
        } catch (err) {
          alert(
            getApiErrorMessage(
              err,
              "Password reset failed. Please check the email and your network."
            )
          );
        }
      }}
      className="w-full bg-green-500 text-white py-2 rounded"
    >
      Reset Password
    </button>
  </>
  
)}
            
          </p>
        )}

        {/* Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
        >
          {isSignup ? "Create Account" : "Login"}
        </button>

        {/* Back */}
        <p
          onClick={() => navigate("/")}
          className="text-center text-sm mt-3 cursor-pointer hover:text-blue-500"
        >
          ⬅ Back to Home
        </p>
      </div>
    </div>
  );
}
