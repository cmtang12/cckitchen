import React, { useState } from 'react';
import { Task, TaskTag } from './types';
import { AlertTriangle, Star, Target, X, Trash2 } from 'lucide-react';

interface Props {
  task: Task;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onAddTag: (tag: TaskTag) => void;
  onRemoveTag: (tag: TaskTag) => void;
}

const TAGS: { value: TaskTag; label: string; icon: React.ReactNode; activeClass: string }[] = [
  {
    value: 'pain-point',
    label: 'Risk / Gap',
    icon: <AlertTriangle size={13} />,
    activeClass: 'bg-amber-500 text-white border-amber-500',
  },
  {
    value: 'delight',
    label: 'Delight',
    icon: <Star size={13} />,
    activeClass: 'bg-emerald-500 text-white border-emerald-500',
  },
  {
    value: 'moment-that-matters',
    label: 'Moment That Matters',
    icon: <Target size={13} />,
    activeClass: 'bg-orange-500 text-white border-orange-500',
  },
];

export function TaskModal({ task, onClose, onSave, onDelete, onAddTag, onRemoveTag }: Props) {
  const [content, setContent] = useState(task.content);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-5 w-[380px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-900">Edit Task</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
          rows={3}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Task description…"
        />

        <div className="mb-5">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Tags</div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(t => {
              const active = task.tags.includes(t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => (active ? onRemoveTag(t.value) : onAddTag(t.value))}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all',
                    active ? t.activeClass : 'border-gray-200 text-gray-600 hover:border-gray-400',
                  ].join(' ')}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 size={13} />
            Delete task
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave({ content })}
              className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
