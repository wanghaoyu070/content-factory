'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Sparkles,
    Settings,
    Rocket,
    CheckCircle,
    ArrowRight,
    Loader2,
    ChevronRight,
    Zap,
    Eye,
    EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

type OnboardingStep = 'welcome' | 'api-config' | 'experience' | 'complete';

interface OnboardingModalProps {
    onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [loading, setLoading] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // API 配置表单
    const [apiConfig, setApiConfig] = useState({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
    });

    // 预设 API 提供商
    const apiProviders = [
        { name: 'OpenAI', url: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
        { name: 'DeepSeek', url: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-coder'] },
        { name: '智谱AI', url: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash'] },
    ];

    // 保存 API 配置
    const saveApiConfig = async () => {
        if (!apiConfig.apiKey) {
            toast.error('请输入 API Key');
            return false;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ai: apiConfig,
                    wechatArticle: { endpoint: '', apiKey: '' },
                    imageGen: { baseUrl: '', apiKey: '', model: '' },
                    xiaohongshu: { endpoint: '', apiKey: '' },
                    wechatPublish: { endpoint: '', apiKey: '' },
                    preferences: { imageCount: 3, style: 'professional', minWords: 1500, maxWords: 2500 },
                }),
            });

            const result = await response.json();
            if (result.success) {
                // 测试 API 连接
                const testResponse = await fetch('/api/settings/test-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiConfig),
                });
                const testResult = await testResponse.json();

                if (testResult.success) {
                    toast.success('API 配置成功！');
                    return true;
                } else {
                    toast.error('API 连接测试失败，请检查配置');
                    return false;
                }
            } else {
                toast.error('保存失败');
                return false;
            }
        } catch (error) {
            console.error('保存 API 配置失败:', error);
            toast.error('保存失败，请稍后重试');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 完成引导
    const completeOnboarding = async () => {
        setLoading(true);
        try {
            await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true }),
            });
            onComplete();
        } catch (error) {
            console.error('完成引导失败:', error);
            onComplete(); // 即使失败也关闭
        } finally {
            setLoading(false);
        }
    };

    // 跳过配置
    const skipConfig = () => {
        setStep('complete');
    };

    // 开始体验
    const startExperience = () => {
        router.push('/analysis?keyword=AI人工智能');
        completeOnboarding();
    };

    // 渲染欢迎步骤
    const renderWelcome = () => (
        <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">
                欢迎来到内容工厂！
            </h2>
            <p className="text-slate-400 mb-6">
                Hi {session?.user?.name || '创作者'}，让我们花 1 分钟完成基础设置，<br />
                即可体验 AI 一键创作的魔力 ✨
            </p>

            <div className="flex items-center justify-center gap-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    配置 API
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                    体验功能
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                    开始创作
                </div>
            </div>

            <button
                onClick={() => setStep('api-config')}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 mx-auto"
            >
                开始设置
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    );

    // 渲染 API 配置步骤
    const renderApiConfig = () => (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-100">配置 AI 接口</h3>
                    <p className="text-sm text-slate-400">用于生成文章内容（核心功能）</p>
                </div>
            </div>

            {/* 快捷选择 */}
            <div className="mb-4">
                <label className="text-sm text-slate-400 mb-2 block">快捷选择服务商</label>
                <div className="flex gap-2">
                    {apiProviders.map((provider) => (
                        <button
                            key={provider.name}
                            onClick={() => setApiConfig({ ...apiConfig, baseUrl: provider.url, model: provider.models[0] })}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${apiConfig.baseUrl === provider.url
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                                    : 'bg-[#1a1a2e] text-slate-400 border border-[#2d2d44] hover:border-indigo-500/30'
                                }`}
                        >
                            {provider.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* API URL */}
            <div className="mb-4">
                <label className="text-sm text-slate-400 mb-2 block">API Base URL</label>
                <input
                    type="text"
                    value={apiConfig.baseUrl}
                    onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="https://api.openai.com/v1"
                />
            </div>

            {/* API Key */}
            <div className="mb-4">
                <label className="text-sm text-slate-400 mb-2 block">API Key <span className="text-red-400">*</span></label>
                <div className="relative">
                    <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiConfig.apiKey}
                        onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                        className="w-full px-4 py-2.5 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="sk-..."
                    />
                    <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Model */}
            <div className="mb-6">
                <label className="text-sm text-slate-400 mb-2 block">模型</label>
                <select
                    value={apiConfig.model}
                    onChange={(e) => setApiConfig({ ...apiConfig, model: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                    {apiProviders
                        .find((p) => p.url === apiConfig.baseUrl)
                        ?.models.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        )) || <option value="gpt-4o">gpt-4o</option>}
                </select>
            </div>

            <div className="flex items-center justify-between">
                <button
                    onClick={skipConfig}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                    跳过，稍后配置
                </button>
                <button
                    onClick={async () => {
                        const success = await saveApiConfig();
                        if (success) {
                            setStep('experience');
                        }
                    }}
                    disabled={loading || !apiConfig.apiKey}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            验证中...
                        </>
                    ) : (
                        <>
                            验证并继续
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    // 渲染体验步骤
    const renderExperience = () => (
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">
                🎉 API 配置成功！
            </h3>
            <p className="text-slate-400 mb-6">
                现在让我们用一个热门话题来体验产品的核心功能
            </p>

            <div className="bg-[#1a1a2e] rounded-xl p-6 mb-6 text-left">
                <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-slate-200">一键创作演示</span>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                    点击下方按钮，系统将自动：
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        搜索「AI人工智能」相关热门文章
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        AI 分析生成 3-5 个选题洞察
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        供你选择并生成完整文章
                    </li>
                </ul>
            </div>

            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={() => {
                        completeOnboarding();
                    }}
                    className="px-4 py-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    跳过，自己探索
                </button>
                <button
                    onClick={startExperience}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            启动中...
                        </>
                    ) : (
                        <>
                            <Rocket className="w-5 h-5" />
                            开始体验
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    // 渲染完成步骤（跳过配置的情况）
    const renderComplete = () => (
        <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-2">
                准备好开始了！
            </h3>
            <p className="text-slate-400 mb-6">
                你可以随时在设置中配置 API，享受完整功能
            </p>

            <div className="bg-[#1a1a2e] rounded-xl p-4 mb-6 text-left">
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">📊 仪表盘</span>
                        <span className="text-slate-500">查看数据概览</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">🔍 选题分析</span>
                        <span className="text-slate-500">发现热门选题</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">✍️ 内容创作</span>
                        <span className="text-slate-500">AI 生成文章</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">⚙️ 设置</span>
                        <span className="text-slate-500">配置 API</span>
                    </div>
                </div>
            </div>

            <button
                onClick={completeOnboarding}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all font-medium shadow-lg shadow-indigo-500/20 flex items-center gap-2 mx-auto"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        开始使用
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#16162a] rounded-2xl border border-[#2d2d44] w-full max-w-md p-8 shadow-2xl">
                {/* 进度指示 */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {['welcome', 'api-config', 'experience', 'complete'].map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div
                                className={`w-2 h-2 rounded-full transition-colors ${step === s
                                        ? 'bg-indigo-500'
                                        : ['welcome', 'api-config', 'experience', 'complete'].indexOf(step) > i
                                            ? 'bg-emerald-500'
                                            : 'bg-slate-600'
                                    }`}
                            />
                            {i < 3 && <div className="w-8 h-0.5 bg-slate-700 mx-1" />}
                        </div>
                    ))}
                </div>

                {/* 步骤内容 */}
                {step === 'welcome' && renderWelcome()}
                {step === 'api-config' && renderApiConfig()}
                {step === 'experience' && renderExperience()}
                {step === 'complete' && renderComplete()}
            </div>
        </div>
    );
}
