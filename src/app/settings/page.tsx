'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Eye, EyeOff, Save, CheckCircle, Loader2, AlertCircle, XCircle, SkipForward, Bot, Palette, Newspaper, BookOpen, BookMarked, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';

// 可选的 URL 验证：允许空字符串或有效 URL
const optionalUrl = z.string().refine(
  (val) => val === '' || /^https?:\/\/.+/.test(val),
  { message: '请输入有效的 URL 地址' }
);

// 新的验证 schema：所有 API 配置都是可选的
const settingsSchema = z.object({
  ai: z.object({
    baseUrl: optionalUrl,
    apiKey: z.string(),
    model: z.string(),
  }),
  wechatArticle: z.object({
    endpoint: optionalUrl,
    apiKey: z.string(),
  }),
  imageGen: z.object({
    baseUrl: optionalUrl,
    apiKey: z.string(),
    model: z.string(),
    provider: z.enum(['siliconflow', 'seedream']).default('siliconflow'),
  }),
  xiaohongshu: z.object({
    endpoint: optionalUrl,
    apiKey: z.string(),
  }),
  wechatPublish: z.object({
    endpoint: optionalUrl,
    apiKey: z.string(),
  }),
  preferences: z.object({
    imageCount: z.coerce.number().min(1).max(10),
    style: z.string(),
    minWords: z.coerce.number().min(300),
    maxWords: z.coerce.number().max(5000),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const defaultSettings: SettingsFormValues = {
  ai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
  },
  wechatArticle: {
    endpoint: '',
    apiKey: '',
  },
  imageGen: {
    baseUrl: 'https://api.siliconflow.cn/v1/images/generations',
    apiKey: '',
    model: 'Kwai-Kolors/Kolors',
    provider: 'siliconflow' as const,
  },
  xiaohongshu: {
    endpoint: '',
    apiKey: '',
  },
  wechatPublish: {
    endpoint: '',
    apiKey: '',
  },
  preferences: {
    imageCount: 3,
    style: 'professional',
    minWords: 1500,
    maxWords: 2500,
  },
};

interface ValidationResult {
  name: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
}

type ApiConfigKey = 'ai' | 'imageGen' | 'wechatArticle' | 'wechatPublish' | 'xiaohongshu';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}

function ValidationResultModal({
  results,
  onClose,
}: {
  results: ValidationResult[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">保存完成 - 验证结果</h3>
        <div className="space-y-3 mb-6">
          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3">
              {result.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              {result.status === 'error' && (
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              {result.status === 'skipped' && (
                <SkipForward className="w-5 h-5 text-[#999] flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  result.status === 'success' && 'text-emerald-400',
                  result.status === 'error' && 'text-red-400',
                  result.status === 'skipped' && 'text-[#999]'
                )}>
                  {result.name}
                </p>
                <p className="text-xs text-[#666]">{result.message}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-[#333] text-white rounded-xl hover:bg-[#444] transition-colors"
        >
          知道了
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请登录后配置接口');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [storedApiKeyFlags, setStoredApiKeyFlags] = useState<Record<ApiConfigKey, boolean>>({
    ai: false,
    imageGen: false,
    wechatArticle: false,
    wechatPublish: false,
    xiaohongshu: false,
  });
  const [loading, setLoading] = useState(true);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormValues>,
    mode: 'onBlur',
    defaultValues: defaultSettings,
  });

  // Auto-fill image gen defaults when provider changes
  const imageGenProvider = watch('imageGen.provider');
  const handleProviderChange = (newProvider: 'siliconflow' | 'seedream') => {
    setValue('imageGen.provider', newProvider);
    if (newProvider === 'seedream') {
      setValue('imageGen.baseUrl', 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
      setValue('imageGen.model', 'doubao-seedream-5-0-260128');
    } else {
      setValue('imageGen.baseUrl', 'https://api.siliconflow.cn/v1/images/generations');
      setValue('imageGen.model', 'Kwai-Kolors/Kolors');
    }
  };

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        if (result.success && result.data) {
          const metaHasApiKey = (result.meta?.hasApiKey ?? {}) as Partial<Record<ApiConfigKey, boolean>>;
          setStoredApiKeyFlags((prev) => ({
            ...prev,
            ai: Boolean(metaHasApiKey.ai),
            imageGen: Boolean(metaHasApiKey.imageGen),
            wechatArticle: Boolean(metaHasApiKey.wechatArticle),
            wechatPublish: Boolean(metaHasApiKey.wechatPublish),
            xiaohongshu: Boolean(metaHasApiKey.xiaohongshu),
          }));
          reset({
            ai: { ...defaultSettings.ai, ...result.data.ai },
            wechatArticle: { ...defaultSettings.wechatArticle, ...result.data.wechatArticle },
            imageGen: { ...defaultSettings.imageGen, ...result.data.imageGen },
            xiaohongshu: { ...defaultSettings.xiaohongshu, ...result.data.xiaohongshu },
            wechatPublish: { ...defaultSettings.wechatPublish, ...result.data.wechatPublish },
            preferences: { ...defaultSettings.preferences, ...result.data.preferences },
          });
        }
      } catch (err) {
        console.error('加载设置失败:', err);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [reset, isAuthenticated]);

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const inputBaseClass = 'w-full px-4 py-2 bg-[#F7F6F0] rounded-xl text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 transition-colors border';
  const normalInputClass = 'border-[rgba(0,0,0,0.06)] focus:border-[rgba(0,0,0,0.15)] focus:ring-[rgba(0,0,0,0.1)]/20';
  const errorInputClass = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';

  // 验证单个 API 配置
  const validateApi = async (
    name: string,
    endpoint: string,
    apiKey: string,
    testFn?: () => Promise<boolean>
  ): Promise<ValidationResult> => {
    if (!endpoint || !apiKey) {
      return { name, status: 'skipped', message: '未配置，跳过验证' };
    }

    try {
      if (testFn) {
        const success = await testFn();
        return success
          ? { name, status: 'success', message: '连接成功' }
          : { name, status: 'error', message: '连接失败' };
      }
      // 默认只检查是否填写
      return { name, status: 'success', message: '配置已保存' };
    } catch (error) {
      return { name, status: 'error', message: error instanceof Error ? error.message : '验证失败' };
    }
  };

  // 测试 AI 接口
  const testAiApi = async (baseUrl: string, apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const result = await response.json();
      return result.success;
    } catch {
      return false;
    }
  };

  const onSubmit = async (values: SettingsFormValues) => {
    if (!ensureLogin()) return;

    try {
      // 先保存配置
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();

      if (!result.success) {
        toast.error('保存失败', { description: result.error });
        return;
      }

      // 验证已填写的配置
      const results: ValidationResult[] = [];

      // AI 接口验证
      if (values.ai.baseUrl && values.ai.apiKey) {
        const aiResult = await validateApi(
          'AI 接口',
          values.ai.baseUrl,
          values.ai.apiKey,
          () => testAiApi(values.ai.baseUrl, values.ai.apiKey)
        );
        results.push(aiResult);
      } else {
        results.push({ name: 'AI 接口', status: 'skipped', message: '未配置，跳过验证' });
      }

      // 公众号文章 API
      results.push(
        await validateApi('公众号文章 API', values.wechatArticle.endpoint, values.wechatArticle.apiKey)
      );

      // AI 图片生成
      results.push(
        await validateApi('AI 图片生成', values.imageGen.baseUrl, values.imageGen.apiKey)
      );

      // 小红书发布
      results.push(
        await validateApi('小红书发布 API', values.xiaohongshu.endpoint, values.xiaohongshu.apiKey)
      );

      // 公众号发布
      results.push(
        await validateApi('公众号发布 API', values.wechatPublish.endpoint, values.wechatPublish.apiKey)
      );

      // 显示验证结果
      setValidationResults(results);

      // 重置表单的 dirty 状态
      reset(values);
    } catch (err) {
      console.error('保存设置失败:', err);
      toast.error('保存失败', { description: '网络异常，请稍后重试' });
    }
  };

  const isConfigured = (key: ApiConfigKey, currentApiKey: string): boolean =>
    Boolean(currentApiKey) || storedApiKeyFlags[key];

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="设置" />
        <div className="p-6">
          <LoginPrompt description="登录后即可配置各类 API 和偏好设置" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <Header title="设置" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#333]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF6]">
      <Header title="设置" />

      {validationResults && (
        <ValidationResultModal
          results={validationResults}
          onClose={() => setValidationResults(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-4xl space-y-6">
        {/* 配置状态概览 */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#666]" />
            配置状态
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                name: 'AI 接口',
                icon: <Bot className="w-4 h-4" />,
                configured: isConfigured('ai', getValues('ai.apiKey')),
                required: true,
              },
              {
                name: '图片生成',
                icon: <Palette className="w-4 h-4" />,
                configured: isConfigured('imageGen', getValues('imageGen.apiKey')),
                required: false,
              },
              {
                name: '公众号文章',
                icon: <Newspaper className="w-4 h-4" />,
                configured: isConfigured('wechatArticle', getValues('wechatArticle.apiKey')),
                required: false,
              },
              {
                name: '微信发布',
                icon: <BookOpen className="w-4 h-4" />,
                configured: isConfigured('wechatPublish', getValues('wechatPublish.apiKey')),
                required: false,
              },
              {
                name: '小红书发布',
                icon: <BookMarked className="w-4 h-4" />,
                configured: isConfigured('xiaohongshu', getValues('xiaohongshu.apiKey')),
                required: false,
              },
            ].map((item) => (
              <div
                key={item.name}
                className={`relative px-3 py-3 rounded-xl border transition-colors ${item.configured
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : item.required
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[#F7F6F0] border-[rgba(0,0,0,0.06)]'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-[#F7F6F0] flex items-center justify-center text-[#666]">{item.icon}</div>
                  <span className="text-xs font-medium text-[#333]">{item.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {item.configured ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">已配置</span>
                    </>
                  ) : item.required ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-400">必填</span>
                    </>
                  ) : (
                    <span className="text-xs text-[#999]">可选</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Configuration */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">API 配置</h2>

          {/* AI API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-500/20 text-purple-500 rounded-lg flex items-center justify-center"><Bot className="w-3.5 h-3.5" /></span>
              AI 接口 (OpenAI兼容)
              <span className="text-xs text-[#999] ml-2">核心功能，建议配置</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#999] mb-1">API Base URL</label>
                <input
                  type="text"
                  {...register('ai.baseUrl')}
                  className={cn(inputBaseClass, errors.ai?.baseUrl ? errorInputClass : normalInputClass)}
                  placeholder="https://api.openai.com/v1"
                />
                <FieldError message={errors.ai?.baseUrl?.message} />
              </div>
              <div>
                <label className="block text-sm text-[#999] mb-1">Model</label>
                <select
                  {...register('ai.model')}
                  className={cn(inputBaseClass, errors.ai?.model ? errorInputClass : normalInputClass)}
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4-turbo">gpt-4-turbo</option>
                  <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                </select>
                <FieldError message={errors.ai?.model?.message} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-[#999] mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['ai'] ? 'text' : 'password'}
                    {...register('ai.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.ai?.apiKey ? errorInputClass : normalInputClass)}
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('ai')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                  >
                    {showKeys['ai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.ai?.apiKey?.message} />
              </div>
            </div>
          </div>

          {/* WeChat Article API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center"><Newspaper className="w-3.5 h-3.5" /></span>
              公众号文章 API
              <span className="text-xs text-[#999] ml-2">用于搜索文章素材</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#999] mb-1">API Endpoint</label>
                <input
                  type="text"
                  {...register('wechatArticle.endpoint')}
                  className={cn(inputBaseClass, errors.wechatArticle?.endpoint ? errorInputClass : normalInputClass)}
                  placeholder="https://api.example.com/wechat"
                />
                <FieldError message={errors.wechatArticle?.endpoint?.message} />
              </div>
              <div>
                <label className="block text-sm text-[#999] mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['wechatArticle'] ? 'text' : 'password'}
                    {...register('wechatArticle.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.wechatArticle?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('wechatArticle')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                  >
                    {showKeys['wechatArticle'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.wechatArticle?.apiKey?.message} />
              </div>
            </div>
          </div>

          {/* AI Image Generation API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-500/20 text-pink-500 rounded-lg flex items-center justify-center"><Palette className="w-3.5 h-3.5" /></span>
              AI 图片生成 API
              <span className="text-xs text-[#999] ml-2">用于生成文章配图</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-[#999] mb-1">Provider</label>
                <select
                  value={imageGenProvider}
                  onChange={(e) => handleProviderChange(e.target.value as 'siliconflow' | 'seedream')}
                  className={cn(inputBaseClass, normalInputClass, 'cursor-pointer')}
                >
                  <option value="siliconflow">硅基流动 (SiliconFlow)</option>
                  <option value="seedream">豆包 Seedream 5.0 (Volcengine)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#999] mb-1">API URL</label>
                <input
                  type="text"
                  {...register('imageGen.baseUrl')}
                  className={cn(inputBaseClass, errors.imageGen?.baseUrl ? errorInputClass : normalInputClass)}
                  placeholder={imageGenProvider === 'seedream' ? 'https://ark.cn-beijing.volces.com/api/v3/images/generations' : 'https://api.siliconflow.cn/v1/images/generations'}
                />
                <FieldError message={errors.imageGen?.baseUrl?.message} />
              </div>
              <div>
                <label className="block text-sm text-[#999] mb-1">Model</label>
                <input
                  type="text"
                  {...register('imageGen.model')}
                  className={cn(inputBaseClass, errors.imageGen?.model ? errorInputClass : normalInputClass)}
                  placeholder={imageGenProvider === 'seedream' ? 'doubao-seedream-5-0-260128' : 'Kwai-Kolors/Kolors'}
                />
                <FieldError message={errors.imageGen?.model?.message} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-[#999] mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['imageGen'] ? 'text' : 'password'}
                    {...register('imageGen.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.imageGen?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('imageGen')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                  >
                    {showKeys['imageGen'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.imageGen?.apiKey?.message} />
              </div>
            </div>
          </div>

          {/* Xiaohongshu API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center"><BookMarked className="w-3.5 h-3.5" /></span>
              小红书发布 API
              <span className="text-xs text-[#999] ml-2">可选，用于发布到小红书</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#999] mb-1">API Endpoint</label>
                <input
                  type="text"
                  {...register('xiaohongshu.endpoint')}
                  className={cn(inputBaseClass, errors.xiaohongshu?.endpoint ? errorInputClass : normalInputClass)}
                  placeholder="https://api.example.com/xhs"
                />
                <FieldError message={errors.xiaohongshu?.endpoint?.message} />
              </div>
              <div>
                <label className="block text-sm text-[#999] mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['xiaohongshu'] ? 'text' : 'password'}
                    {...register('xiaohongshu.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.xiaohongshu?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('xiaohongshu')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                  >
                    {showKeys['xiaohongshu'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.xiaohongshu?.apiKey?.message} />
              </div>
            </div>
          </div>

          {/* WeChat Publish API */}
          <div>
            <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center"><BookOpen className="w-3.5 h-3.5" /></span>
              公众号发布 API
              <span className="text-xs text-[#999] ml-2">可选，用于发布到公众号</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#999] mb-1">API Endpoint</label>
                <input
                  type="text"
                  {...register('wechatPublish.endpoint')}
                  className={cn(inputBaseClass, errors.wechatPublish?.endpoint ? errorInputClass : normalInputClass)}
                  placeholder="https://api.example.com/mp"
                />
                <FieldError message={errors.wechatPublish?.endpoint?.message} />
              </div>
              <div>
                <label className="block text-sm text-[#999] mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['wechatPublish'] ? 'text' : 'password'}
                    {...register('wechatPublish.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.wechatPublish?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('wechatPublish')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#333]"
                  >
                    {showKeys['wechatPublish'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.wechatPublish?.apiKey?.message} />
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-6 border border-[rgba(0,0,0,0.06)] mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">创作偏好</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-[#999] mb-1">默认插入图片数量</label>
              <select
                {...register('preferences.imageCount', { valueAsNumber: true })}
                className={cn(inputBaseClass, errors.preferences?.imageCount ? errorInputClass : normalInputClass)}
              >
                <option value={1}>1 张</option>
                <option value={2}>2 张</option>
                <option value={3}>3 张</option>
                <option value={4}>4 张</option>
                <option value={5}>5 张</option>
              </select>
              <FieldError message={errors.preferences?.imageCount?.message} />
            </div>

            <div>
              <label className="block text-sm text-[#999] mb-1">文章风格偏好</label>
              <select
                {...register('preferences.style')}
                className={cn(inputBaseClass, errors.preferences?.style ? errorInputClass : normalInputClass)}
              >
                <option value="casual">轻松活泼</option>
                <option value="professional">专业严谨</option>
                <option value="storytelling">故事化</option>
              </select>
              <FieldError message={errors.preferences?.style?.message} />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-[#999] mb-1">目标字数范围</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  {...register('preferences.minWords', { valueAsNumber: true })}
                  className={cn('w-32', inputBaseClass, errors.preferences?.minWords ? errorInputClass : normalInputClass)}
                />
                <span className="text-[#999]">-</span>
                <input
                  type="number"
                  {...register('preferences.maxWords', { valueAsNumber: true })}
                  className={cn('w-32', inputBaseClass, errors.preferences?.maxWords ? errorInputClass : normalInputClass)}
                />
                <span className="text-[#999] text-sm">字</span>
              </div>
              <div className="flex items-center gap-4">
                <FieldError message={errors.preferences?.minWords?.message} />
                <FieldError message={errors.preferences?.maxWords?.message} />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button - 始终可用 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-[#333] to-[#555] text-white rounded-xl hover:from-[#444] hover:to-[#666] hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存并验证中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存设置
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
