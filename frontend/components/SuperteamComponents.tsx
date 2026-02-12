import { Shield, TrendingUp, Users, Globe } from 'lucide-react';

interface SuperteamBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function SuperteamBadge({ size = 'md', showIcon = true, className = '' }: SuperteamBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500
        text-white font-bold rounded-full
        shadow-lg shadow-purple-500/50
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {showIcon && <Shield className={iconSizes[size]} />}
      <span>Superteam Community</span>
    </div>
  );
}

interface SuperteamStatsProps {
  totalValidators: number;
  totalStake: number;
  averageCommission: number;
  countries: number;
}

export function SuperteamStats({ totalValidators, totalStake, averageCommission, countries }: SuperteamStatsProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-600/30 rounded-lg">
          <Shield className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Superteam Community Validators</h3>
          <p className="text-purple-300 text-sm">Verified and trusted by the Superteam network</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 text-sm">Validators</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalValidators}</div>
        </div>

        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            <span className="text-pink-300 text-sm">Total Stake</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {(totalStake / 1e9).toFixed(0)}K
          </div>
          <div className="text-xs text-pink-300">SOL</div>
        </div>

        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <span className="text-orange-300 text-sm">Avg Commission</span>
          </div>
          <div className="text-3xl font-bold text-white">{averageCommission.toFixed(1)}%</div>
        </div>

        <div className="bg-black/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 text-sm">Countries</span>
          </div>
          <div className="text-3xl font-bold text-white">{countries}</div>
        </div>
      </div>
    </div>
  );
}

interface SuperteamFilterProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  count: number;
}

export function SuperteamFilter({ enabled, onToggle, count }: SuperteamFilterProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-all
        ${enabled 
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' 
          : 'bg-white/10 text-purple-300 hover:bg-white/20'}
      `}
    >
      <Shield className="w-5 h-5" />
      <span className="font-semibold">
        {enabled ? 'Showing' : 'Show'} Superteam Only
      </span>
      {count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-bold
          ${enabled ? 'bg-white/20' : 'bg-purple-600/30'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}
