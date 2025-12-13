'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Eye, EyeOff, Save, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import LoginPrompt from '@/components/ui/LoginPrompt';
import { useLoginGuard } from '@/hooks/useLoginGuard';

const settingsSchema = z.object({
  ai: z.object({
    baseUrl: z.string().url('请输入有效的 API Base URL'),
    apiKey: z.string().min(1, 'API Key 不能为空'),
    model: z.string().min(1, '请选择模型'),
  }),
  wechatArticle: z.object({
    endpoint: z.string().url('请输入有效的接口地址'),
    apiKey: z.string().min(1, 'API Key 不能为空'),
  }),
  unsplash: z.object({
    accessKey: z.string().optional(),
  }),
  imageGen: z.object({
    baseUrl: z.string().url('请输入有效的接口地址'),
    apiKey: z.string().min(1, 'API Key 不能为空'),
    model: z.string().min(1, '请选择模型'),
  }),
  xiaohongshu: z.object({
    endpoint: z.string().url('请输入有效的接口地址'),
    apiKey: z.string().min(1, 'API Key 不能为空'),
  }),
  wechatPublish: z.object({
    endpoint: z.string().url('请输入有效的接口地址'),
    apiKey: z.string().min(1, 'API Key 不能为空'),
  }),
  preferences: z
    .object({
      imageCount: z.coerce.number().min(1, '至少生成 1 张图片').max(10, '最多生成 10 张图片'),
      style: z.string().min(1, '请选择创作风格'),
      minWords: z.coerce.number().min(300, '字数需不低于 300'),
      maxWords: z.coerce.number().max(5000, '字数需不超过 5000'),
    })
    .refine((val) => val.maxWords >= val.minWords, {
      message: '最大字数需大于或等于最小字数',
      path: ['maxWords'],
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
    endpoint: 'https://api.example.com/wechat',
    apiKey: '',
  },
  unsplash: {
    accessKey: '',
  },
  imageGen: {
    baseUrl: 'https://api.siliconflow.cn/v1/images/generations',
    apiKey: '',
    model: 'Kwai-Kolors/Kolors',
  },
  xiaohongshu: {
    endpoint: 'https://api.example.com/xhs',
    apiKey: '',
  },
  wechatPublish: {
    endpoint: 'https://api.example.com/mp',
    apiKey: '',
  },
  preferences: {
    imageCount: 3,
    style: 'professional',
    minWords: 1500,
    maxWords: 2500,
  },
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}

export default function SettingsPage() {
  const { ensureLogin, isAuthenticated, status } = useLoginGuard('请登录后配置接口');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormValues>,
    mode: 'onBlur',
    defaultValues: defaultSettings,
  });

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        if (result.success && result.data) {
          reset({
            ai: { ...defaultSettings.ai, ...result.data.ai },
            wechatArticle: { ...defaultSettings.wechatArticle, ...result.data.wechatArticle },
            unsplash: { ...defaultSettings.unsplash, ...result.data.unsplash },
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

  const inputBaseClass = 'w-full px-4 py-2 bg-[#1a1a2e] rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 transition-colors';
  const normalInputClass = 'border-[#2d2d44] focus:border-indigo-500 focus:ring-indigo-500/20';
  const errorInputClass = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';

  const onSubmit = async (values: SettingsFormValues) => {
    if (!ensureLogin()) return;
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast.error('保存失败', {
          description: result.error,
        });
      }
    } catch (err) {
      console.error('保存设置失败:', err);
      toast.error('保存失败', {
        description: '网络异常，请稍后重试',
      });
    }
  };

  if (status !== 'loading' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="设置" />
        <div className="p-6">
          <LoginPrompt description="登录后即可配置各类 API 和偏好设置" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f23]">
        <Header title="设置" />
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Header title="设置" />

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 max-w-4xl space-y-6">
        {/* API Configuration */}
        <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">API 配置</h2>

          {/* AI API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded flex items-center justify-center text-xs">🤖</span>
              AI 接口 (OpenAI兼容)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Base URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('ai.baseUrl')}
                  className={cn(inputBaseClass, errors.ai?.baseUrl ? errorInputClass : normalInputClass)}
                />
                <FieldError message={errors.ai?.baseUrl?.message} />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  Model <span className="text-red-400">*</span>
                </label>
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
                <label className="block text-sm text-slate-500 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys['ai'] ? 'text' : 'password'}
                    {...register('ai.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.ai?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('ai')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded flex items-center justify-center text-xs">📰</span>
              公众号文章 API
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Endpoint <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('wechatArticle.endpoint')}
                  className={cn(inputBaseClass, errors.wechatArticle?.endpoint ? errorInputClass : normalInputClass)}
                />
                <FieldError message={errors.wechatArticle?.endpoint?.message} />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys['wechatArticle'] ? 'text' : 'password'}
                    {...register('wechatArticle.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.wechatArticle?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('wechatArticle')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['wechatArticle'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.wechatArticle?.apiKey?.message} />
              </div>
            </div>
          </div>

          {/* Unsplash API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center text-xs">🖼️</span>
              Unsplash API
            </h3>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Access Key</label>
              <div className="relative">
                <input
                  type={showKeys['unsplash'] ? 'text' : 'password'}
                  {...register('unsplash.accessKey')}
                  className={cn(inputBaseClass, 'pr-10', errors.unsplash?.accessKey ? errorInputClass : normalInputClass)}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('unsplash')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['unsplash'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError message={errors.unsplash?.accessKey?.message} />
            </div>
          </div>

          {/* AI Image Generation API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-500/20 text-pink-400 rounded flex items-center justify-center text-xs">🎨</span>
              AI 图片生成 API (硅基流动)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('imageGen.baseUrl')}
                  className={cn(inputBaseClass, errors.imageGen?.baseUrl ? errorInputClass : normalInputClass)}
                  placeholder="https://api.siliconflow.cn/v1/images/generations"
                />
                <FieldError message={errors.imageGen?.baseUrl?.message} />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('imageGen.model')}
                  className={cn(inputBaseClass, errors.imageGen?.model ? errorInputClass : normalInputClass)}
                  placeholder="Kwai-Kolors/Kolors"
                />
                <FieldError message={errors.imageGen?.model?.message} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-500 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys['imageGen'] ? 'text' : 'password'}
                    {...register('imageGen.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.imageGen?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('imageGen')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['imageGen'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.imageGen?.apiKey?.message} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              用于生成文章配图，支持可灵 (Kwai-Kolors/Kolors) 等模型
            </p>
          </div>

          {/* Xiaohongshu API */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-500/20 text-red-400 rounded flex items-center justify-center text-xs">📕</span>
              小红书发布 API
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Endpoint <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('xiaohongshu.endpoint')}
                  className={cn(inputBaseClass, errors.xiaohongshu?.endpoint ? errorInputClass : normalInputClass)}
                />
                <FieldError message={errors.xiaohongshu?.endpoint?.message} />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys['xiaohongshu'] ? 'text' : 'password'}
                    {...register('xiaohongshu.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.xiaohongshu?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('xiaohongshu')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded flex items-center justify-center text-xs">📗</span>
              公众号发布 API
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Endpoint <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  {...register('wechatPublish.endpoint')}
                  className={cn(inputBaseClass, errors.wechatPublish?.endpoint ? errorInputClass : normalInputClass)}
                />
                <FieldError message={errors.wechatPublish?.endpoint?.message} />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys['wechatPublish'] ? 'text' : 'password'}
                    {...register('wechatPublish.apiKey')}
                    className={cn(inputBaseClass, 'pr-10', errors.wechatPublish?.apiKey ? errorInputClass : normalInputClass)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('wechatPublish')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
        <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">创作偏好</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-500 mb-1">
                默认插入图片数量 <span className="text-red-400">*</span>
              </label>
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
              <label className="block text-sm text-slate-500 mb-1">
                文章风格偏好 <span className="text-red-400">*</span>
              </label>
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
              <label className="block text-sm text-slate-500 mb-1">
                目标字数范围 <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  {...register('preferences.minWords', { valueAsNumber: true })}
                  className={cn('w-32', inputBaseClass, errors.preferences?.minWords ? errorInputClass : normalInputClass)}
                />
                <span className="text-slate-500">-</span>
                <input
                  type="number"
                  {...register('preferences.maxWords', { valueAsNumber: true })}
                  className={cn('w-32', inputBaseClass, errors.preferences?.maxWords ? errorInputClass : normalInputClass)}
                />
                <span className="text-slate-500 text-sm">字</span>
              </div>
              <div className="flex items-center gap-4">
                <FieldError message={errors.preferences?.minWords?.message} />
                <FieldError message={errors.preferences?.maxWords?.message} />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isValid || !isDirty}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                已保存
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
