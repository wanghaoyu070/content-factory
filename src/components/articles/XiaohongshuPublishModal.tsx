'use client';

import { Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';

interface XhsResult {
    title: string;
    imageCount: number;
    publishUrl: string;
    qrImageUrl?: string;
}

interface XiaohongshuPublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    isPublishing: boolean;
    result: XhsResult | null;
    error?: string | null;
}

export function XiaohongshuPublishModal({
    isOpen,
    onClose,
    isPublishing,
    result,
    error,
}: XiaohongshuPublishModalProps) {
    const handleCopyLink = () => {
        if (result?.publishUrl) {
            navigator.clipboard.writeText(result.publishUrl);
            toast.success('链接已复制');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            showCloseButton={!isPublishing}
            closeOnOverlayClick={!isPublishing}
            closeOnEscape={!isPublishing}
            size="sm"
        >
            {/* 加载状态 */}
            {isPublishing ? (
                <div className="py-12 flex flex-col items-center">
                    <Loader2 className="w-12 h-12 animate-spin text-red-400 mb-4" />
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                        正在生成发布链接...
                    </h3>
                    <p className="text-sm text-[#666]">请稍候，正在准备发布内容</p>
                </div>
            ) : result ? (
                /* 二维码显示 */
                <>
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2 text-center flex items-center justify-center gap-2">
                        📕 扫码发布到小红书
                    </h3>
                    <p className="text-sm text-[#666] text-center mb-6">
                        请使用小红书APP扫描二维码完成发布
                    </p>

                    {/* 二维码 - 始终使用 QRCodeSVG 生成 */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white p-4 rounded-xl">
                            {result.publishUrl ? (
                                <QRCodeSVG
                                    value={result.publishUrl}
                                    size={192}
                                    level="M"
                                    includeMargin={false}
                                />
                            ) : (
                                <div className="w-48 h-48 flex flex-col items-center justify-center text-[#999] text-sm">
                                    <svg
                                        className="w-12 h-12 mb-2 text-[#666]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                    <p>二维码生成失败</p>
                                    <p className="text-xs mt-1">发布链接未返回</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 文章信息 */}
                    <div className="bg-[#F7F6F0] rounded-xl p-4 mb-4 border border-[rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-[#666]">文章标题</span>
                            <span className="text-[#1A1A1A] truncate max-w-[200px]">
                                {result.title}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[#666]">图片数量</span>
                            <span className="text-[#1A1A1A]">{result.imageCount} 张</span>
                        </div>
                    </div>

                    {/* 发布链接 */}
                    <div className="mb-6">
                        <p className="text-xs text-[#999] mb-2">
                            或复制链接在浏览器中打开：
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={result.publishUrl || '未返回链接'}
                                readOnly
                                className="flex-1 px-3 py-2 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-lg text-[#666] text-xs"
                            />
                            <button
                                onClick={handleCopyLink}
                                disabled={!result.publishUrl}
                                className="px-3 py-2 bg-[#F7F6F0] border border-[rgba(0,0,0,0.06)] rounded-lg text-[#666] hover:text-[#1A1A1A] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                复制
                            </button>
                        </div>
                    </div>

                    {/* 关闭按钮 */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-sm text-[#1A1A1A] bg-gradient-to-r from-red-500 to-pink-500 rounded-xl hover:from-red-400 hover:to-pink-400 transition-all btn-primary"
                    >
                        完成
                    </button>
                </>
            ) : error ? (
                <div className="py-10 text-center">
                    <div className="text-4xl mb-3">😥</div>
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">生成失败</h3>
                    <p className="text-sm text-[#666] mb-6">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[#1A1A1A] bg-red-500/80 hover:bg-red-500 rounded-lg"
                    >
                        关闭
                    </button>
                </div>
            ) : null}
        </Modal>
    );
}
