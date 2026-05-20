import React, { useState } from 'react';
import { BlueprintProvider } from './BlueprintContext';
import { Sidebar } from './Sidebar';
import { Legend } from './Legend';
import { BlueprintCanvas } from './BlueprintCanvas';
import { HandoffType } from './types';

export type UIMode = 'select' | 'connect';

export interface UIState {
  mode: UIMode;
  connectFrom: string | null;
  selectedHandoff: HandoffType;
}

export default function BlueprintApp() {
  const [ui, setUI] = useState<UIState>({
    mode: 'select',
    connectFrom: null,
    selectedHandoff: 'human',
  });

  return (
    <BlueprintProvider>
      <div className="flex h-screen overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Legend ui={ui} setUI={setUI} />
          <BlueprintCanvas ui={ui} setUI={setUI} />
        </div>
      </div>
    </BlueprintProvider>
  );
}
