import { createHashRouter } from 'react-router-dom';
import { RootLayout, rootLoader } from './RootLayout';
import { ErrorScreen } from '@/components/ErrorScreen';
import ProfileSelection from '@/features/profile-selection/ProfileSelection';
import LaviToday from '@/features/missions/LaviToday';
import NivToday from '@/features/missions/NivToday';
import SiblingsToday from '@/features/sibling-mode/SiblingsToday';
import PracticeScreen from '@/features/missions/PracticeScreen';
import CompleteScreen from '@/features/missions/CompleteScreen';
import ParentUnlock from '@/features/parent/ParentUnlock';
import ParentDashboard from '@/features/parent/ParentDashboard';
import BaselineScreen from '@/features/baseline/BaselineScreen';
import ModelAudioManager from '@/features/parent/ModelAudioManager';
import ContentEditor from '@/features/parent/ContentEditor';
import ClinicianPlaceholder from '@/features/parent/ClinicianPlaceholder';
import ExportScreen from '@/features/parent/ExportScreen';
import { ParentGate } from '@/features/parent/ParentGate';

export const router = createHashRouter([
  {
    element: <RootLayout />,
    loader: rootLoader,
    errorElement: <ErrorScreen />,
    children: [
      { path: '/', element: <ProfileSelection /> },
      { path: '/lavi/today', element: <LaviToday /> },
      { path: '/niv/today', element: <NivToday /> },
      { path: '/siblings/today', element: <SiblingsToday /> },
      { path: '/practice/:childId/:missionId', element: <PracticeScreen /> },
      { path: '/complete/:childId/:sessionId', element: <CompleteScreen /> },
      { path: '/parent/unlock', element: <ParentUnlock /> },
      {
        element: <ParentGate />,
        children: [
          { path: '/parent', element: <ParentDashboard /> },
          { path: '/parent/baseline/:childId', element: <BaselineScreen /> },
          { path: '/parent/model-audio', element: <ModelAudioManager /> },
          { path: '/parent/content', element: <ContentEditor /> },
          { path: '/parent/clinician', element: <ClinicianPlaceholder /> },
          { path: '/parent/export', element: <ExportScreen /> },
        ],
      },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
