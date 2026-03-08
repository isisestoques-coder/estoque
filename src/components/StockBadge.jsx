import React from 'react';
import { Package, AlertCircle } from 'lucide-react';

export default function StockBadge({ quantity, settings }) {
  if (quantity === undefined || quantity === null) return null;

  const warningLevel = settings?.min_quantity_warning ?? 5;
  const criticalLevel = settings?.min_quantity_critical ?? 0;
  
  const colorWarning = settings?.color_warning ?? 'var(--status-warning)';
  const colorCritical = settings?.color_critical ?? 'var(--status-critical)';

  let badgeColor = 'var(--status-good)';
  let bgOpacity = 'rgba(16, 185, 129, 0.1)';
  let statusText = 'Estoque OK';
  let showIcon = false;

  if (quantity <= criticalLevel) {
    badgeColor = colorCritical;
    bgOpacity = 'rgba(239, 68, 68, 0.15)';
    statusText = 'Crítico';
    showIcon = true;
  } else if (quantity <= warningLevel) {
    badgeColor = colorWarning;
    bgOpacity = 'rgba(245, 158, 11, 0.15)';
    statusText = 'Atenção';
    showIcon = true;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '20px',
      backgroundColor: bgOpacity,
      color: badgeColor,
      fontSize: '0.75rem',
      fontWeight: '600',
      border: `1px solid ${badgeColor}30`
    }}>
      {showIcon && <AlertCircle size={12} />}
      {statusText} ({quantity})
    </div>
  );
}
