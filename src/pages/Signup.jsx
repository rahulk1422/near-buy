export default function Signup({ setPage }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
          Create Account
        </h2>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-2 border rounded mb-3"
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-3"
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-4"
        />

        <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg">
          Signup
        </button>

        <p className="text-center mt-4 text-sm">
          Already have an account?{" "}
          <span
            onClick={() => setPage("login")}
            className="text-blue-500 cursor-pointer"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}