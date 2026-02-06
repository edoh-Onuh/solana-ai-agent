'use client';

import { DecentralizationMetrics } from '@/lib/types';
import { BarChart3, PieChart, TrendingDown } from 'lucide-react';

interface MetricsChartsProps {
  metrics: DecentralizationMetrics;
}

export function MetricsCharts({ metrics }: MetricsChartsProps) {
  const { nakamotoCoefficient, topValidatorConcentration, geographicDiversity, clientDiversity } = metrics;
  
  // Calculate percentages for pie chart
  const totalClients = clientDiversity.agave + clientDiversity.jito + clientDiversity.firedancer + clientDiversity.unknown;
  const clientPercentages = {
    agave: totalClients > 0 ? (clientDiversity.agave / totalClients) * 100 : 0,
    jito: totalClients > 0 ? (clientDiversity.jito / totalClients) * 100 : 0,
    firedancer: totalClients > 0 ? (clientDiversity.firedancer / totalClients) * 100 : 0,
    unknown: totalClients > 0 ? (clientDiversity.unknown / totalClients) * 100 : 0,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stake Concentration Chart */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          Stake Concentration
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Top 10 Validators</span>
              <span className="text-white font-semibold">{topValidatorConcentration.top10Percentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                style={{ width: `${topValidatorConcentration.top10Percentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Top 20 Validators</span>
              <span className="text-white font-semibold">{topValidatorConcentration.top20Percentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                style={{ width: `${topValidatorConcentration.top20Percentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Top 50 Validators</span>
              <span className="text-white font-semibold">{topValidatorConcentration.top50Percentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-500"
                style={{ width: `${topValidatorConcentration.top50Percentage}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-purple-300 text-xs">
            Lower concentration = Better decentralization
          </p>
        </div>
      </div>

      {/* Client Diversity Chart */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          Client Diversity
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Agave</span>
              <span className="text-white font-semibold">{clientPercentages.agave.toFixed(1)}% ({clientDiversity.agave})</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${clientPercentages.agave}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Jito</span>
              <span className="text-white font-semibold">{clientPercentages.jito.toFixed(1)}% ({clientDiversity.jito})</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${clientPercentages.jito}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-300">Firedancer</span>
              <span className="text-white font-semibold">{clientPercentages.firedancer.toFixed(1)}% ({clientDiversity.firedancer})</span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                style={{ width: `${clientPercentages.firedancer}%` }}
              />
            </div>
          </div>
          
          {clientPercentages.unknown > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-purple-300">Unknown</span>
                <span className="text-white font-semibold">{clientPercentages.unknown.toFixed(1)}% ({clientDiversity.unknown})</span>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gray-500 to-gray-600 transition-all duration-500"
                  style={{ width: `${clientPercentages.unknown}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-purple-300 text-xs">
            More diversity = More resilient network
          </p>
        </div>
      </div>

      {/* Geographic Diversity */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-purple-400" />
          Geographic Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {geographicDiversity.countries}
            </div>
            <div className="text-purple-300 text-sm">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {geographicDiversity.cities}
            </div>
            <div className="text-purple-300 text-sm">Cities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {geographicDiversity.datacenters}
            </div>
            <div className="text-purple-300 text-sm">Datacenters</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-purple-300 text-xs">
            Global distribution reduces regional failure risk
          </p>
        </div>
      </div>

      {/* Nakamoto Coefficient Gauge */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold mb-4">Nakamoto Coefficient</h3>
        <div className="flex items-center justify-center py-8">
          <div className="relative">
            <div className="text-6xl font-bold text-white">
              {nakamotoCoefficient}
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-purple-300 text-sm whitespace-nowrap">
              validators for 33%
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-purple-300">Decentralization Score</span>
            <span className={`font-semibold ${
              nakamotoCoefficient >= 35 ? 'text-green-400' :
              nakamotoCoefficient >= 25 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {nakamotoCoefficient >= 35 ? 'Excellent' :
               nakamotoCoefficient >= 25 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                nakamotoCoefficient >= 35 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                nakamotoCoefficient >= 25 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                'bg-gradient-to-r from-red-500 to-red-600'
              }`}
              style={{ width: `${Math.min(100, (nakamotoCoefficient / 50) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-purple-300 text-xs">
            Higher coefficient = Harder to attack the network
          </p>
        </div>
      </div>
    </div>
  );
}
