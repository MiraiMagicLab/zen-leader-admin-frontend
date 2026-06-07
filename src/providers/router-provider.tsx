import { RouterProvider } from 'react-router-dom';

import { appRouter } from '@/routes';

export function AppRouterProvider() {
  return <RouterProvider router={appRouter} />;
}
