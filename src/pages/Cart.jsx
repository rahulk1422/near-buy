export default function Cart({ cart = [], setCart }) {

  const increaseQty = (index) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].qty = (updated[index].qty || 1) + 1;
      return updated;
    });
  };

  const decreaseQty = (index) => {
    setCart((prev) => {
      const updated = [...prev];

      if ((updated[index].qty || 1) > 1) {
        updated[index].qty -= 1;
      }

      return updated;
    });
  };

  const removeItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * (item.qty || 1),
    0
  );

  return (
    <div className="p-4 pt-20">

      <h1 className="text-xl font-bold mb-4">🛒 My Cart</h1>

      {cart.length === 0 ? (
        <p className="text-gray-500">Cart is empty</p>
      ) : (
        <>
          {cart.map((item, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded shadow mb-3"
            >
              <p className="font-semibold">{item.name}</p>
              {item.shopName && (
                <p className="text-sm text-slate-500">{item.shopName}</p>
              )}
              <p className="text-green-600">₹{item.price}</p>
              {item.locationLabel && (
                <p className="text-sm text-slate-500">{item.locationLabel}</p>
              )}
              {typeof item.latitude === "number" && typeof item.longitude === "number" && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-sky-600 hover:underline"
                >
                  Open shop location in Maps
                </a>
              )}

              {/* QTY Controls */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => decreaseQty(i)}
                  className="bg-gray-200 px-2 rounded"
                >
                  -
                </button>

                <span>{item.qty || 1}</span>

                <button
                  onClick={() => increaseQty(i)}
                  className="bg-gray-200 px-2 rounded"
                >
                  +
                </button>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(i)}
                className="text-red-500 mt-2 text-sm hover:underline"
              >
                Remove
              </button>
            </div>
          ))}

          {/* Total */}
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-bold">
              Total: ₹{total}
            </h2>
          </div>
        </>
      )}
    </div>
  );
}
