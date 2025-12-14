'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// ===== 类型定义 =====
export interface WechatAccount {
    name: string;
    wechatAppid: string;
    username: string;
    avatar: string;
    type: string;
    verified: boolean;
    status: string;
}

export interface WechatPublishConfig {
    wechatAppid: string;
    author: string;
    articleType: 'news' | 'newspic';
    contentFormat: 'html' | 'markdown';
}

export interface XhsPublishResult {
    publishUrl: string;
    title: string;
    imageCount: number;
}

const PUBLISH_CONFIG_STORAGE_KEY = 'wechat_publish_config';

const DEFAULT_CONFIG: WechatPublishConfig = {
    wechatAppid: '',
    author: '',
    articleType: 'news',
    contentFormat: 'html',
};

// ===== Hook 实现 =====
export function usePublish() {
    // 微信发布状态
    const [wechatAccounts, setWechatAccounts] = useState<WechatAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [showWechatModal, setShowWechatModal] = useState(false);
    const [selectedArticleForWechat, setSelectedArticleForWechat] = useState<string | null>(null);
    const [wechatConfig, setWechatConfig] = useState<WechatPublishConfig>(DEFAULT_CONFIG);
    const [publishingToWechat, setPublishingToWechat] = useState(false);

    // 小红书发布状态
    const [showXhsModal, setShowXhsModal] = useState(false);
    const [selectedArticleForXhs, setSelectedArticleForXhs] = useState<string | null>(null);
    const [xhsPublishing, setXhsPublishing] = useState(false);
    const [xhsResult, setXhsResult] = useState<XhsPublishResult | null>(null);

    // 通用发布状态
    const [publishingId, setPublishingId] = useState<string | null>(null);

    // 加载保存的配置
    useEffect(() => {
        const savedConfig = localStorage.getItem(PUBLISH_CONFIG_STORAGE_KEY);
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setWechatConfig((prev) => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Failed to parse saved publish config:', e);
            }
        }
    }, []);

    // 保存配置
    const saveConfig = useCallback((config: Partial<WechatPublishConfig>) => {
        setWechatConfig((prev) => {
            const newConfig = { ...prev, ...config };
            localStorage.setItem(PUBLISH_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
            return newConfig;
        });
    }, []);

    // ===== 微信公众号相关 =====
    const fetchWechatAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const response = await fetch('/api/settings');
            const result = await response.json();

            // 正确读取设置：wechatPublish.endpoint 和 wechatPublish.apiKey
            const wechatPublishConfig = result.data?.wechatPublish;

            if (result.success && wechatPublishConfig?.endpoint && wechatPublishConfig?.apiKey) {
                const accountsResponse = await fetch(
                    `${wechatPublishConfig.endpoint}/wechat/accounts`,
                    {
                        headers: {
                            Authorization: `Bearer ${wechatPublishConfig.apiKey}`,
                        },
                    }
                );
                const accountsResult = await accountsResponse.json();

                if (accountsResult.code === 0 && accountsResult.data) {
                    setWechatAccounts(accountsResult.data);
                } else {
                    console.error('获取公众号列表失败:', accountsResult);
                }
            } else {
                console.log('微信公众号发布 API 未配置');
            }
        } catch (error) {
            console.error('获取公众号列表失败:', error);
            toast.error('获取公众号列表失败');
        } finally {
            setLoadingAccounts(false);
        }
    }, []);

    const openWechatPublishModal = useCallback((articleId: string) => {
        setSelectedArticleForWechat(articleId);
        setShowWechatModal(true);
        fetchWechatAccounts();
    }, [fetchWechatAccounts]);

    const closeWechatPublishModal = useCallback(() => {
        setShowWechatModal(false);
        setSelectedArticleForWechat(null);
    }, []);

    const publishToWechat = useCallback(async (): Promise<boolean> => {
        if (!selectedArticleForWechat || !wechatConfig.wechatAppid) {
            toast.error('请选择公众号');
            return false;
        }

        setPublishingToWechat(true);
        setPublishingId(selectedArticleForWechat);

        try {
            const response = await fetch('/api/publish/wechat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleId: selectedArticleForWechat,
                    ...wechatConfig,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('发布成功', {
                    description: '文章已成功发布到微信公众号',
                });
                closeWechatPublishModal();
                return true;
            } else {
                toast.error('发布失败', { description: result.error });
                return false;
            }
        } catch (error) {
            console.error('发布到微信失败:', error);
            toast.error('发布失败', { description: '网络异常' });
            return false;
        } finally {
            setPublishingToWechat(false);
            setPublishingId(null);
        }
    }, [selectedArticleForWechat, wechatConfig, closeWechatPublishModal]);

    // ===== 小红书相关 =====
    const openXhsPublishModal = useCallback((articleId: string) => {
        setSelectedArticleForXhs(articleId);
        setShowXhsModal(true);
        setXhsResult(null);
        publishToXiaohongshu(articleId);
    }, []);

    const closeXhsPublishModal = useCallback(() => {
        setShowXhsModal(false);
        setSelectedArticleForXhs(null);
        setXhsResult(null);
    }, []);

    const publishToXiaohongshu = useCallback(async (articleId: string): Promise<boolean> => {
        setXhsPublishing(true);
        setPublishingId(articleId);

        try {
            const response = await fetch('/api/publish/xiaohongshu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId }),
            });

            const result = await response.json();

            if (result.success) {
                setXhsResult({
                    publishUrl: result.data.publishUrl,
                    title: result.data.title,
                    imageCount: result.data.imageCount,
                });
                return true;
            } else {
                toast.error('生成发布链接失败', { description: result.error });
                closeXhsPublishModal();
                return false;
            }
        } catch (error) {
            console.error('发布到小红书失败:', error);
            toast.error('发布失败', { description: '网络异常' });
            closeXhsPublishModal();
            return false;
        } finally {
            setXhsPublishing(false);
            setPublishingId(null);
        }
    }, [closeXhsPublishModal]);

    return {
        // 微信发布
        wechatAccounts,
        loadingAccounts,
        showWechatModal,
        selectedArticleForWechat,
        wechatConfig,
        publishingToWechat,
        setWechatConfig: saveConfig,
        openWechatPublishModal,
        closeWechatPublishModal,
        publishToWechat,

        // 小红书发布
        showXhsModal,
        selectedArticleForXhs,
        xhsPublishing,
        xhsResult,
        openXhsPublishModal,
        closeXhsPublishModal,

        // 通用
        publishingId,
    };
}
