// AI Agent for validator analysis and recommendations
import OpenAI from 'openai';
import { ValidatorMetrics, AIRecommendation, ValidatorRecommendation, DecentralizationMetrics } from './types';
import { isSuperteamValidator, SUPERTEAM_SCORE_BOOST, SUPERTEAM_MIN_PERCENTAGE } from './superteam-validators';

// Only initialize OpenAI on server-side
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_key_here') {
    return null;
  }
  return new OpenAI({ apiKey });
};

export class AIAgent {
  /**
   * Analyze a single validator using AI
   */
  async analyzeValidator(validator: ValidatorMetrics): Promise<{
    analysis: string;
    score: number;
    risks: string[];
    recommendations: string[];
  }> {
    try {
      const openai = getOpenAIClient();
      if (!openai) {
        return this.fallbackAnalysis(validator);
      }

      const prompt = `You are an expert Solana validator analyst focused on network decentralization.

Analyze this validator:
- Pubkey: ${validator.pubkey}
- Stake: ${(validator.activatedStake / 1e9).toFixed(2)} SOL (${validator.stakePercentage.toFixed(2)}% of network)
- Commission: ${validator.commission}%
- Vote Credits: ${validator.voteCredits}
- Delinquent: ${validator.delinquent ? 'Yes' : 'No'}
- Location: ${validator.city || 'Unknown'}, ${validator.country || 'Unknown'}
- Datacenter: ${validator.datacenter || 'Unknown'}
- Client: ${validator.clientType || 'Unknown'}

Provide:
1. Brief analysis (2-3 sentences)
2. Decentralization score (0-100)
3. Key risks (if any)
4. Recommendations for improvement

Format as JSON:
{
  "analysis": "...",
  "score": 85,
  "risks": ["..."],
  "recommendations": ["..."]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use gpt-4 for production
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);

      return result;
    } catch (error) {
      console.error('Error analyzing validator:', error);
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(validator);
    }
  }

  /**
   * Fallback rule-based analysis when AI fails
   */
  private fallbackAnalysis(validator: ValidatorMetrics) {
    let score = 50;
    const risks: string[] = [];
    const recommendations: string[] = [];

    // Performance scoring
    if (!validator.delinquent) score += 20;
    if (validator.commission < 10) score += 10;
    if (validator.voteCredits > 100000) score += 10;

    // Decentralization scoring
    if (validator.stakePercentage < 0.5) score += 10;
    if (validator.country && validator.country !== 'US') score += 5;

    // Superteam Community Bonus
    if (isSuperteamValidator(validator.pubkey)) {
      score += SUPERTEAM_SCORE_BOOST;
      recommendations.push('Superteam Community validator - trusted by the community');
    }

    // Identify risks
    if (validator.stakePercentage > 2) {
      risks.push('High stake concentration');
    }
    if (validator.delinquent) {
      risks.push('Currently delinquent');
    }
    if (validator.commission > 10) {
      risks.push('High commission rate');
    }

    // Generate recommendations
    if (validator.stakePercentage < 0.1) {
      recommendations.push('Good candidate for increased delegation');
    }
    if (validator.country && validator.country !== 'US') {
      recommendations.push('Helps geographic decentralization');
    }

    return {
      analysis: `Validator with ${validator.stakePercentage.toFixed(2)}% network stake. ${
        validator.delinquent ? 'Currently delinquent.' : 'Active and voting.'
      }`,
      score: Math.min(100, score),
      risks,
      recommendations,
    };
  }

  /**
   * Generate stake delegation recommendations for maximum decentralization
   */
  async generateRecommendations(
    validators: ValidatorMetrics[],
    currentMetrics: DecentralizationMetrics,
    targetStake: number = 1000000 * 1e9 // Amount of SOL to delegate (1M SOL in lamports)
  ): Promise<AIRecommendation> {
    const openai = getOpenAIClient();
    
    // If no OpenAI client, use fallback immediately
    if (!openai) {
      console.log('No OpenAI API key, using rule-based recommendations');
      return this.fallbackRecommendations(validators, currentMetrics, targetStake);
    }
    
    try {
      // Sort validators by decentralization potential
      const underrepresented = validators
        .filter(v => !v.delinquent)
        .filter(v => v.stakePercentage < 1) // Focus on smaller validators
        .filter(v => v.commission < 10) // Reasonable commission
        .sort((a, b) => a.stakePercentage - b.stakePercentage)
        .slice(0, 20);

      // Use AI to analyze and prioritize
      const prompt = `You are an advanced AI agent specialized in Solana network decentralization and validator economics. Your mission is to optimize stake distribution to maximize network security and decentralization.

## CURRENT NETWORK STATE

**Decentralization Metrics:**
- Nakamoto Coefficient: ${currentMetrics.nakamotoCoefficient} (minimum validators needed to control >33% stake)
- Top 10 validators control: ${currentMetrics.topValidatorConcentration.top10Percentage.toFixed(2)}% of total stake
- Top 20 validators control: ${currentMetrics.topValidatorConcentration.top20Percentage.toFixed(2)}% of total stake
- Geographic diversity: ${currentMetrics.geographicDiversity.countries} countries, ${currentMetrics.geographicDiversity.cities} cities
- Client diversity: Agave: ${currentMetrics.clientDiversity.agave}, Jito: ${currentMetrics.clientDiversity.jito}, Firedancer: ${currentMetrics.clientDiversity.firedancer}
- Total validators: ${validators.length}

**Critical Issues:**
${currentMetrics.nakamotoCoefficient < 30 ? '⚠️ LOW Nakamoto coefficient - network is vulnerable to stake concentration attacks' : ''}
${currentMetrics.topValidatorConcentration.top10Percentage > 35 ? '⚠️ HIGH concentration in top 10 validators - centralization risk' : ''}
${currentMetrics.geographicDiversity.countries < 15 ? '⚠️ LIMITED geographic diversity - regional failure risk' : ''}

## AVAILABLE STAKE FOR DELEGATION
${(targetStake / 1e9).toFixed(2)} SOL (~$${((targetStake / 1e9) * 150).toFixed(0)})

## CANDIDATE VALIDATORS (Underrepresented & High-Quality)
${underrepresented.slice(0, 15).map((v, i) => 
  `${i + 1}. Pubkey: ${v.pubkey.slice(0, 12)}...
   - Current stake: ${(v.activatedStake / 1e9).toFixed(2)} SOL (${v.stakePercentage.toFixed(4)}% of network)
   - Commission: ${v.commission}%
   - Performance: ${v.delinquent ? '❌ DELINQUENT' : '✅ Active'}
   - Vote credits: ${v.voteCredits.toLocaleString()}
   - Location: ${v.city || 'Unknown'}, ${v.country || 'Unknown'}
   - Client: ${v.clientType || 'Unknown'}
   - Datacenter: ${v.datacenter || 'Unknown'}`
).join('\n\n')}

## YOUR TASK

Analyze the network state and recommend how to distribute the ${(targetStake / 1e9).toFixed(2)} SOL across 5-10 validators to achieve MAXIMUM decentralization improvement.

**Optimization Goals (in priority order):**
1. **Increase Nakamoto Coefficient** - Target: Improve by at least 2-3 points
2. **Reduce Top 10 Concentration** - Target: Reduce by at least 0.5%
3. **Enhance Geographic Diversity** - Prioritize validators in underrepresented regions
4. **Improve Client Diversity** - Balance between Agave, Jito, and Firedancer
5. **Maintain Performance** - Only recommend active, non-delinquent validators

**Selection Criteria:**
- Prefer validators with <0.5% current stake
- Avoid validators in over-represented regions (especially if >40% in one country)
- Prioritize low commission (<8%)
- Ensure good performance history (vote credits, uptime)
- Distribute across different datacenters

**Expected Output Format (JSON):**
{
  "validators": [
    {
      "pubkey": "full_validator_pubkey",
      "recommendedStake": 150000,
      "reason": "Detailed reason: low stake (0.01%), helps geographic diversity (Japan), good performance, Firedancer client adds diversity",
      "riskLevel": "low|medium|high"
    }
  ],
  "reasoning": "Comprehensive explanation of strategy: why these validators, expected impact, risk assessment, and how this improves each metric",
  "confidence": 0.85,
  "expectedNakamoto": 34,
  "expectedImpact": "Detailed summary: Nakamoto coefficient improvement from ${currentMetrics.nakamotoCoefficient} to XX, top 10 concentration reduction from ${currentMetrics.topValidatorConcentration.top10Percentage.toFixed(1)}% to XX%, addition of validators from 2 new geographic regions"
}

**Important:** Be specific, data-driven, and explain your reasoning clearly. Show mathematical projections for impact.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for complex reasoning
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const aiResult = JSON.parse(content);

      // Build recommendation object
      const recommendation: AIRecommendation = {
        id: `rec_${Date.now()}`,
        timestamp: Date.now(),
        validators: aiResult.validators.map((v: any) => ({
          pubkey: v.pubkey,
          name: validators.find(val => val.pubkey === v.pubkey)?.name || 'Unknown',
          recommendedStake: v.recommendedStake,
          currentStake: validators.find(val => val.pubkey === v.pubkey)?.activatedStake || 0,
          reason: v.reason,
          riskLevel: v.riskLevel || 'medium',
          decentralizationScore: 0,
          performanceScore: 0,
        })),
        reasoning: aiResult.reasoning,
        confidence: aiResult.confidence,
        expectedImpact: {
          nakamotoCoefficient: {
            current: currentMetrics.nakamotoCoefficient,
            projected: aiResult.expectedNakamoto || currentMetrics.nakamotoCoefficient + 1,
          },
          stakeDistribution: {
            before: `Top 10: ${currentMetrics.topValidatorConcentration.top10Percentage.toFixed(1)}%`,
            after: aiResult.expectedImpact || 'Improved distribution',
          },
        },
        status: 'pending',
        votes: {
          approve: 0,
          reject: 0,
          total: 0,
        },
      };

      return recommendation;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      console.log('Falling back to rule-based recommendations...');
      // Fallback to rule-based recommendations
      return this.fallbackRecommendations(validators, currentMetrics, targetStake);
    }
  }

