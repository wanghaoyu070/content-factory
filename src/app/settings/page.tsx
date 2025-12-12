'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Eye, EyeOff, Save, CheckCircle, Loader2 } from 'lucide-react';

interface Settings {
  ai: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  wechatArticle: {
    endpoint: string;
    apiKey: string;
  };
  unsplash: {
    accessKey: string;
  };
  imageGen: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
  xiaohongshu: {
    endpoint: string;
    apiKey: string;
  };
  wechatPublish: {
    endpoint: string;
    apiKey: string;
  };
  preferences: {
    imageCount: number;
    style: string;
    minWords: number;
    maxWords: number;
  };
}

const defaultSettings: Settings = {
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

export default function SettingsPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        if (result.success && result.data) {
          setSettings((prev) => ({
            ai: result.data.ai || prev.ai,
            wechatArticle: result.data.wechatArticle || prev.wechatArticle,
            unsplash: result.data.unsplash || prev.unsplash,
            imageGen: result.data.imageGen || prev.imageGen,
            xiaohongshu: result.data.xiaohongshu || prev.xiaohongshu,
            wechatPublish: result.data.wechatPublish || prev.wechatPublish,
            preferences: result.data.preferences || prev.preferences,
          }));
        }
      } catch (err) {
        console.error('加载设置失败:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (err) {
      console.error('保存设置失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

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

      <div className="p-6 max-w-4xl">
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
                <label className="block text-sm text-slate-500 mb-1">API Base URL</label>
                <input
                  type="text"
                  value={settings.ai.baseUrl}
                  onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, baseUrl: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">Model</label>
                <select
                  value={settings.ai.model}
                  onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, model: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-4-turbo">gpt-4-turbo</option>
                  <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-500 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['ai'] ? 'text' : 'password'}
                    value={settings.ai.apiKey}
                    onChange={(e) => setSettings({ ...settings, ai: { ...settings.ai, apiKey: e.target.value } })}
                    className="w-full px-4 py-2 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => toggleShowKey('ai')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['ai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <label className="block text-sm text-slate-500 mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={settings.wechatArticle.endpoint}
                  onChange={(e) => setSettings({ ...settings, wechatArticle: { ...settings.wechatArticle, endpoint: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['wechatArticle'] ? 'text' : 'password'}
                    value={settings.wechatArticle.apiKey}
                    onChange={(e) => setSettings({ ...settings, wechatArticle: { ...settings.wechatArticle, apiKey: e.target.value } })}
                    className="w-full px-4 py-2 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => toggleShowKey('wechatArticle')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['wechatArticle'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                  value={settings.unsplash.accessKey}
                  onChange={(e) => setSettings({ ...settings, unsplash: { ...settings.unsplash, accessKey: e.target.value } })}
                  className="w-full px-4 py-2 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  onClick={() => toggleShowKey('unsplash')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showKeys['unsplash'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                <label className="block text-sm text-slate-500 mb-1">API URL</label>
                <input
                  type="text"
                  value={settings.imageGen.baseUrl}
                  onChange={(e) => setSettings({ ...settings, imageGen: { ...settings.imageGen, baseUrl: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="https://api.siliconflow.cn/v1/images/generations"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">Model</label>
                <input
                  type="text"
                  value={settings.imageGen.model}
                  onChange={(e) => setSettings({ ...settings, imageGen: { ...settings.imageGen, model: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Kwai-Kolors/Kolors"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-500 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['imageGen'] ? 'text' : 'password'}
                    value={settings.imageGen.apiKey}
                    onChange={(e) => setSettings({ ...settings, imageGen: { ...settings.imageGen, apiKey: e.target.value } })}
                    className="w-full px-4 py-2 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => toggleShowKey('imageGen')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['imageGen'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <label className="block text-sm text-slate-500 mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={settings.xiaohongshu.endpoint}
                  onChange={(e) => setSettings({ ...settings, xiaohongshu: { ...settings.xiaohongshu, endpoint: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['xiaohongshu'] ? 'text' : 'password'}
                    value={settings.xiaohongshu.apiKey}
                    onChange={(e) => setSettings({ ...settings, xiaohongshu: { ...settings.xiaohongshu, apiKey: e.target.value } })}
                    className="w-full px-4 py-2 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => toggleShowKey('xiaohongshu')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['xiaohongshu'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <label className="block text-sm text-slate-500 mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={settings.wechatPublish.endpoint}
                  onChange={(e) => setSettings({ ...settings, wechatPublish: { ...settings.wechatPublish, endpoint: e.target.value } })}
                  className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['wechatPublish'] ? 'text' : 'password'}
                    value={settings.wechatPublish.apiKey}
                    onChange={(e) => setSettings({ ...settings, wechatPublish: { ...settings.wechatPublish, apiKey: e.target.value } })}
                    className="w-full px-4 py-2 pr-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    onClick={() => toggleShowKey('wechatPublish')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys['wechatPublish'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-[#16162a] rounded-2xl p-6 border border-[#2d2d44] mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">创作偏好</h2>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-500 mb-1">默认插入图片数量</label>
              <select
                value={settings.preferences.imageCount}
                onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, imageCount: Number(e.target.value) } })}
                className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value={1}>1 张</option>
                <option value={2}>2 张</option>
                <option value={3}>3 张</option>
                <option value={4}>4 张</option>
                <option value={5}>5 张</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-500 mb-1">文章风格偏好</label>
              <select
                value={settings.preferences.style}
                onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, style: e.target.value } })}
                className="w-full px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="casual">轻松活泼</option>
                <option value="professional">专业严谨</option>
                <option value="storytelling">故事化</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-slate-500 mb-1">目标字数范围</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={settings.preferences.minWords}
                  onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, minWords: Number(e.target.value) } })}
                  className="w-32 px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="number"
                  value={settings.preferences.maxWords}
                  onChange={(e) => setSettings({ ...settings, preferences: { ...settings.preferences, maxWords: Number(e.target.value) } })}
                  className="w-32 px-4 py-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <span className="text-slate-500 text-sm">字</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            {saving ? (
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
      </div>
    </div>
  );
}
