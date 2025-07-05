import React from 'react';

interface WholesaleStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const WholesaleStatsCard: React.FC<WholesaleStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend
}) => {
  return (
    <div
      className="p-6 rounded-xl"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
        backdropFilter: 'blur(12px)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-300">{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-xs ${
            trend.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-400">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

export default WholesaleStatsCard; 