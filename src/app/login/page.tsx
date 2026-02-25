import Link from 'next/link';
import GitHubSignInButton from './GitHubSignInButton';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF6] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[rgba(0,0,0,0.06)] rounded-3xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <p className="text-sm text-[#666]">欢迎来到</p>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] mt-2">内容工厂</h1>
          <p className="text-sm text-[#999] mt-2">使用 GitHub 账号安全登录，解锁更多功能</p>
        </div>

        <GitHubSignInButton />

        <p className="text-xs text-[#999] text-center mt-6">
          点击登录即表示你同意我们的
          <Link href="/terms" className="text-[#333] hover:text-[#1A1A1A] underline mx-1">
            服务条款
          </Link>
          和
          <Link href="/privacy" className="text-[#333] hover:text-[#1A1A1A] underline mx-1">
            隐私政策
          </Link>
        </p>
      </div>
    </div>
  );
}
