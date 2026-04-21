import { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import getApiErrorMessage from "../lib/getApiErrorMessage";
import { OWNER_ADMIN_EMAIL } from "../config/auth";

export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState("");

  const loadDashboard = async () => {
    setIsLoading(true);

    try {
      const [usersRes, productsRes] = await Promise.all([
        apiClient.get("/api/auth/users"),
        apiClient.get("/api/products"),
      ]);

      setUsers(usersRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      alert(getApiErrorMessage(err, "Admin dashboard data could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleUserAction = async (targetUser, action) => {
    const isOwner = targetUser.email?.trim().toLowerCase() === OWNER_ADMIN_EMAIL;
    if (isOwner) {
      alert("The owner admin account cannot be modified.");
      return;
    }

    const actionLabels = {
      block: "block",
      unblock: "unblock",
      delete: "delete",
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabels[action]} ${targetUser.email}?`
    );

    if (!confirmed) return;

    setBusyUserId(targetUser._id || targetUser.email);

    try {
      if (action === "delete") {
        await apiClient.delete(`/api/auth/users/${targetUser._id}`);
        setUsers((prev) => prev.filter((item) => item._id !== targetUser._id));
      } else {
        const isBlocked = action === "block";
        const res = await apiClient.patch(`/api/auth/users/${targetUser._id}/status`, {
          isBlocked,
        });

        setUsers((prev) =>
          prev.map((item) =>
            item._id === targetUser._id ? { ...item, ...res.data } : item
          )
        );
      }
    } catch (err) {
      alert(
        getApiErrorMessage(
          err,
          `The user could not be ${action === "delete" ? "deleted" : "updated"}.`
        )
      );
    } finally {
      setBusyUserId("");
    }
  };

  const admins = users.filter((item) => item.role === "admin").length;
  const sellers = users.filter((item) => item.role === "seller").length;
  const customers = users.filter(
    (item) => !item.role || item.role === "user"
  ).length;
  const customerUsers = [...users]
    .filter((item) => !item.role || item.role === "user")
    .reverse();
  const sellerUsers = [...users]
    .filter((item) => item.role === "seller")
    .reverse();
  const totalShops = products.reduce(
    (sum, product) => sum + (product.shops?.length || 0),
    0
  );

  const recentProducts = [...products].slice(-4).reverse();
  const summaryCards = [
    {
      label: "Total Users",
      value: customerUsers.length,
      valueClassName: "text-slate-800",
      href: "#recent-customers",
    },
    {
      label: "Sellers",
      value: sellers,
      valueClassName: "text-amber-500",
      href: "#recent-sellers",
    },
    {
      label: "Products",
      value: products.length,
      valueClassName: "text-emerald-600",
      href: "#recent-products",
    },
    {
      label: "Shop Entries",
      value: totalShops,
      valueClassName: "text-cyan-600",
      href: "#recent-products",
    },
  ];

  const renderUserCard = (item) => (
    <div
      key={item._id || item.email}
      className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <p className="font-semibold text-slate-800">
          {item.name || "Unnamed User"}
        </p>
        <p className="text-sm text-slate-500">{item.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {item.isBlocked && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-rose-700">
            Blocked
          </span>
        )}
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
          {item.role || "user"}
        </span>
        {item.email?.trim().toLowerCase() === OWNER_ADMIN_EMAIL ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700">
            Owner
          </span>
        ) : (
          <>
            <button
              onClick={() =>
                handleUserAction(item, item.isBlocked ? "unblock" : "block")
              }
              disabled={busyUserId === (item._id || item.email)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold text-white transition ${
                item.isBlocked
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-500 hover:bg-amber-600"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {busyUserId === (item._id || item.email)
                ? "Working..."
                : item.isBlocked
                  ? "Unblock"
                  : "Block"}
            </button>
            <button
              onClick={() => handleUserAction(item, "delete")}
              disabled={busyUserId === (item._id || item.email)}
              className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyUserId === (item._id || item.email) ? "Working..." : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.25em] text-white/70">
            Admin Control Room
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Welcome back{user?.name ? `, ${user.name}` : ""}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            Get a quick health view of users, seller activity, and the product
            network from here.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.valueClassName}`}>
                {card.value}
              </p>
              <p className="mt-3 text-sm font-medium text-sky-600">
                Click to view details
              </p>
            </a>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div id="user-breakdown" className="rounded-3xl bg-white p-6 shadow scroll-mt-28">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">
                  User Breakdown
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Role-wise distribution of the current user base.
                </p>
              </div>
              <button
                onClick={loadDashboard}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Admins</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {admins}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Customers</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {customers}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Sellers</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {sellers}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              Status:
              {" "}
              {isLoading
                ? "Dashboard data is loading..."
                : "Live admin summary is ready."}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-semibold text-slate-800">
              Admin Snapshot
            </h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-slate-500">Signed in as</p>
                <p className="mt-1 break-all font-semibold text-slate-800">
                  {user?.email || "Not available"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-slate-500">Access level</p>
                <p className="mt-1 font-semibold text-slate-800">Admin</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-slate-500">Operational note</p>
                <p className="mt-1">
                  Testing can continue through fallback storage even when Atlas
                  is unavailable.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div id="recent-customers" className="rounded-3xl bg-white p-6 shadow scroll-mt-28">
            <h2 className="text-2xl font-semibold text-slate-800">
              User Cards
            </h2>
            {customerUsers.length === 0 ? (
              <p className="mt-4 text-slate-500">No users are available yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {customerUsers.map(renderUserCard)}
              </div>
            )}
          </div>

          <div id="recent-sellers" className="rounded-3xl bg-white p-6 shadow scroll-mt-28">
            <h2 className="text-2xl font-semibold text-slate-800">
              Seller Cards
            </h2>
            {sellerUsers.length === 0 ? (
              <p className="mt-4 text-slate-500">No sellers are available yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {sellerUsers.map(renderUserCard)}
              </div>
            )}
          </div>

          <div id="recent-products" className="rounded-3xl bg-white p-6 shadow scroll-mt-28">
            <h2 className="text-2xl font-semibold text-slate-800">
              Recent Products
            </h2>
            {recentProducts.length === 0 ? (
              <p className="mt-4 text-slate-500">
                No product listings are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recentProducts.map((product) => (
                  <div
                    key={product._id || product.name}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {product.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Shops linked: {product.shops?.length || 0}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-emerald-600">
                        Rs. {product.shops?.[0]?.price ?? "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
