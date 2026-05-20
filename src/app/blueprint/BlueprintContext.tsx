import React, { createContext, useContext, useReducer } from 'react';
import { BlueprintData, Connection, HandoffType, Lane, Persona, Phase, Task, TaskTag } from './types';
import { initialData } from './data';

type Action =
  | { type: 'UPDATE_PROJECT'; payload: Partial<Pick<BlueprintData, 'projectName' | 'projectSubtitle' | 'scenario'>> }
  | { type: 'ADD_TASK'; payload: { laneId: string; phaseId: string; content: string } }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_TAG'; payload: { taskId: string; tag: TaskTag } }
  | { type: 'REMOVE_TAG'; payload: { taskId: string; tag: TaskTag } }
  | { type: 'ADD_CONNECTION'; payload: { fromTaskId: string; toTaskId: string; handoffType: HandoffType } }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; handoffType: HandoffType } }
  | { type: 'DELETE_CONNECTION'; payload: string }
  | { type: 'ADD_PHASE'; payload: { name: string; duration: string } }
  | { type: 'DELETE_PHASE'; payload: string }
  | { type: 'ADD_LANE'; payload: { sectionId: string; name: string } }
  | { type: 'DELETE_LANE'; payload: string }
  | { type: 'ADD_PERSONA'; payload: { name: string; jobs: string[] } }
  | { type: 'UPDATE_PERSONA'; payload: { id: string; updates: Partial<Persona> } }
  | { type: 'DELETE_PERSONA'; payload: string };

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function reducer(state: BlueprintData, action: Action): BlueprintData {
  switch (action.type) {
    case 'UPDATE_PROJECT':
      return { ...state, ...action.payload };

    case 'ADD_TASK': {
      const task: Task = {
        id: uid(),
        laneId: action.payload.laneId,
        phaseId: action.payload.phaseId,
        content: action.payload.content,
        tags: [],
      };
      return { ...state, tasks: [...state.tasks, task] };
    }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id ? { ...t, ...action.payload.updates } : t
        ),
      };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload),
        connections: state.connections.filter(
          c => c.fromTaskId !== action.payload && c.toTaskId !== action.payload
        ),
      };

    case 'ADD_TAG': {
      const { taskId, tag } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === taskId && !t.tags.includes(tag) ? { ...t, tags: [...t.tags, tag] } : t
        ),
      };
    }

    case 'REMOVE_TAG': {
      const { taskId, tag } = action.payload;
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, tags: t.tags.filter(g => g !== tag) } : t
        ),
      };
    }

    case 'ADD_CONNECTION': {
      const { fromTaskId, toTaskId, handoffType } = action.payload;
      const exists = state.connections.some(
        c => c.fromTaskId === fromTaskId && c.toTaskId === toTaskId
      );
      if (exists) return state;
      const conn: Connection = { id: uid(), fromTaskId, toTaskId, handoffType };
      return { ...state, connections: [...state.connections, conn] };
    }

    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map(c =>
          c.id === action.payload.id ? { ...c, handoffType: action.payload.handoffType } : c
        ),
      };

    case 'DELETE_CONNECTION':
      return {
        ...state,
        connections: state.connections.filter(c => c.id !== action.payload),
      };

    case 'ADD_PHASE': {
      const phase: Phase = { id: uid(), name: action.payload.name, duration: action.payload.duration };
      return { ...state, phases: [...state.phases, phase] };
    }

    case 'DELETE_PHASE': {
      const id = action.payload;
      return {
        ...state,
        phases: state.phases.filter(p => p.id !== id),
        tasks: state.tasks.filter(t => t.phaseId !== id),
      };
    }

    case 'ADD_LANE': {
      const lane: Lane = { id: uid(), sectionId: action.payload.sectionId, name: action.payload.name };
      return {
        ...state,
        lanes: [...state.lanes, lane],
        sections: state.sections.map(s =>
          s.id === action.payload.sectionId ? { ...s, laneIds: [...s.laneIds, lane.id] } : s
        ),
      };
    }

    case 'DELETE_LANE': {
      const id = action.payload;
      const lane = state.lanes.find(l => l.id === id);
      return {
        ...state,
        lanes: state.lanes.filter(l => l.id !== id),
        tasks: state.tasks.filter(t => t.laneId !== id),
        sections: state.sections.map(s =>
          s.id === lane?.sectionId ? { ...s, laneIds: s.laneIds.filter(lid => lid !== id) } : s
        ),
      };
    }

    case 'ADD_PERSONA': {
      const persona: Persona = { id: uid(), name: action.payload.name, jobs: action.payload.jobs };
      return { ...state, personas: [...state.personas, persona] };
    }

    case 'UPDATE_PERSONA':
      return {
        ...state,
        personas: state.personas.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };

    case 'DELETE_PERSONA':
      return { ...state, personas: state.personas.filter(p => p.id !== action.payload) };

    default:
      return state;
  }
}

interface ContextValue {
  data: BlueprintData;
  dispatch: React.Dispatch<Action>;
}

const BlueprintContext = createContext<ContextValue | null>(null);

export function BlueprintProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, initialData);
  return (
    <BlueprintContext.Provider value={{ data, dispatch }}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function useBlueprint() {
  const ctx = useContext(BlueprintContext);
  if (!ctx) throw new Error('useBlueprint must be used within BlueprintProvider');
  return ctx;
}
