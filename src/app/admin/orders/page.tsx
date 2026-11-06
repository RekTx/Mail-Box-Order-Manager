import { redirect } from "next/navigation";

export default function AdminOrdersRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(searchParams)) {
    if (val) params.set(key, val);
  }
  const queryString = params.toString();
  redirect(`/admin${queryString ? `?${queryString}` : ""}`);
}

