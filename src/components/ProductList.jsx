import ProductCard from "./ProductCard";

export default function ProductList({ products }) {
  return (
    <div>
      {products.map((p, index) => (
        <ProductCard key={index} product={p} />
      ))}
    </div>
  );
}