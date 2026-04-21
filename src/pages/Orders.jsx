export default function Orders({ orders }) {
  return (
    <div className="p-4 pt-20">
      <h1>Orders</h1>

      {orders.map((o, i) => (
        <div key={i}>{o.name} - ₹{o.price}</div>
      ))}
    </div>
  );
}