export default function InputField({ placeholder, type }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full p-2 border rounded mb-3"
    />
  );
}