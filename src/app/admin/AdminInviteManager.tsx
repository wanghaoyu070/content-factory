'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';

interface InviteCode {
  id: number;
  code: string;
  created_by: number | null;
  used_by: number | null;
  used_at: string | null;
  created_at: string;
  creator_login: string | null;
  used_login: string | null;
}

export default function AdminInviteManager() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');

  const loadInvites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/invites');
      const result = await response.json();
      if (result.success) {
        setInvites(result.data || []);
      } else {
        toast.error(result.error || '加载邀请码失败');
      }
    } catch (error) {
      console.error('加载邀请码失败:', error);
      toast.error('加载邀请码失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleGenerate = async (count = 1) => {
    try {
      setCreating(true);
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const result = await response.json();
      if (result.success) {
        setInvites(result.data.invites);
        toast.success(`成功生成 ${count} 个邀请码`);
      } else {
        toast.error(result.error || '生成邀请码失败');
      }
    } catch (error) {
      console.error('生成邀请码失败:', error);
      toast.error('生成邀请码失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该邀请码？已使用的邀请码无法删除。')) return;
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (result.success) {
        setInvites(result.data);
        toast.success('删除成功');
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除邀请码失败:', error);
      toast.error('删除邀请码失败');
    }
  };

  const filteredInvites = invites.filter((invite) => {
    if (filter === 'unused') return !invite.used_by;
    if (filter === 'used') return !!invite.used_by;
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('邀请码已复制');
  };

  return (
    <div className="bg-[#16162a] border border-[#2d2d44] rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">邀请码管理</h2>
          <p className="text-sm text-slate-400 mt-1">生成、复制或删除邀请码，邀请新用户加入系统</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadInvites()}
            className="p-2 rounded-lg border border-[#2d2d44] text-slate-400 hover:text-white hover:bg-[#1a1a2e]"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleGenerate(1)}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            生成邀请码
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">过滤：</span>
        {[
          { key: 'all', label: '全部' },
          { key: 'unused', label: '未使用' },
          { key: 'used', label: '已使用' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as typeof filter)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              filter === item.key ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="border border-[#2d2d44] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#1a1a2e] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">邀请码</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">创建者</th>
              <th className="px-4 py-3 text-left">创建时间</th>
              <th className="px-4 py-3 text-left">使用者</th>
              <th className="px-4 py-3 text-left">使用时间</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  正在加载...
                </td>
              </tr>
            ) : filteredInvites.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  暂无邀请码
                </td>
              </tr>
            ) : (
              filteredInvites.map((invite) => (
                <tr key={invite.id} className="border-t border-[#2d2d44]">
                  <td className="px-4 py-3 font-mono text-white">
                    {invite.code}
                  </td>
                  <td className="px-4 py-3">
                    {invite.used_by ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-300">已使用</span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-300">未使用</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {invite.creator_login || '系统'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(invite.created_at)}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {invite.used_login || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(invite.used_at)}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => copyCode(invite.code)}
                      className="p-2 rounded-lg border border-[#2d2d44] text-slate-400 hover:text-white hover:bg-[#1a1a2e]"
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {!invite.used_by && (
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 rounded-lg border border-[#2d2d44] text-slate-400 hover:text-red-400 hover:bg-[#1a1a2e]"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
