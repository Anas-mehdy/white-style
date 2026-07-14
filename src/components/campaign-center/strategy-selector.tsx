"use client";

import { CampaignStrategy } from "./types";
import { StrategyCard } from "./strategy-card";

interface StrategySelectorProps {
  strategies: CampaignStrategy[];
  selectedTier: 'conservative' | 'balanced' | 'aggressive' | null;
  onSelectTier: (tier: 'conservative' | 'balanced' | 'aggressive') => void;
  disabled?: boolean;
}

export function StrategySelector({ strategies, selectedTier, onSelectTier, disabled }: StrategySelectorProps) {
  // Sort strategies so conservative is first, balanced second, aggressive third
  const order = { conservative: 1, balanced: 2, aggressive: 3 };
  const sorted = [...strategies].sort((a, b) => (order[a.tier] || 99) - (order[b.tier] || 99));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="panel-heading">
        <h2 style={{ fontSize: "15px", fontWeight: "600" }}>استراتيجيات الحملة المقترحة من الذكاء الاصطناعي</h2>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        {sorted.map((strategy) => (
          <StrategyCard
            key={strategy.tier}
            strategy={strategy}
            isSelected={selectedTier === strategy.tier}
            onSelect={() => onSelectTier(strategy.tier)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
