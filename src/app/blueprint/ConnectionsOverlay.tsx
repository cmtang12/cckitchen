import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Connection, HandoffType, Task } from './types';

interface Props {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  connections: Connection[];
  tasks: Task[];
  onDeleteConnection: (id: string) => void;
  onUpdateConnection: (id: string, handoffType: HandoffType) => void;
}

export const HANDOFF_COLORS: Record<HandoffType, string> = {
  human: '#374151',
  email: '#2563EB',
  crm: '#7C3AED',
  physical: '#D97706',
  system: '#059669',
  'cross-functional': '#DC2626',
};

const HANDOFF_DASH: Record<HandoffType, string> = {
  human: 'none',
  email: '5,3',
  crm: '3,3',
  physical: 'none',
  system: '8,3',
  'cross-functional': '4,2,1,2',
};

const HANDOFF_LABELS: Record<HandoffType, string> = {
  human: 'Human',
  email: 'Email',
  crm: 'CRM',
  physical: 'Physical',
  system: 'System',
  'cross-functional': 'Cross-Functional',
};

interface PathInfo {
  id: string;
  d: string;
  color: string;
  dash: string;
  midX: number;
  midY: number;
  handoffType: HandoffType;
}

function getTaskCenter(taskId: string, canvas: HTMLElement): { x: number; y: number } | null {
  const el = canvas.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`);
  if (!el) return null;
  const elRect = el.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  return {
    x: elRect.left - canvasRect.left + canvas.scrollLeft + elRect.width / 2,
    y: elRect.top - canvasRect.top + canvas.scrollTop + elRect.height / 2,
  };
}

function makePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
    const cpX = Math.abs(dx) * 0.45;
    return `M ${from.x} ${from.y} C ${from.x + cpX} ${from.y}, ${to.x - cpX} ${to.y}, ${to.x} ${to.y}`;
  } else {
    const cpY = Math.abs(dy) * 0.45;
    return `M ${from.x} ${from.y} C ${from.x} ${from.y + cpY}, ${to.x} ${to.y - cpY}, ${to.x} ${to.y}`;
  }
}

export function ConnectionsOverlay({ canvasRef, connections, tasks, onDeleteConnection, onUpdateConnection }: Props) {
  const [paths, setPaths] = useState<PathInfo[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 2000, h: 2000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const compute = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSvgSize({
      w: Math.max(canvas.scrollWidth, canvas.clientWidth),
      h: Math.max(canvas.scrollHeight, canvas.clientHeight),
    });

    const result: PathInfo[] = [];
    for (const conn of connections) {
      const from = getTaskCenter(conn.fromTaskId, canvas);
      const to = getTaskCenter(conn.toTaskId, canvas);
      if (!from || !to) continue;

      result.push({
        id: conn.id,
        d: makePath(from, to),
        color: HANDOFF_COLORS[conn.handoffType],
        dash: HANDOFF_DASH[conn.handoffType],
        midX: (from.x + to.x) / 2,
        midY: (from.y + to.y) / 2,
        handoffType: conn.handoffType,
      });
    }
    setPaths(result);
  }, [canvasRef, connections]);

  const scheduleCompute = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(compute);
  }, [compute]);

  useEffect(() => {
    scheduleCompute();
  }, [scheduleCompute, tasks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('scroll', scheduleCompute);
    window.addEventListener('resize', scheduleCompute);
    return () => {
      canvas.removeEventListener('scroll', scheduleCompute);
      window.removeEventListener('resize', scheduleCompute);
    };
  }, [canvasRef, scheduleCompute]);

  const ALL_TYPES: HandoffType[] = ['human', 'email', 'crm', 'physical', 'system', 'cross-functional'];

  return (
    <>
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10, width: svgSize.w, height: svgSize.h }}
      >
        <defs>
          {Object.entries(HANDOFF_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arr-${type}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          ))}
        </defs>

        {paths.map(p => (
          <g key={p.id}>
            {/* wide invisible hit area */}
            <path
              d={p.d}
              stroke="transparent"
              strokeWidth={14}
              fill="none"
              className="pointer-events-auto cursor-pointer"
              onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
            />
            {/* visible line */}
            <path
              d={p.d}
              stroke={selectedId === p.id ? '#6366F1' : p.color}
              strokeWidth={selectedId === p.id ? 2.5 : 1.5}
              strokeDasharray={p.dash === 'none' ? undefined : p.dash}
              fill="none"
              markerEnd={`url(#arr-${p.handoffType})`}
              className="pointer-events-none"
            />
          </g>
        ))}
      </svg>

      {/* Popup for selected connection */}
      {selectedId && (() => {
        const p = paths.find(x => x.id === selectedId);
        const conn = connections.find(c => c.id === selectedId);
        if (!p || !conn) return null;
        return (
          <div
            className="absolute z-30 bg-white border border-gray-200 rounded-xl shadow-2xl p-3"
            style={{ left: p.midX, top: p.midY, transform: 'translate(-50%, -50%)', minWidth: 200 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Handoff type</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {ALL_TYPES.map(ht => (
                <button
                  key={ht}
                  onClick={() => onUpdateConnection(selectedId, ht)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
                  style={
                    conn.handoffType === ht
                      ? { background: HANDOFF_COLORS[ht], color: '#fff', borderColor: HANDOFF_COLORS[ht] }
                      : { color: HANDOFF_COLORS[ht], borderColor: HANDOFF_COLORS[ht] + '66' }
                  }
                >
                  {HANDOFF_LABELS[ht]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => { onDeleteConnection(selectedId); setSelectedId(null); }}
                className="flex-1 px-2 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedId(null)}
                className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
