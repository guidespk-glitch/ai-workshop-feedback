import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ParticipantPage } from '../features/participant/ParticipantPage';
import { PresenterPage } from '../features/presenter/PresenterPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ParticipantPage />,
  },
  {
    path: '/presenter',
    element: <PresenterPage />,
  },
]);
export default router;
