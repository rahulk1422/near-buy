export default function CategoryList({ categories }) {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {categories.map((cat, index) => (
        <div
          key={index}
          className="px-4 py-2 bg-white rounded-full shadow text-sm whitespace-nowrap"
        >
          {cat}
        </div>
      ))}
    </div>
  );
}