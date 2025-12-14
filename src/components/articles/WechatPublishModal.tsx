'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Send, RefreshCw } from 'lucide-react';
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

type PublishStep = 'config' | 'publishing' | 'success' | 'error';

interface WechatPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<boolean>;
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
    const [step, setStep] = useState<PublishStep>('config');
    const [errorMessage, setErrorMessage] = useState('');

    // 重置状态当模态框关闭/打开
    useEffect(() => {
        if (isOpen) {
            setStep('config');
            setErrorMessage('');
        }
    }, [isOpen]);

    // 处理发布
    const handlePublish = async () => {
        setStep('publishing');
        setErrorMessage('');

        try {
            const success = await onConfirm();
            if (success) {
                setStep('success');
                // 2秒后自动关闭
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setStep('error');
                setErrorMessage('发布失败，请稍后重试');
            }
        } catch (error) {
            setStep('error');
            setErrorMessage(error instanceof Error ? error.message : '发布失败，请稍后重试');
        }
    };

    // 重试
    const handleRetry = () => {
        setStep('config');
        setErrorMessage('');
    };

    // 渲染不同阶段的内容
    const renderContent = () => {
        switch (step) {
            case 'publishing':
                return (
                    <div className="py-8 flex flex-col items-center justify-center">
                        {/* 发布动画 */}
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500/30 to-emerald-500/30 flex items-center justify-center animate-pulse">
                                    <Send className="w-10 h-10 text-green-400 animate-bounce" />
                                </div>
                            </div>
                            {/* 旋转光圈 */}
                            <div className="absolute inset-0 w-24 h-24 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                        </div>

                        <h3 className="text-xl font-semibold text-slate-200 mb-2">
                            正在发布到微信公众号
                        </h3>
                        <p className="text-sm text-slate-400 text-center max-w-xs mb-6">
                            正在将文章同步到公众号草稿箱，请稍候...
                        </p>

                        {/* 发布步骤进度 */}
                        <div className="w-full max-w-xs space-y-3 px-4">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-sm text-slate-300">准备文章内容</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                                    <Loader2 className="w-3 h-3 text-green-400 animate-spin" />
                                </div>
                                <span className="text-sm text-green-400">上传到微信服务器...</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                                </div>
                                <span className="text-sm text-slate-500">完成发布</span>
                            </div>
                        </div>

                        {/* 底部提示 */}
                        <div className="mt-8 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-400 flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                处理中，请勿关闭页面
                            </p>
                        </div>
                    </div>
                );

            case 'success':
                return (
                    <div className="py-8 flex flex-col items-center justify-center">
                        {/* 成功动画 */}
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center animate-scale-in">
                                <div className="w-20 h-20 rounded-full bg-green-500/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                                </div>
                            </div>
                            {/* 成功光环 */}
                            <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-green-500/50 animate-ping" />
                        </div>

                        <h3 className="text-xl font-semibold text-green-400 mb-2">
                            发布成功！
                        </h3>
                        <p className="text-sm text-slate-300 text-center max-w-xs">
                            文章已成功发布到微信公众号草稿箱
                        </p>

                        {/* 完成的步骤 */}
                        <div className="w-full max-w-xs space-y-3 px-4 mt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-sm text-slate-300">准备文章内容</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-sm text-slate-300">上传到微信服务器</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-sm text-slate-300">完成发布</span>
                            </div>
                        </div>

                        {/* 提示信息 */}
                        <div className="mt-6 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-xs text-green-400">
                                请前往公众号后台进行最终发布
                            </p>
                        </div>

                        {/* 自动关闭提示 */}
                        <div className="mt-4 text-xs text-slate-500">
                            窗口将在 2 秒后自动关闭...
                        </div>
                    </div>
                );

            case 'error':
                return (
                    <div className="py-8 flex flex-col items-center justify-center">
                        {/* 失败动画 */}
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-red-500/30 flex items-center justify-center animate-pulse">
                                    <XCircle className="w-12 h-12 text-red-400" />
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-red-400 mb-2">
                            发布失败
                        </h3>

                        {/* 错误信息 */}
                        <div className="w-full max-w-xs px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
                            <p className="text-sm text-red-300 text-center">
                                {errorMessage || '发布过程中出现错误，请稍后重试'}
                            </p>
                        </div>

                        {/* 操作按钮 */}
                        <div className="mt-8 flex items-center gap-3">
                            <button
                                onClick={handleRetry}
                                className="px-5 py-2.5 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重新发布
                            </button>
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                );

            default: // config
                return (
                    <>
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
                    </>
                );
        }
    };

    // 渲染Footer
    const renderFooter = () => {
        if (step !== 'config') return null;

        return (
            <>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                    取消
                </button>
                <button
                    onClick={handlePublish}
                    disabled={!config.wechatAppid}
                    className="px-4 py-2 text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    确认发布
                </button>
            </>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={step === 'publishing' ? undefined : onClose}
            title={step === 'config' ? '发布到微信公众号' : undefined}
            size="lg"
            footer={renderFooter()}
        >
            {renderContent()}
        </Modal>
    );
}
