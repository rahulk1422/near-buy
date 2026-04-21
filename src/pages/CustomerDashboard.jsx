import ProductList from "../components/ProductList";

export default function CustomerDashboard() {
  const products = [
    { name: "Product A", price1: 500, price2: 450 },
    { name: "Product B", price1: 800, price2: 750 },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Product Comparison
      </h1>
      <ProductList products={products} />
    </div>
  );
}