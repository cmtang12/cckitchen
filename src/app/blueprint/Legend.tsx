import React from 'react';
import { UIState } from './BlueprintApp';
import { HandoffType } from './types';
import { AlertTriangle, Star, Target, Link2, MousePointer, Mail, Database, Package, Cpu, GitBranch } from 'lucide-react';
import { HANDOFF_COLORS } from './ConnectionsOverlay';

interface Props {
  ui: UIState;
  setUI: React.Dispatch<React.SetStateAction<UIState>>;
}

const HANDOFFS: { value: HandoffType; label: string; icon: React.ReactNode }[] = [
  { value: 'human', label: 'Human', icon: <MousePointer size={12} /> },
  { value: 'email', label: 'Email', icon: <Mail size={12} /> },
  { value: 'crm', label: 'CRM', icon: <Database size={12} /> },
  { value: 'physical', label: 'Physical', icon: <Package size={12} /> },
  { value: 'system', label: 'System', icon: <Cpu size={12} /> },
  { value: 'cross-functional', label: 'Cross Functional', icon: <GitBranch size={12} /> },
];

export function Legend({ ui, setUI }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-5 flex-shrink-0 flex-wrap text-xs">
      {/* Icons legend */}
      <div className="flex items-center gap-1 text-gray-400 font-semibold uppercase tracking-widest" style={{ fontSize: 9 }}>
        Icons
      </div>
      <div className="flex items-center gap-1 text-amber-600">
        <AlertTriangle size={12} /> <span>Risks / Gaps</span>
      </div>
      <div className="flex items-center gap-1 text-emerald-600">
        <Star size={12} /> <span>Delights</span>
      </div>
      <div className="flex items-center gap-1 text-orange-500">
        <Target size={12} /> <span>MTM</span>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Handoff types */}
      <div className="flex items-center gap-1 text-gray-400 font-semibold uppercase tracking-widest" style={{ fontSize: 9 }}>
        Handoff
      </div>
      {HANDOFFS.map(h => (
        <button
          key={h.value}
          onClick={() => setUI(u => ({ ...u, selectedHandoff: h.value }))}
          className={[
            'flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all',
            ui.selectedHandoff === h.value ? 'text-white' : 'bg-white',
          ].join(' ')}
          style={
            ui.selectedHandoff === h.value
              ? { background: HANDOFF_COLORS[h.value], borderColor: HANDOFF_COLORS[h.value], color: '#fff' }
              : { color: HANDOFF_COLORS[h.value], borderColor: HANDOFF_COLORS[h.value] + '55' }
          }
        >
          {h.icon}
          <span>{h.label}</span>
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Connect mode */}
      <button
        onClick={() =>
          setUI(u => ({
            ...u,
            mode: u.mode === 'connect' ? 'select' : 'connect',
            connectFrom: null,
          }))
        }
        className={[
          'flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium transition-all',
          ui.mode === 'connect'
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'border-gray-300 text-gray-600 hover:border-gray-500',
        ].join(' ')}
      >
        <Link2 size={12} />
        {ui.mode === 'connect' ? (
          <span>{ui.connectFrom ? 'Click target task…' : 'Click source task…'}</span>
        ) : (
          <span>Connect</span>
        )}
      </button>
    </div>
  );
}