  /**
   * Fallback rule-based recommendations
   */
  private fallbackRecommendations(
    validators: ValidatorMetrics[],
    currentMetrics: DecentralizationMetrics,
    targetStake: number
  ): AIRecommendation {
    // Enhanced strategy: multi-factor optimization for decentralization
    const totalValidators = validators.length;
    const usValidators = validators.filter(v => v.country === 'United States').length;
    const usConcentration = usValidators / totalValidators;
    const agaveCount = validators.filter(v => v.clientType === 'agave').length;
    const agavePercentage = agaveCount / totalValidators;
    
    const candidates = validators
      .filter(v => !v.delinquent) // Must be active
      .filter(v => v.activatedStake > 100_000_000_000) // Min 100K SOL (active validators)
      .filter(v => v.stakePercentage < 1) // Not in top concentrated validators
      .filter(v => v.stakePercentage > 0.01) // Not too small (meaningful validators)
      .filter(v => v.commission <= 10) // Reasonable commission
      .sort((a, b) => {
        // Multi-factor scoring for diversity
        let aScore = 0;
        let bScore = 0;
        
        // 1. Stake decentralization (40% weight)
        aScore += (1 - a.stakePercentage / 100) * 40;
        bScore += (1 - b.stakePercentage / 100) * 40;
        
        // 2. Performance (30% weight)
        aScore += Math.min(30, (a.voteCredits / 10000) * 30);
        bScore += Math.min(30, (b.voteCredits / 10000) * 30);
        
        // 3. Geographic diversity bonus (15% weight)
        if (a.country !== 'United States' && usConcentration > 0.3) aScore += 15;
        if (b.country !== 'United States' && usConcentration > 0.3) bScore += 15;
        
        // 4. Client diversity bonus (15% weight)
        if (a.clientType !== 'agave' && agavePercentage > 0.6) aScore += 15;
        if (b.clientType !== 'agave' && agavePercentage > 0.6) bScore += 15;
        
        // 5. Superteam Community Bonus
        if (isSuperteamValidator(a.pubkey)) aScore += SUPERTEAM_SCORE_BOOST;
        if (isSuperteamValidator(b.pubkey)) bScore += SUPERTEAM_SCORE_BOOST;
        
        return bScore - aScore;
      })
      .slice(0, 15);

    // Ensure minimum Superteam representation
    const superteamCount = candidates.filter(v => isSuperteamValidator(v.pubkey)).length;
    const minSuperteamNeeded = Math.ceil(candidates.length * (SUPERTEAM_MIN_PERCENTAGE / 100));
    
    if (superteamCount < minSuperteamNeeded) {
      // Add more Superteam validators
      const superteamValidators = validators
        .filter(v => !v.delinquent && isSuperteamValidator(v.pubkey))
        .filter(v => !candidates.some(c => c.pubkey === v.pubkey))
        .slice(0, minSuperteamNeeded - superteamCount);
      
      // Replace lowest scoring non-Superteam validators
      candidates = [...candidates.slice(0, -(minSuperteamNeeded - superteamCount)), ...superteamValidators];
    }

    if (candidates.length === 0) {
      // Emergency fallback: just pick non-delinquent validators
      const emergencyCandidates = validators
        .filter(v => !v.delinquent)
        .sort((a, b) => a.stakePercentage - b.stakePercentage)
        .slice(0, 10);
      
      const stakePerValidator = targetStake / emergencyCandidates.length;
      const validatorRecs: ValidatorRecommendation[] = emergencyCandidates.map(v => ({
        pubkey: v.pubkey,
        name: v.name || 'Unknown',
        recommendedStake: stakePerValidator,
        currentStake: v.activatedStake,
        reason: `Active validator with ${v.stakePercentage.toFixed(3)}% stake concentration`,
        riskLevel: 'medium' as const,
        decentralizationScore: 70,
        performanceScore: 75,
      }));

      return {
        id: `rec_${Date.now()}`,
        timestamp: Date.now(),
        validators: validatorRecs,
        reasoning: `Selected ${emergencyCandidates.length} active validators. Note: Limited filtering due to data constraints.`,
        confidence: 0.6,
        expectedImpact: {
          nakamotoCoefficient: {
            current: currentMetrics.nakamotoCoefficient,
            projected: currentMetrics.nakamotoCoefficient + 1,
          },
          stakeDistribution: {
            before: `Top 10: ${currentMetrics.topValidatorConcentration.top10Percentage.toFixed(1)}%`,
            after: 'Reduced by ~0.2%',
          },
        },
        status: 'pending',
        votes: {
          approve: 0,
          reject: 0,
          total: 0,
        },
      };
    }

    const stakePerValidator = targetStake / candidates.length;
    
    // Count diversity metrics
    const countries = new Set(candidates.map(v => v.country).filter(Boolean));
    const clients = candidates.reduce((acc, v) => {
      acc[v.clientType || 'unknown'] = (acc[v.clientType || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const validatorRecs: ValidatorRecommendation[] = candidates.map(v => {
      const geoBonus = v.country !== 'United States' ? ' | Non-US location' : '';
      const clientType = v.clientType || 'unknown';
      const clientBonus = clientType !== 'agave' ? ` | ${clientType.charAt(0).toUpperCase()}${clientType.slice(1)} client` : '';
      
      return {
        pubkey: v.pubkey,
        name: v.name || 'Unknown',
        recommendedStake: stakePerValidator,
        currentStake: v.activatedStake,
        reason: `${v.voteCredits.toLocaleString()} vote credits, ${v.commission}% commission, ${v.stakePercentage.toFixed(3)}% stake${geoBonus}${clientBonus} | ${v.city}, ${v.country}`,
        riskLevel: v.stakePercentage < 0.1 ? 'low' as const : v.stakePercentage < 0.5 ? 'medium' as const : 'high' as const,
        decentralizationScore: Math.round((1 - v.stakePercentage / 100) * 100),
        performanceScore: Math.min(95, Math.round((v.voteCredits / 1000) * 0.8 + 20)),
      };
    });

    const clientSummary = Object.entries(clients)
      .map(([client, count]) => `${count} ${client}`)
      .join(', ');

    return {
      id: `rec_${Date.now()}`,
      timestamp: Date.now(),
      validators: validatorRecs,
      reasoning: `Selected ${candidates.length} high-quality validators optimized for decentralization across multiple dimensions:\n\n` +
        `📊 Performance: Avg ${(candidates.reduce((sum, v) => sum + v.commission, 0) / candidates.length).toFixed(1)}% commission, strong vote credits\n` +
        `🌍 Geographic: ${countries.size} countries (${Array.from(countries).slice(0, 3).join(', ')}${countries.size > 3 ? '...' : ''})\n` +
        `💻 Client Mix: ${clientSummary}\n` +
        `🎯 Stake: Avg ${(candidates.reduce((sum, v) => sum + v.stakePercentage, 0) / candidates.length).toFixed(3)}% network stake per validator`,
      confidence: 0.85,
      expectedImpact: {
        nakamotoCoefficient: {
          current: currentMetrics.nakamotoCoefficient,
          projected: currentMetrics.nakamotoCoefficient + 2,
        },
        stakeDistribution: {
          before: `Top 10: ${currentMetrics.topValidatorConcentration.top10Percentage.toFixed(1)}%`,
          after: 'Reduced by ~0.5%',
        },
      },
      status: 'pending',
      votes: {
        approve: 0,
        reject: 0,
        total: 0,
      },
    };
  }

  /**
   * Monitor validators autonomously and detect issues
   */
  async monitorValidators(validators: ValidatorMetrics[]): Promise<{
    alerts: string[];
    recommendations: string[];
  }> {
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Check for delinquent validators
    const delinquent = validators.filter(v => v.delinquent);
    if (delinquent.length > 10) {
      alerts.push(`${delinquent.length} validators are currently delinquent`);
    }

    // Check for stake concentration
    const totalStake = validators.reduce((sum, v) => sum + v.activatedStake, 0);
    const top10Stake = validators
      .sort((a, b) => b.activatedStake - a.activatedStake)
      .slice(0, 10)
      .reduce((sum, v) => sum + v.activatedStake, 0);
    
    const top10Percentage = (top10Stake / totalStake) * 100;
    if (top10Percentage > 40) {
      alerts.push(`Top 10 validators control ${top10Percentage.toFixed(1)}% of stake - high concentration risk`);
      recommendations.push('Recommend delegating to validators outside top 50 by stake');
    }

    return { alerts, recommendations };
  }
}

// Singleton instance
export const aiAgent = new AIAgent();
