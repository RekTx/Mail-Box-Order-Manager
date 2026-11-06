interface ProviderBadgeProps {
  provider: "google" | "microsoft" | string;
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const isGoogle = provider.toLowerCase() === "google";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        isGoogle
          ? "bg-red-50 text-red-700 ring-red-600/20"
          : "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isGoogle ? "bg-red-500" : "bg-indigo-500"
        }`}
      />
      {isGoogle ? "Google" : "Microsoft"}
    </span>
  );
}

