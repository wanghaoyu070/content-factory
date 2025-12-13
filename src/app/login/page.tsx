import Link from 'next/link';
import GitHubSignInButton from './GitHubSignInButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0f0f23] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#16162a] border border-[#2d2d44] rounded-3xl p-8 shadow-2xl shadow-indigo-500/10">
        <div className="text-center mb-8">
          <p className="text-sm text-slate-400">欢迎来到</p>
          <h1 className="text-2xl font-semibold text-white mt-2">内容工厂</h1>
          <p className="text-sm text-slate-500 mt-2">使用 GitHub 账号安全登录，解锁更多功能</p>
        </div>

        <GitHubSignInButton />

        <p className="text-xs text-slate-500 text-center mt-6">
          点击登录即表示你同意我们的
          <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 mx-1">
            服务条款
          </Link>
          和
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 mx-1">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  );
}
