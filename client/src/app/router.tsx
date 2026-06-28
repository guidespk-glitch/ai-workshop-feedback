import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ParticipantPage } from '../features/participant/ParticipantPage';
import { PresenterPage } from '../features/presenter/PresenterPage';
import { ReportPage } from '../features/report/ReportPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ParticipantPage />,
  },
  {
    path: '/presenter',
    element: <PresenterPage />,
  },
  {
    path: '/report',
    element: <ReportPage />,
  },
]);
export default router;
