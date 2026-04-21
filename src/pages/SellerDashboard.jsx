import { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import getApiErrorMessage from "../lib/getApiErrorMessage";
import MapPickerModal from "../components/MapPickerModal";

const initialForm = {
  name: "",
  category: "Electronics",
  image: "",
  price: "",
  rating: "",
  latitude: "",
  longitude: "",
  locationLabel: "",
};

const categories = [
  "Fashion",
  "Electronics",
  "Grocery",
  "Beauty",
  "Home",
  "Sports",
  "Books",
  "Other",
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressImage(file) {
  const originalDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (typeof originalDataUrl !== "string") {
    throw new Error("The image could not be read.");
  }

  const image = await loadImage(originalDataUrl);
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return originalDataUrl;
  }

  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.72);
}

export default function SellerDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const sellerName = user?.name || "Seller";

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [shopCoords, setShopCoords] = useState({
    latitude: 28.6139,
    longitude: 77.209,
  });

  const loadProducts = async () => {
    try {
      const res = await apiClient.get("/api/products");
      setProducts(res.data || []);
    } catch (err) {
      alert(getApiErrorMessage(err, "Products could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const sellerProducts = products.filter((product) =>
    product.shops?.some((shop) => shop.name === sellerName)
  );

  const totalListings = sellerProducts.length;
  const totalValue = sellerProducts.reduce((sum, product) => {
    const sellerShop = product.shops?.find((shop) => shop.name === sellerName);
    return sum + (sellerShop?.price || 0);
  }, 0);
  const averageRating = totalListings
    ? (
        sellerProducts.reduce((sum, product) => {
          const sellerShop = product.shops?.find((shop) => shop.name === sellerName);
          return sum + (sellerShop?.rating || 0);
        }, 0) / totalListings
      ).toFixed(1)
    : "0.0";

  const summaryCards = [
    {
      label: "Your Listings",
      value: totalListings,
      valueClassName: "text-slate-800",
      href: "#your-products",
    },
    {
      label: "Listed Value",
      value: `Rs. ${totalValue}`,
      valueClassName: "text-emerald-600",
      href: "#your-products",
    },
    {
      label: "Average Rating",
      value: averageRating,
      valueClassName: "text-amber-500",
      href: "#seller-notes",
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "image" && value.trim()) {
      setImagePreview(value.trim());
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);

    compressImage(file)
      .then((dataUrl) => {
        setForm((prev) => ({ ...prev, image: dataUrl }));
        setImagePreview(dataUrl);
      })
      .catch(() => {
        alert("The photo could not be processed. Please try again.");
      })
      .finally(() => {
        setIsProcessingImage(false);
      });
  };

  const handleMapLocationConfirm = ({ latitude, longitude }) => {
    setShopCoords({ latitude, longitude });
    setForm((prev) => ({
      ...prev,
      latitude: String(latitude),
      longitude: String(longitude),
      locationLabel: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    }));
    setIsMapPickerOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name: form.name,
        category: form.category,
        image:
          form.image ||
          "https://images.unsplash.com/photo-1483985988355-763728e1935b",
        shops: [
          {
            name: sellerName,
            price: Number(form.price),
            dist: 0,
            rating: Number(form.rating),
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            locationLabel:
              form.locationLabel ||
              `${Number(form.latitude).toFixed(5)}, ${Number(form.longitude).toFixed(5)}`,
          },
        ],
      };

      const res = await apiClient.post("/api/products", payload);
      setProducts((prev) => {
        const exists = prev.some((product) => product._id === res.data._id);
        if (exists) {
          return prev.map((product) =>
            product._id === res.data._id ? res.data : product
          );
        }

        return [res.data, ...prev];
      });
      setForm(initialForm);
      setImagePreview("");
      setShopCoords({ latitude: 28.6139, longitude: 77.209 });
      alert("Product added successfully.");
    } catch (err) {
      alert(getApiErrorMessage(err, "The product could not be saved."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    const shouldDelete = window.confirm(
      `Delete "${productName}" from your listings?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingProductId(productId);

    try {
      await apiClient.delete(`/api/products/${productId}`);
      setProducts((prev) => prev.filter((product) => product._id !== productId));
      alert("Product deleted successfully.");
    } catch (err) {
      alert(getApiErrorMessage(err, "The product could not be deleted."));
    } finally {
      setDeletingProductId("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 pt-20">
      <MapPickerModal
        open={isMapPickerOpen}
        initialCoords={shopCoords}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirm={handleMapLocationConfirm}
      />
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 p-6 text-white shadow-lg">
          <p className="text-sm tracking-[0.08em] text-white/80">
            Seller workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold">Welcome, {sellerName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            List your products, update pricing, and manage your storefront from
            one place.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className="rounded-2xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.valueClassName}`}>
                {card.value}
              </p>
              <p className="mt-3 text-sm font-medium text-orange-600">
                Click to view details
              </p>
            </a>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            id="add-product"
            className="scroll-mt-28 rounded-3xl bg-white p-6 shadow"
          >
            <h2 className="text-2xl font-semibold text-slate-800">
              Add New Product
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              The seller name will be saved automatically as "{sellerName}".
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Product name"
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400"
                required
              />
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="Image URL (optional)"
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400"
              />
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3 text-sm font-medium text-orange-700 transition hover:bg-orange-100">
                Upload Product Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-cyan-300 bg-cyan-50 p-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100">
                Capture From Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(true)}
                className="rounded-xl border border-dashed border-sky-300 bg-sky-50 p-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
              >
                Set Shop Location From Map
              </button>
              <a
                href={
                  form.latitude && form.longitude
                    ? `https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`
                    : "https://www.google.com/maps"
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                Open / Search on Map
              </a>
              <input
                name="price"
                type="number"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="Price"
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400"
                required
              />
              <input
                name="rating"
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={handleChange}
                placeholder="Rating"
                className="rounded-xl border border-slate-200 p-3 outline-none focus:border-orange-400 md:col-span-2"
                required
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-sm font-medium text-slate-700">Shop location</p>
                <p className="mt-1 text-sm text-slate-500">
                  {form.locationLabel || "No shop location selected yet."}
                </p>
                {form.latitude && form.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-sky-600 hover:underline"
                  >
                    Open this selected location
                  </a>
                )}
              </div>
            </div>

            {imagePreview && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-48 w-full object-cover"
                />
              </div>
            )}

            {isProcessingImage && (
              <p className="mt-3 text-sm text-slate-500">
                Optimizing photo...
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || isProcessingImage}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessingImage
                ? "Preparing photo..."
                : isSaving
                  ? "Saving..."
                  : "Add Product"}
            </button>
          </form>

          <div
            id="seller-notes"
            className="scroll-mt-28 rounded-3xl bg-white p-6 shadow"
          >
            <h2 className="text-2xl font-semibold text-slate-800">
              Seller Notes
            </h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                Quick tip: a clear product image makes your listing look more
                trustworthy.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Competitive pricing and strong ratings create a better
                impression on the home listing.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Seller testing can continue even if Atlas is down because of
                local fallback support.
              </div>
            </div>
          </div>
        </div>

        <div
          id="your-products"
          className="mt-6 scroll-mt-28 rounded-3xl bg-white p-6 shadow"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Your Products
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Only the products linked to the shop name "{sellerName}" are shown here.
              </p>
            </div>
            <button
              onClick={loadProducts}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="mt-5 text-slate-500">Products are loading...</p>
          ) : sellerProducts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
              No seller listings are available yet. Add your first product to activate the dashboard.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sellerProducts.map((product) => {
                const sellerShop = product.shops?.find(
                  (shop) => shop.name === sellerName
                );

                return (
                  <div
                    key={product._id || `${product.name}-${sellerShop?.price}`}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-44 w-full object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {product.category || "Other"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteProduct(product._id, product.name)
                          }
                          disabled={deletingProductId === product._id}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingProductId === product._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                        <span>Price</span>
                        <span className="font-semibold text-emerald-600">
                          Rs. {sellerShop?.price}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                        <span>Distance</span>
                        <span>{sellerShop?.dist} km</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                        <span>Rating</span>
                        <span>{sellerShop?.rating}</span>
                      </div>
                      {sellerShop?.locationLabel && (
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-medium">Location:</span>{" "}
                          {sellerShop.locationLabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
