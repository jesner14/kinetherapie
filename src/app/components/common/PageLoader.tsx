interface PageLoaderProps {
  text?: string;
  fullPage?: boolean;
}

export function PageLoader({ text = "Chargement...", fullPage = false }: PageLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 ${
        fullPage ? "min-h-screen" : "min-h-[380px]"
      }`}
    >
      {/* Double-ring spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
        <div
          className="absolute inset-1 rounded-full border-4 border-transparent border-b-teal-400 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "0.7s" }}
        />
      </div>
      <p className="text-sm text-gray-500 font-medium tracking-wide">{text}</p>
    </div>
  );
}
