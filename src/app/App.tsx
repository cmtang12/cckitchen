import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* Messages appear at the top so they never cover the bottom tabs or action bars */}
      <Toaster position="top-center" mobileOffset={{ top: "calc(env(safe-area-inset-top) + 56px)" }} />
    </>
  );
}

export default App;
