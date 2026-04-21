export default function ProductCard({ product }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      {/* Image placeholder */}
      <div className="h-32 bg-gray-200 rounded mb-3 flex items-center justify-center">
        <span className="text-gray-500">Image</span>
      </div>

      <h2 className="text-lg font-semibold">{product.name}</h2>

      <p className="text-green-600 font-bold">
        ₹{product.price}
      </p>

      <p className="text-sm text-gray-600">
        Shop: {product.shop}
      </p>

      <p className="text-sm text-gray-600">
        Distance: {product.distance}
      </p>
    </div>
  );
}