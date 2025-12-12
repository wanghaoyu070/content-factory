'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowLeft,
  Eye,
  Trash2,
  Calendar,
  FileText,
  Lightbulb,
  Clock,
  User,
} from 'lucide-react';

interface SearchRecord {
  searchId: number;
  keyword: string;
  articleCount: number;
  insightCount: number;
  createdAt: string;
  searchType?: 'keyword' | 'account';
  accountName?: string;
  accountAvatar?: string;
}

export default function AnalysisHistoryPage() {
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      // 获取所有搜索记录及洞察数量
      const response = await fetch('/api/insights/all');
      const result = await response.json();
      if (result.success) {
        setRecords(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条搜索记录吗？相关文章和洞察数据也会被删除。')) {
      return;
    }

    try {
      const response = await fetch(`/api/search?id=${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setRecords(records.filter((r) => r.searchId !== id));
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `${days}天前`;
    } else if (days < 30) {
      return `${Math.floor(days / 7)}周前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const filteredRecords = records.filter((record) =>
    record.keyword.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      {/* Header */}
      <div className="bg-[#16162a] border-b border-[#2d2d44]">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">选题历史</h1>
          <Link
            href="/analysis"
            className="px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-sm text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回选题分析
          </Link>
        </div>
      </div>

      <div className="p-6">
        {/* Search Filter */}
        <div className="bg-[#16162a] rounded-2xl p-4 border border-[#2d2d44] mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索关键词..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="inline-flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              加载中...
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-[#16162a] rounded-2xl p-12 border border-[#2d2d44] text-center">
            <div className="w-16 h-16 bg-[#1a1a2e] rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              {searchQuery ? '未找到匹配的记录' : '暂无选题历史'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchQuery
                ? '尝试使用其他关键词搜索'
                : '开始分析选题后，历史记录将显示在这里'}
            </p>
            {!searchQuery && (
              <Link
                href="/analysis"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                <Search className="w-4 h-4" />
                开始分析选题
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.searchId}
                  className="bg-[#16162a] rounded-2xl p-5 border border-[#2d2d44] hover:border-indigo-500/50 transition-all group"
                >
                  {/* Keyword/Account Title */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {record.searchType === 'account' && record.accountAvatar ? (
                        <img
                          src={record.accountAvatar}
                          alt={record.accountName || record.keyword}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          record.searchType === 'account' ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
                        }`}>
                          {record.searchType === 'account' ? (
                            <User className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Search className="w-5 h-5 text-indigo-400" />
                          )}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                          {record.accountName || record.keyword}
                        </h3>
                        {record.searchType === 'account' && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            公众号
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#1a1a2e] rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-xs">文章数量</span>
                      </div>
                      <p className="text-xl font-bold text-slate-100">
                        {record.articleCount}
                      </p>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="text-xs">洞察数量</span>
                      </div>
                      <p className="text-xl font-bold text-slate-100">
                        {record.insightCount}
                      </p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(record.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-[#2d2d44]">
                    <Link
                      href={`/analysis/history/${record.searchId}`}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      查看详情
                    </Link>
                    <button
                      onClick={() => handleDelete(record.searchId)}
                      className="px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] text-slate-400 rounded-lg hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Footer */}
            <div className="mt-6 text-sm text-slate-500 text-center">
              共 {filteredRecords.length} 条选题记录
              {searchQuery && records.length !== filteredRecords.length && (
                <span className="ml-2">
                  (筛选自 {records.length} 条记录)
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
