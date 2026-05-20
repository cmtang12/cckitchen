export type HandoffType = 'human' | 'email' | 'crm' | 'physical' | 'system' | 'cross-functional';
export type TaskTag = 'pain-point' | 'delight' | 'moment-that-matters';
export type SectionType = 'service-journey' | 'customer' | 'frontstage' | 'backstage' | 'tech-stack';

export interface Persona {
  id: string;
  name: string;
  jobs: string[];
}

export interface Phase {
  id: string;
  name: string;
  duration: string;
}

export interface Task {
  id: string;
  laneId: string;
  phaseId: string;
  content: string;
  tags: TaskTag[];
}

export interface Connection {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  handoffType: HandoffType;
}

export interface Lane {
  id: string;
  sectionId: string;
  name: string;
}

export interface Section {
  id: string;
  type: SectionType;
  label: string;
  sectionHeader?: string;
  bg: string;
  accent: string;
  laneIds: string[];
}

export interface BlueprintData {
  projectName: string;
  projectSubtitle: string;
  scenario: string;
  personas: Persona[];
  phases: Phase[];
  sections: Section[];
  lanes: Lane[];
  tasks: Task[];
  connections: Connection[];
}
