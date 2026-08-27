export function GeminiIcon({ className = "w-4 h-4", strokeWidth = 2, fill = "none", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={fill === "currentColor" ? "currentColor" : fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={`${className} inline-block shrink-0 align-middle`}
      aria-hidden="true"
      {...props}
    >
      <path d="M3 12C7.97056 12 12 7.97056 12 3C12 7.97056 16.0294 12 21 12C16.0294 12 12 16.0294 12 21C12 16.0294 7.97056 12 3 12Z" />
    </svg>
  );
}

export default GeminiIcon;

