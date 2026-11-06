import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { UserRole } from "@/domain";

interface LoginPageProps {
  searchParams: {
    from?: string;
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  // If already authenticated, redirect to destination
  if (user) {
    if (searchParams.from) {
      redirect(searchParams.from);
    }
    redirect(user.role === UserRole.ADMIN ? "/admin" : "/orders");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}

