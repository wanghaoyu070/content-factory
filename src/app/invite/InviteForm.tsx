'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function InviteForm() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('请输入邀请码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/invite/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('邀请码验证成功');
        router.replace('/');
        router.refresh();
      } else {
        toast.error(result.error || '邀请码验证失败');
      }
    } catch (error) {
      console.error('验证邀请码失败:', error);
      toast.error('网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-[#666] mb-2">邀请码</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full px-4 py-3 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-xl text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[rgba(0,0,0,0.1)]"
          placeholder="请输入管理员提供的邀请码"
          maxLength={16}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#333] to-[#555] text-white font-semibold hover:from-[#444] hover:to-[#666] transition-colors disabled:opacity-60"
      >
        {loading ? '验证中...' : '提交邀请码'}
      </button>
    </form>
  );
}
