import { HomeUser } from "@/components/home-user";
import { api } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { status } = await api.health.getHealth.query();
  return (
    <main className="min-h-screen min-w-screen flex justify-center items-center">
      <div>
        <h1 className="text-2xl font-bold">Server Status: {status}</h1>
        <HomeUser />
      </div>
    </main>
  );
}
