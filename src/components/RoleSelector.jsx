export default function RoleSelector({ setSelectedRole }) {
  return (
    <select
      className="w-full p-2 border rounded mb-4"
      onChange={(e) => setSelectedRole(e.target.value)}
    >
      <option value="User">User</option>
      <option value="seller">Seller</option>
      <option value="admin">Admin</option>
    </select>
  );
}