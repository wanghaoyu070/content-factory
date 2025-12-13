import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Header from '@/components/layout/Header';
import AdminInviteManager from './AdminInviteManager';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="管理后台" />
      <div className="p-6">
        <AdminInviteManager />
      </div>
    </div>
  );
}
