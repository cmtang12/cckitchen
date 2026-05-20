import React, { useRef, useState } from 'react';
import { useBlueprint } from './BlueprintContext';
import { UIState } from './BlueprintApp';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { ConnectionsOverlay } from './ConnectionsOverlay';
import { Task, TaskTag } from './types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  ui: UIState;
  setUI: React.Dispatch<React.SetStateAction<UIState>>;
}

const LANE_LABEL_W = 190;
const SECTION_LABEL_W = 34;
const CELL_MIN_W = 210;

export function BlueprintCanvas({ ui, setUI }: Props) {
  const { data, dispatch } = useBlueprint();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingAt, setAddingAt] = useState<{ laneId: string; phaseId: string } | null>(null);

  function handleTaskClick(taskId: string) {
    if (ui.mode === 'connect') {
      if (!ui.connectFrom) {
        setUI(u => ({ ...u, connectFrom: taskId }));
      } else if (ui.connectFrom !== taskId) {
        dispatch({
          type: 'ADD_CONNECTION',
          payload: { fromTaskId: ui.connectFrom, toTaskId: taskId, handoffType: ui.selectedHandoff },
        });
        setUI(u => ({ ...u, connectFrom: null }));
      }
    } else {
      const task = data.tasks.find(t => t.id === taskId);
      if (task) setEditingTask(task);
    }
  }

  function handleCellClick(laneId: string, phaseId: string) {
    if (ui.mode === 'select') setAddingAt({ laneId, phaseId });
  }

  function handleAddPhase() {
    const name = prompt('Phase name:');
    if (!name?.trim()) return;
    const duration = prompt('Duration (e.g. "2 Weeks"):') ?? '1 Week';
    dispatch({ type: 'ADD_PHASE', payload: { name: name.trim().toUpperCase(), duration } });
  }

  function handleAddLane(sectionId: string) {
    const name = prompt('Lane name:');
    if (name?.trim()) dispatch({ type: 'ADD_LANE', payload: { sectionId, name: name.trim() } });
  }

  return (
    <div className="flex-1 overflow-auto relative bg-white" ref={canvasRef}>

      {/* Phase headers — sticky top */}
      <div className="flex sticky top-0 z-20 shadow-sm">
        <div style={{ width: SECTION_LABEL_W, flexShrink: 0 }} className="bg-white border-b border-gray-300" />
        <div style={{ width: LANE_LABEL_W, flexShrink: 0 }} className="bg-white border-b border-r border-gray-300" />

        {data.phases.map(phase => (
          <div
            key={phase.id}
            className="flex-1 flex flex-col items-center bg-gray-900 text-white border-r border-gray-700 group"
            style={{ minWidth: CELL_MIN_W }}
          >
            <div className="font-bold tracking-widest py-1.5 px-2 text-sm">{phase.name}</div>
            <div className="flex items-center gap-1 text-gray-400 pb-1.5" style={{ fontSize: 10 }}>
              <span>←</span>
              <span>{phase.duration}</span>
              <span>→</span>
              <button
                onClick={() => dispatch({ type: 'DELETE_PHASE', payload: phase.id })}
                className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={handleAddPhase}
          className="flex-shrink-0 w-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-l border-gray-700 transition-colors"
          title="Add phase"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Sections */}
      {data.sections.map((section, sIdx) => {
        const lanes = section.laneIds
          .map(id => data.lanes.find(l => l.id === id))
          .filter((l): l is NonNullable<typeof l> => !!l);

        return (
          <div key={section.id}>
            {/* Section sub-header (e.g. "WHAT THE CUSTOMER SEES") */}
            {section.sectionHeader && (
              <div
                className="flex items-center border-b border-gray-200"
                style={{ background: '#F0F0F0' }}
              >
                <div style={{ width: SECTION_LABEL_W + LANE_LABEL_W, flexShrink: 0 }} />
                <div className="flex-1 py-1 px-3 text-gray-500 font-semibold tracking-widest" style={{ fontSize: 9 }}>
                  {section.sectionHeader}
                </div>
              </div>
            )}

            <div
              className={`flex border-b-2 border-gray-300 ${sIdx > 0 ? '' : ''}`}
              style={{ background: section.bg }}
            >
              {/* Section label */}
              <div
                style={{ width: SECTION_LABEL_W, flexShrink: 0, background: section.accent }}
                className="flex items-center justify-center border-r border-gray-300"
              >
                <span
                  className="text-[9px] font-black tracking-widest text-gray-600 whitespace-pre-line text-center leading-tight"
                  style={{ writingMode: 'vertical-lr' as React.CSSProperties['writingMode'], transform: 'rotate(180deg)' }}
                >
                  {section.label}
                </span>
              </div>

              {/* Lanes */}
              <div className="flex-1 flex flex-col">
                {lanes.map((lane, lIdx) => (
                  <div
                    key={lane.id}
                    className={`flex ${lIdx < lanes.length - 1 ? 'border-b border-gray-200' : ''}`}
                    style={{ minHeight: 80 }}
                  >
                    {/* Lane label */}
                    <div
                      style={{ width: LANE_LABEL_W, flexShrink: 0, background: section.accent }}
                      className="flex items-center px-3 py-2 border-r border-gray-300 group"
                    >
                      <span className="text-xs font-semibold text-gray-700 flex-1 leading-tight">{lane.name}</span>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_LANE', payload: lane.id })}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity flex-shrink-0 ml-1"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Phase cells */}
                    {data.phases.map(phase => {
                      const cellTasks = data.tasks.filter(
                        t => t.laneId === lane.id && t.phaseId === phase.id
                      );
                      return (
                        <div
                          key={phase.id}
                          className="flex-1 p-2 flex flex-wrap gap-1.5 content-start border-r border-gray-200 cursor-pointer transition-colors hover:bg-black/[0.03]"
                          style={{ minWidth: CELL_MIN_W }}
                          onClick={() => handleCellClick(lane.id, phase.id)}
                        >
                          {cellTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              isConnectFrom={ui.connectFrom === task.id}
                              isConnectMode={ui.mode === 'connect'}
                              onClick={e => { e.stopPropagation(); handleTaskClick(task.id); }}
                            />
                          ))}
                          {cellTasks.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                              <Plus size={14} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Spacer for add-phase column */}
                    <div className="flex-shrink-0 w-9" />
                  </div>
                ))}

                {/* Add lane */}
                <button
                  onClick={() => handleAddLane(section.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors border-t border-gray-200"
                  style={{ fontSize: 11 }}
                >
                  <Plus size={12} /> Add lane
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* SVG connections overlay */}
      <ConnectionsOverlay
        canvasRef={canvasRef}
        connections={data.connections}
        tasks={data.tasks}
        onDeleteConnection={id => dispatch({ type: 'DELETE_CONNECTION', payload: id })}
        onUpdateConnection={(id, ht) => dispatch({ type: 'UPDATE_CONNECTION', payload: { id, handoffType: ht } })}
      />

      {/* Task edit modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updates => {
            dispatch({ type: 'UPDATE_TASK', payload: { id: editingTask.id, updates } });
            setEditingTask(null);
          }}
          onDelete={() => { dispatch({ type: 'DELETE_TASK', payload: editingTask.id }); setEditingTask(null); }}
          onAddTag={tag => dispatch({ type: 'ADD_TAG', payload: { taskId: editingTask.id, tag } })}
          onRemoveTag={tag => dispatch({ type: 'REMOVE_TAG', payload: { taskId: editingTask.id, tag } })}
        />
      )}

      {/* Quick-add task modal */}
      {addingAt && (
        <QuickAdd
          onAdd={content => { dispatch({ type: 'ADD_TASK', payload: { ...addingAt, content } }); setAddingAt(null); }}
          onClose={() => setAddingAt(null)}
        />
      )}
    </div>
  );
}

function QuickAdd({ onAdd, onClose }: { onAdd: (c: string) => void; onClose: () => void }) {
  const [val, setVal] = useState('');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div className="bg-white rounded-xl shadow-2xl p-5 w-72" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-gray-900 mb-3">Add task</div>
        <input
          autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="Task description…"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && val.trim()) onAdd(val.trim());
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800">Cancel</button>
          <button
            onClick={() => val.trim() && onAdd(val.trim())}
            className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
