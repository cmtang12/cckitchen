import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* Messages: on phones they sit just above the bottom tabs, so they never cover
          the tabs or the Back / action buttons at the top of a page. */}
      <Toaster position="bottom-center" mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 92px)" }} />
    </>
  );
}

export default App;
