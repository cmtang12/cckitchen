import React, { useState } from 'react';
import { useBlueprint } from './BlueprintContext';
import { Plus, X, User, ChevronDown } from 'lucide-react';

export function Sidebar() {
  const { data, dispatch } = useBlueprint();
  const [addingPersona, setAddingPersona] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [editingScenario, setEditingScenario] = useState(false);
  const [scenarioDraft, setScenarioDraft] = useState(data.scenario);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [editingJobPersonaId, setEditingJobPersonaId] = useState<string | null>(null);
  const [newJob, setNewJob] = useState('');

  return (
    <div
      className="flex-shrink-0 bg-[#0F0F0F] text-white flex flex-col overflow-y-auto"
      style={{ width: 200, borderRight: '3px solid #FF6B35' }}
    >
      <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-800" />

      {/* Project info */}
      <div className="p-4 border-b border-gray-800">
        <div className="text-orange-400 text-xs font-bold tracking-wider mb-1">{data.projectSubtitle}</div>
        <div className="text-white font-black leading-tight whitespace-pre-line" style={{ fontSize: 18 }}>
          {data.projectName}
        </div>
      </div>

      {/* Scenario */}
      <div className="p-4 border-b border-gray-800">
        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Scenario</div>
        {editingScenario ? (
          <textarea
            autoFocus
            className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 resize-none"
            rows={3}
            value={scenarioDraft}
            onChange={e => setScenarioDraft(e.target.value)}
            onBlur={() => {
              dispatch({ type: 'UPDATE_PROJECT', payload: { scenario: scenarioDraft } });
              setEditingScenario(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') setEditingScenario(false);
            }}
          />
        ) : (
          <div
            className="text-gray-300 text-xs cursor-pointer hover:text-white"
            onClick={() => { setScenarioDraft(data.scenario); setEditingScenario(true); }}
          >
            {data.scenario || <span className="text-gray-600 italic">Click to edit…</span>}
          </div>
        )}
      </div>

      {/* Personas */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-500 text-[10px] uppercase tracking-widest">Personas &amp; Jobs</div>
          <button
            onClick={() => setAddingPersona(true)}
            className="text-gray-600 hover:text-orange-400 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {addingPersona && (
          <div className="mb-3 bg-gray-900 rounded-lg p-2">
            <input
              autoFocus
              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1 mb-1"
              placeholder="Persona name…"
              value={newPersonaName}
              onChange={e => setNewPersonaName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newPersonaName.trim()) {
                  dispatch({ type: 'ADD_PERSONA', payload: { name: newPersonaName.trim(), jobs: [] } });
                  setNewPersonaName('');
                  setAddingPersona(false);
                }
                if (e.key === 'Escape') setAddingPersona(false);
              }}
            />
            <div className="text-gray-600 text-[10px]">Enter to add · Esc to cancel</div>
          </div>
        )}

        {data.personas.map(persona => (
          <div key={persona.id} className="mb-3">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setExpandedPersona(expandedPersona === persona.id ? null : persona.id)}
            >
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User size={13} className="text-gray-400" />
              </div>
              <span className="text-gray-300 text-xs font-medium flex-1">{persona.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_PERSONA', payload: persona.id }); }}
                  className="text-gray-600 hover:text-red-400"
                >
                  <X size={11} />
                </button>
                <ChevronDown
                  size={11}
                  className={`text-gray-600 transition-transform ${expandedPersona === persona.id ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            {expandedPersona === persona.id && (
              <div className="ml-9 mt-1">
                {persona.jobs.map((job, i) => (
                  <div key={i} className="text-gray-500 text-[10px] leading-relaxed">• {job}</div>
                ))}
                {editingJobPersonaId === persona.id ? (
                  <input
                    autoFocus
                    className="w-full bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 mt-1"
                    placeholder="Job to be done…"
                    value={newJob}
                    onChange={e => setNewJob(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newJob.trim()) {
                        dispatch({
                          type: 'UPDATE_PERSONA',
                          payload: { id: persona.id, updates: { jobs: [...persona.jobs, newJob.trim()] } },
                        });
                        setNewJob('');
                        setEditingJobPersonaId(null);
                      }
                      if (e.key === 'Escape') setEditingJobPersonaId(null);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingJobPersonaId(persona.id)}
                    className="text-gray-600 hover:text-gray-400 text-[10px] mt-0.5 flex items-center gap-0.5"
                  >
                    <Plus size={10} /> add job
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
