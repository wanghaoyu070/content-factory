import { auth } from '@/auth';
import InviteForm from './InviteForm';
import { redirect } from 'next/navigation';

export default async function InvitePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'pending') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[rgba(0,0,0,0.06)] rounded-3xl p-8 shadow-2xl shadow-black/5">
        <div className="text-center mb-6">
          <p className="text-sm text-[#666]">欢迎加入内容工厂</p>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] mt-2">请输入邀请码</h1>
          <p className="text-sm text-[#999] mt-2">
            请输入管理员提供的邀请码以完成注册。
          </p>
        </div>
        <InviteForm />
      </div>
    </div>
  );
}
