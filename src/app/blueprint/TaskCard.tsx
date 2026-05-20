import React from 'react';
import { Task } from './types';
import { AlertTriangle, Star, Target } from 'lucide-react';

interface Props {
  task: Task;
  isConnectFrom: boolean;
  isConnectMode: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  'pain-point': <AlertTriangle size={10} className="text-amber-500" />,
  delight: <Star size={10} className="text-emerald-500" />,
  'moment-that-matters': <Target size={10} className="text-orange-500" />,
};

const TAG_BORDER: Record<string, string> = {
  'pain-point': 'border-l-amber-500',
  delight: 'border-l-emerald-500',
  'moment-that-matters': 'border-l-orange-500',
};

export function TaskCard({ task, isConnectFrom, isConnectMode, onClick }: Props) {
  const primaryTag = task.tags[0];

  return (
    <div
      data-task-id={task.id}
      onClick={onClick}
      className={[
        'relative px-2 py-1.5 rounded text-[10px] cursor-pointer select-none',
        'border transition-all duration-150',
        'min-w-[72px] max-w-[160px]',
        isConnectFrom
          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300 shadow-md'
          : isConnectMode
          ? 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
          : 'border-gray-300 bg-white hover:border-gray-500 hover:shadow-sm',
        primaryTag ? `border-l-2 ${TAG_BORDER[primaryTag]}` : '',
      ].join(' ')}
    >
      {task.tags.length > 0 && (
        <div className="flex gap-0.5 mb-0.5 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag}>{TAG_ICONS[tag]}</span>
          ))}
        </div>
      )}
      <div className="text-gray-700 leading-snug font-medium">{task.content}</div>
    </div>
  );
}
