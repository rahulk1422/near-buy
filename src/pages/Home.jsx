import { useState, useEffect } from "react";
import apiClient from "../lib/apiClient";
import Carousel from "../components/Carousel";
import MapPickerModal from "../components/MapPickerModal";

const categories = [
  "All",
  "Fashion",
  "Electronics",
  "Grocery",
  "Beauty",
  "Home",
  "Sports",
  "Books",
  "Other",
];

function getBestShop(shops = []) {
  return shops.reduce((best, current) => {
    if (!best) return current;

    if (current.price < best.price) {
      return current;
    }

    if (current.price === best.price && current.rating > best.rating) {
      return current;
    }

    return best;
  }, null);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceInKm(from, to) {
  if (
    !from ||
    !to ||
    typeof from.latitude !== "number" ||
    typeof from.longitude !== "number" ||
    typeof to.latitude !== "number" ||
    typeof to.longitude !== "number"
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function getShopDistance(shop, userCoords) {
  const liveDistance = getDistanceInKm(userCoords, {
    latitude: shop?.latitude,
    longitude: shop?.longitude,
  });

  if (typeof liveDistance === "number" && !Number.isNaN(liveDistance)) {
    return liveDistance;
  }

  return typeof shop?.dist === "number" ? shop.dist : null;
}

function formatShopDistance(shop, userCoords) {
  const distance = getShopDistance(shop, userCoords);
  return typeof distance === "number" ? `${distance} km away` : "Distance unavailable";
}

function getNearestShop(shops = [], userCoords) {
  return shops.reduce((nearest, current) => {
    if (!nearest) return current;

    if ((getShopDistance(current, userCoords) ?? Infinity) < (getShopDistance(nearest, userCoords) ?? Infinity)) {
      return current;
    }

    return nearest;
  }, null);
}

export default function Home({ setCart }) {
  const [selected, setSelected] = useState(null);
  const [location, setLocation] = useState("Fetching...");
  const [locationStatus, setLocationStatus] = useState("Detecting your location...");
  const [userCoords, setUserCoords] = useState({
    latitude: 28.6139,
    longitude: 77.209,
  });
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [reviewTarget, setReviewTarget] = useState("product");
  const [reviewShopId, setReviewShopId] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewSaving, setIsReviewSaving] = useState(false);

  const requestLocation = () => {
    if (navigator.geolocation) {
      setLocationStatus("Detecting your location...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserCoords({ latitude, longitude });
          setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          setLocationStatus("Your location is set.");
        },
        () => {
          setLocation("Location unavailable");
          setLocationStatus("Location permission was denied.");
        }
      );
    } else {
      setLocation("Location unavailable");
      setLocationStatus("Geolocation is not supported on this device.");
    }
  };

  const handleMapLocationConfirm = ({ latitude, longitude }) => {
    setUserCoords({ latitude, longitude });
    setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
    setLocationStatus("Location set from the map.");
    setIsMapPickerOpen(false);
  };

  // 📍 Get User Location
  useEffect(() => {
    const timer = window.setTimeout(() => {
      requestLocation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await apiClient.get("/api/products", {
          params: {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
            sortBy: "nearest",
          },
        });
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch {
        setProducts([]);
      }
    }

    loadProducts();
  }, [userCoords.latitude, userCoords.longitude]);

  useEffect(() => {
    if (selected?.shops?.length) {
      setReviewTarget("product");
      setReviewShopId(String(selected.shops[0]._id || selected.shops[0].name));
    }
  }, [selected]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesCategory =
      activeCategory === "All" ||
      (product.category || "Other").toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login before adding a review.");
      return;
    }

    if (!selected?._id) {
      return;
    }

    setIsReviewSaving(true);

    try {
      const payload = {
        targetType: reviewTarget,
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      };

      if (reviewTarget === "shop") {
        payload.shopId = reviewShopId;
      }

      const res = await apiClient.post(`/api/products/${selected._id}/reviews`, payload);
      const updatedProduct = res.data;

      setSelected(updatedProduct);
      setProducts((prev) =>
        prev.map((product) =>
          product._id === updatedProduct._id ? updatedProduct : product
        )
      );
      setReviewComment("");
      alert("Review saved successfully.");
    } catch {
      alert("Review could not be saved. Please try again.");
    } finally {
      setIsReviewSaving(false);
    }
  };

  // 📦 PRODUCT DETAIL PAGE
  if (selected) {
    const best = getBestShop(selected.shops);
    const nearest = getNearestShop(selected.shops, userCoords) || selected.comparison?.nearestShop;
    const cheapest = selected.comparison?.cheapestShop || best;
    const highestRated = selected.comparison?.highestRatedShop;
    const productReviews = selected.reviews || [];
    const visibleReviews = productReviews.slice(-5).reverse();

    return (
      <div className="p-4 pt-20">
        <MapPickerModal
          open={isMapPickerOpen}
          initialCoords={userCoords}
          onClose={() => setIsMapPickerOpen(false)}
          onConfirm={handleMapLocationConfirm}
        />
        <button
          onClick={() => setSelected(null)}
          className="text-blue-500 mb-4"
        >
          ⬅ Back
        </button>

        <h1 className="text-2xl font-bold mb-1">{selected.name}</h1>
        <p className="mb-4 text-sm text-slate-500">
          Average rating: {selected.averageRating || "Not rated yet"}{" "}
          ({selected.reviewCount || 0} reviews)
        </p>

        <img
          src={selected.image}
          alt="product"
          className="w-48 rounded mb-4"
        />

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Your current location</p>
              <p className="mt-1 text-base font-semibold text-slate-800">
                {location}
              </p>
              <p className="mt-1 text-sm text-slate-500">{locationStatus}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsMapPickerOpen(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Set From Map
              </button>
              <button
                onClick={requestLocation}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Use Current Location
              </button>
            </div>
          </div>
        </div>

        {/* Shop Comparison */}
        <div className="bg-white p-4 rounded-xl shadow">
          {selected.shops.map((shop, i) => (
            <div
              key={i}
              className="flex justify-between items-center border-b py-2"
            >
              <div>
                <p className="font-semibold">{shop.name}</p>
                <p className="text-sm text-gray-500">
                  Approx. {formatShopDistance(shop, userCoords)}
                </p>
                {shop.locationLabel && (
                  <p className="text-xs text-slate-400">{shop.locationLabel}</p>
                )}
              </div>

              <div className="text-right">
                <p className="text-green-600 font-bold">
                  ₹{shop.price}
                </p>
                <p className="text-yellow-500 text-sm">
                  ⭐ {shop.rating}
                </p>
                {typeof shop.latitude === "number" && typeof shop.longitude === "number" && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-medium text-sky-600 hover:underline"
                  >
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Price Comparison */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {cheapest && (
            <div className="rounded-xl bg-green-100 p-4 text-slate-800">
              <p className="text-sm font-medium text-green-700">Cheapest shop</p>
              <p className="mt-1 font-bold">{cheapest.name}</p>
              <p>₹{cheapest.price} • ⭐ {cheapest.rating}</p>
            </div>
          )}
          {nearest && (
            <div className="rounded-xl bg-sky-100 p-4 text-slate-800">
              <p className="text-sm font-medium text-sky-700">Nearest shop</p>
              <p className="mt-1 font-bold">{nearest.name}</p>
              <p>{getShopDistance(nearest, userCoords) ?? "N/A"} km away</p>
            </div>
          )}
          {highestRated && (
            <div className="rounded-xl bg-amber-100 p-4 text-slate-800">
              <p className="text-sm font-medium text-amber-700">Highest rated</p>
              <p className="mt-1 font-bold">{highestRated.name}</p>
              <p>⭐ {highestRated.rating} • ₹{highestRated.price}</p>
            </div>
          )}
        </div>

        {nearest && (
          <div className="mt-4 rounded-xl bg-sky-100 p-4 text-slate-800">
            Nearest option from your location: <b>{nearest.name}</b>
            <br />
            Approx. distance: {getShopDistance(nearest, userCoords) ?? "N/A"} km
            {typeof nearest.latitude === "number" && typeof nearest.longitude === "number" && (
              <>
                <br />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${nearest.latitude},${nearest.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sky-700 underline"
                >
                  Open this shop in Maps
                </a>
              </>
            )}
          </div>
        )}

        <div className="mt-4 rounded-xl bg-white p-4 shadow">
          <h2 className="text-lg font-semibold text-slate-800">
            Ratings & Reviews
          </h2>

          <form onSubmit={handleReviewSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={reviewTarget}
                onChange={(e) => setReviewTarget(e.target.value)}
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400"
              >
                <option value="product">Rate product</option>
                <option value="shop">Rate shop</option>
              </select>

              {reviewTarget === "shop" && (
                <select
                  value={reviewShopId}
                  onChange={(e) => setReviewShopId(e.target.value)}
                  className="rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400"
                >
                  {selected.shops.map((shop) => (
                    <option key={shop._id || shop.name} value={shop._id || shop.name}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(e.target.value)}
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400"
              >
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience..."
              rows="3"
              className="rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400"
            />

            <button
              type="submit"
              disabled={isReviewSaving}
              className="w-fit rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewSaving ? "Saving..." : "Submit Review"}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {visibleReviews.length === 0 ? (
              <p className="text-sm text-slate-500">
                No reviews yet. Be the first to add one.
              </p>
            ) : (
              visibleReviews.map((review) => (
                <div
                  key={review._id || `${review.userName}-${review.rating}`}
                  className="rounded-xl bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">
                      {review.userName || "Customer"}
                    </p>
                    <p className="text-sm text-amber-500">⭐ {review.rating}</p>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                    {review.targetType === "shop" ? "Shop review" : "Product review"}
                  </p>
                  {review.comment && (
                    <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // 🏠 HOME PAGE
  return (
    <div className="p-4">
      <MapPickerModal
        open={isMapPickerOpen}
        initialCoords={userCoords}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirm={handleMapLocationConfirm}
      />
      <Carousel />

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a product..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-blue-400 focus:bg-white"
        />
      </div>

      {/* Location */}
      <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-600">📍 Location: {location}</p>
          <p className="text-xs text-slate-500">{locationStatus}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsMapPickerOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Set From Map
          </button>
          <button
            onClick={requestLocation}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Use Current Location
          </button>
        </div>
      </div>

      {/* Categories */}
      <h2 className="font-semibold mb-3">Categories</h2>
      <div className="flex gap-3 mb-5 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`rounded-full px-4 py-2 text-sm shadow transition ${
              activeCategory === c
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <h2 className="font-semibold mb-3">Products</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredProducts.map((p, i) => (
          <div
            key={i}
            onClick={() => setSelected(p)}
            className="bg-white rounded-lg shadow hover:shadow-lg transition p-2 cursor-pointer"
          >
            {/* Image */}
            <img
              src={p.image}
              alt="product"
              className="w-full h-32 object-cover rounded"
            />

            {/* Info */}
            <div className="mt-2">
              <h3 className="text-sm font-semibold truncate">
                {p.name}
              </h3>
              <p className="text-xs text-slate-500">
                {p.category || "Other"}
              </p>

              {/* Price + Shop */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{p.shops[0].name}</span>
                <span>{formatShopDistance(p.shops[0], userCoords)}</span>
              </div>

              <div className="flex justify-between items-center mt-1">
                <p className="text-green-600 font-bold text-sm">
                  ₹{p.shops[0].price}
                </p>
                <span className="text-yellow-500 text-xs">
                  ⭐ {p.shops[0].rating}
                </span>
              </div>
            </div>

            {/* Add to Cart */}
           <button
  onClick={(e) => {
    e.stopPropagation();

    setCart((prev) => {
      const exist = prev.find((item) => item.name === p.name);

      if (exist) {
        return prev.map((item) =>
          item.name === p.name
            ? { ...item, qty: (item.qty || 1) + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          name: p.name,
          price: p.shops[0].price,
          qty: 1,
          shopName: p.shops[0].name,
          latitude: p.shops[0].latitude,
          longitude: p.shops[0].longitude,
          locationLabel: p.shops[0].locationLabel,
        },
      ];
    });

    alert("Added to cart");
  }}
  className="w-full mt-2 bg-blue-500 text-white py-1 rounded hover:bg-blue-600 text-sm"
>
  Add to Cart
</button>
          </div>
        ))}
      </div>
      {filteredProducts.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          No product matching this name was found.
        </div>
      )}
    </div>
  );
}
