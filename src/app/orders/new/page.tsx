import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth";
import { CustomerNav } from "@/components/customer-nav";
import { OrderCreateForm } from "@/components/order-create-form";
import { UserRole } from "@/domain";

export default async function NewOrderPage() {
  const currentUser = await requireAuthenticatedUser();

  if (currentUser.role === UserRole.ADMIN) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerNav currentUser={currentUser} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Mailbox Order
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure your domain and specify the number of mailboxes to provision.
          </p>
        </div>

        <OrderCreateForm />
      </main>
    </div>
  );
}

