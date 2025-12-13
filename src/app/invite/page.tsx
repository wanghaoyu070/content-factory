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
    <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#16162a] border border-[#2d2d44] rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
        <div className="text-center mb-6">
          <p className="text-sm text-slate-400">欢迎加入内容工厂</p>
          <h1 className="text-2xl font-semibold text-white mt-2">请输入邀请码</h1>
          <p className="text-sm text-slate-500 mt-2">
            请输入管理员提供的邀请码以完成注册。
          </p>
        </div>
        <InviteForm />
      </div>
    </div>
  );
}
