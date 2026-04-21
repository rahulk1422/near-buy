import logo from "../assets/logo.svg";

export default function BrandLogo({
  size = "md",
  showTagline = false,
  className = "",
  onClick,
  centered = false,
}) {
  const sizes = {
    sm: {
      wrapper: "gap-2",
      icon: "h-9 w-9",
      title: "text-lg",
      subtitle: "text-[11px]",
    },
    md: {
      wrapper: "gap-3",
      icon: "h-11 w-11",
      title: "text-xl",
      subtitle: "text-xs",
    },
    lg: {
      wrapper: "gap-3.5",
      icon: "h-14 w-14",
      title: "text-2xl",
      subtitle: "text-sm",
    },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center ${currentSize.wrapper} ${
        centered ? "w-full justify-center text-center" : ""
      } ${className}`}
    >
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-sky-100 shadow-sm">
        <img
          src={logo}
          alt="Near Buy"
          className={`${currentSize.icon} object-cover object-left`}
        />
      </div>

      <div className={`${centered ? "text-center" : "text-left"} leading-tight`}>
        <div
          className={`${currentSize.title} font-semibold tracking-[0.18em] text-slate-900`}
        >
          <span className="text-sky-600">NEAR</span>
          <span className="ml-1 text-amber-500">BUY</span>
        </div>

        {showTagline && (
          <p className={`${currentSize.subtitle} text-slate-500`}>
            Find better deals nearby
          </p>
        )}
      </div>
    </button>
  );
}
