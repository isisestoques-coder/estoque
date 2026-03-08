import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

export default function ProductCard({ code, description, totalQuantity, settings, onEditSettings, onClickVenda }) {
  const warningLevel = settings?.min_quantity_warning ?? 5;
  const criticalLevel = settings?.min_quantity_critical ?? 0;
  const colorWarning = settings?.color_warning ?? 'var(--status-warning)';
  const colorCritical = settings?.color_critical ?? 'var(--status-critical)';

  let badgeColor = 'var(--status-good)';
  let statusText = 'Estoque Normal';

  if (totalQuantity <= criticalLevel) {
    badgeColor = colorCritical;
    statusText = 'Esgotado / Crítico';
  } else if (totalQuantity <= warningLevel) {
    badgeColor = colorWarning;
    statusText = 'Baixo Estoque';
  }

  return (
    <div className="glass-card" style={{ marginBottom: '16px', borderLeft: `4px solid ${badgeColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Cod/Categoria: {code} {description ? `- ${description}` : ''}</h3>
          <span style={{ fontSize: '0.85rem', color: badgeColor, fontWeight: '500' }}>
            {statusText}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalQuantity}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>em estoque</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="btn btn-primary" onClick={() => onClickVenda(code)} style={{ flex: 1, padding: '10px' }}>
          Vender
        </button>
        <button className="btn btn-secondary" onClick={() => onEditSettings(code)} style={{ padding: '10px 14px', width: 'auto' }}>
          Config
        </button>
      </div>
    </div>
  );
}
