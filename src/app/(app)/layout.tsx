import { getActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getActiveUser();

  const [subscription, notifications] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const plan = subscription?.plan ?? "free";

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={user.role === "admin"} plan={plan} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          user={{
            name: user.name ?? user.email,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
          }}
          plan={plan}
          notifications={notifications}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
