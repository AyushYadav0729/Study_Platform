function Input({ label,type = "text",name, value, onChange, error }) {
    return (
        <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
                {label}
            </label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-white bg-[#1e1e1e] outline-none transition-colors ${
          error ? "border-red-500" : "border-[#333] focus:border-indigo-500"
        }`}
            />
            {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
        </div>
    );
}

export default Input;