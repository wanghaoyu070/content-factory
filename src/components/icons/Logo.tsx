'use client';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'w-8 h-8' }: LogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 背景渐变圆角方块 */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* 主背景 */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="url(#logoGradient)"
      />

      {/* 笔/创作符号 */}
      <path
        d="M12 28L14 18L26 10L28 12L20 24L12 28Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M14 18L16 20L26 10"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* AI 闪光点 */}
      <circle cx="28" cy="10" r="2" fill="url(#sparkGradient)" />
      <circle cx="32" cy="14" r="1.5" fill="#fbbf24" fillOpacity="0.8" />
      <circle cx="30" cy="8" r="1" fill="#fbbf24" fillOpacity="0.6" />

      {/* 底部装饰线 */}
      <path
        d="M10 30H18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
    </svg>
  );
}
