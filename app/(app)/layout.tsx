import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import prisma from '@/lib/prisma';



export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch or Sync User from Prisma
  let user = await prisma.user.findUnique({
    where: { supabaseId: session.user.id },
  });

  // If user doesn't exist in Prisma yet, create it (Sync)
  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        role: 'ENGINEER', // Default role
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex overflow-hidden">
      {/* Sidebar - Fixed Left */}
      <Sidebar user={{
        name: user.name,
        role: user.role,
      }} />

      {/* Right Column (TopBar + Content) */}
      <div className="flex-1 flex flex-col ml-[220px]">
        {/* TopBar - Fixed Top */}
        <TopBar user={{
          name: user.name,
          email: user.email,
          role: user.role,
        }} />

        {/* Main Content Area */}
        <main className="flex-1 mt-[56px] p-6 overflow-y-auto min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
