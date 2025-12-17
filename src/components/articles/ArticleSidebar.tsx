'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Eye, Settings } from 'lucide-react';
import WechatStylePreview from '@/components/preview/WechatStylePreview';
import { SettingsPanel, type SettingsPanelProps } from './SettingsPanel';

export interface ArticleSidebarProps extends SettingsPanelProps {
  title: string;
  sidebarTab: 'settings' | 'preview';
  setSidebarTab: Dispatch<SetStateAction<'settings' | 'preview'>>;
}

export function ArticleSidebar({ sidebarTab, setSidebarTab, title, ...settingsPanelProps }: ArticleSidebarProps) {
  const { content } = settingsPanelProps;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setSidebarTab('settings')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'settings'
              ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600 -mb-px'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Settings className="w-4 h-4" />
            设置
          </button>
          <button
            onClick={() => setSidebarTab('preview')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${sidebarTab === 'preview'
              ? 'text-green-600 bg-green-50 border-b-2 border-green-600 -mb-px'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Eye className="w-4 h-4" />
            微信预览
          </button>
        </div>

        {sidebarTab === 'preview' && (
          <div className="p-4">
            <WechatStylePreview content={content} title={title} />
          </div>
        )}
      </div>

      {sidebarTab === 'settings' && <SettingsPanel {...settingsPanelProps} />}
    </div>
  );
}
