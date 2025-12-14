'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface WechatAccount {
    name: string;
    wechatAppid: string;
    username: string;
    avatar: string;
    type: string;
    verified: boolean;
    status: string;
}

interface PublishConfig {
    wechatAppid: string;
    author: string;
    articleType: 'news' | 'newspic';
    contentFormat: 'html' | 'markdown';
    summary: string;
}

interface WechatPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    accounts: WechatAccount[];
    loadingAccounts: boolean;
    config: PublishConfig;
    onConfigChange: (config: PublishConfig) => void;
}

export function WechatPublishModal({
    isOpen,
    onClose,
    onConfirm,
    accounts,
    loadingAccounts,
    config,
    onConfigChange,
}: WechatPublishModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="发布到微信公众号"
            size="lg"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!config.wechatAppid}
                        className="px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        确认发布
                    </button>
                </>
            }
        >
            {/* 公众号选择 */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                    选择公众号
                </label>
                {loadingAccounts ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="ml-2 text-slate-400">加载中...</span>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="text-center py-6 bg-[#1a1a2e] rounded-xl border border-[#2d2d44]">
                        <p className="text-slate-400">暂无可用的公众号</p>
                        <p className="text-sm text-slate-500 mt-2">
                            请先在设置页面配置公众号发布API
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {accounts.map((account) => (
                            <button
                                key={account.wechatAppid}
                                onClick={() =>
                                    onConfigChange({ ...config, wechatAppid: account.wechatAppid })
                                }
                                className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left ${config.wechatAppid === account.wechatAppid
                                        ? 'bg-indigo-500/20 border-indigo-500'
                                        : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                                    }`}
                            >
                                {account.avatar ? (
                                    <img
                                        src={account.avatar}
                                        alt=""
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        📗
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-200 truncate">
                                        {account.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {account.type === 'subscription' ? '订阅号' : '服务号'}
                                        {account.verified && ' · 已认证'}
                                    </p>
                                </div>
                                {config.wechatAppid === account.wechatAppid && (
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                        <svg
                                            className="w-3 h-3 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 分隔线 */}
            <div className="border-t border-white/5 my-6" />

            {/* 发布配置 */}
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300">发布配置</h4>

                {/* 摘要 */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                        文章摘要（选填，最多120字）
                    </label>
                    <textarea
                        value={config.summary}
                        onChange={(e) =>
                            onConfigChange({ ...config, summary: e.target.value.slice(0, 120) })
                        }
                        rows={3}
                        placeholder="用于公众号摘要展示"
                        className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                    />
                    <div className="text-right text-xs text-slate-500 mt-1">
                        {config.summary.length}/120
                    </div>
                </div>

                {/* 作者名称 */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                        作者名称（选填）
                    </label>
                    <input
                        type="text"
                        value={config.author}
                        onChange={(e) =>
                            onConfigChange({ ...config, author: e.target.value })
                        }
                        placeholder="留空则不显示作者"
                        className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>

                {/* 文章类型 */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                        文章类型
                    </label>
                    <div className="flex gap-3">
                        <label
                            className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${config.articleType === 'news'
                                    ? 'bg-indigo-500/20 border-indigo-500'
                                    : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="articleType"
                                value="news"
                                checked={config.articleType === 'news'}
                                onChange={(e) =>
                                    onConfigChange({
                                        ...config,
                                        articleType: e.target.value as 'news' | 'newspic',
                                    })
                                }
                                className="sr-only"
                            />
                            <div className="text-sm font-medium text-slate-200">普通文章</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                适合图文混排内容
                            </div>
                        </label>
                        <label
                            className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${config.articleType === 'newspic'
                                    ? 'bg-indigo-500/20 border-indigo-500'
                                    : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="articleType"
                                value="newspic"
                                checked={config.articleType === 'newspic'}
                                onChange={(e) =>
                                    onConfigChange({
                                        ...config,
                                        articleType: e.target.value as 'news' | 'newspic',
                                    })
                                }
                                className="sr-only"
                            />
                            <div className="text-sm font-medium text-slate-200">小绿书</div>
                            <div className="text-xs text-slate-500 mt-0.5">图片为主的内容</div>
                        </label>
                    </div>
                </div>

                {/* 内容格式 */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                        内容格式
                    </label>
                    <div className="flex gap-3">
                        <label
                            className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${config.contentFormat === 'html'
                                    ? 'bg-indigo-500/20 border-indigo-500'
                                    : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="contentFormat"
                                value="html"
                                checked={config.contentFormat === 'html'}
                                onChange={(e) =>
                                    onConfigChange({
                                        ...config,
                                        contentFormat: e.target.value as 'html' | 'markdown',
                                    })
                                }
                                className="sr-only"
                            />
                            <div className="text-sm font-medium text-slate-200">HTML</div>
                            <div className="text-xs text-slate-500 mt-0.5">推荐，保留样式</div>
                        </label>
                        <label
                            className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all ${config.contentFormat === 'markdown'
                                    ? 'bg-indigo-500/20 border-indigo-500'
                                    : 'bg-[#1a1a2e] border-[#2d2d44] hover:border-indigo-500/50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="contentFormat"
                                value="markdown"
                                checked={config.contentFormat === 'markdown'}
                                onChange={(e) =>
                                    onConfigChange({
                                        ...config,
                                        contentFormat: e.target.value as 'html' | 'markdown',
                                    })
                                }
                                className="sr-only"
                            />
                            <div className="text-sm font-medium text-slate-200">Markdown</div>
                            <div className="text-xs text-slate-500 mt-0.5">自动转换格式</div>
                        </label>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
