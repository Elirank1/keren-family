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
import TonightPrep from '@/features/parent/tonight/TonightPrep';
import TonightModelAudio from '@/features/parent/tonight/TonightModelAudio';
import TonightBaseline from '@/features/parent/tonight/TonightBaseline';
import Diagnostics from '@/features/parent/Diagnostics';
import RecordingsReview from '@/features/parent/RecordingsReview';
import ContentEditor from '@/features/parent/ContentEditor';
import ClinicianArea from '@/features/parent/clinician/ClinicianArea';
import ClinicianReport from '@/features/parent/clinician/ClinicianReport';
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
          { path: '/parent/tonight', element: <TonightPrep /> },
          { path: '/parent/tonight/model', element: <TonightModelAudio /> },
          { path: '/parent/tonight/baseline', element: <TonightBaseline /> },
          { path: '/parent/diagnostics', element: <Diagnostics /> },
          { path: '/parent/recordings', element: <RecordingsReview /> },
          { path: '/parent/baseline/:childId', element: <BaselineScreen /> },
          { path: '/parent/model-audio', element: <ModelAudioManager /> },
          { path: '/parent/content', element: <ContentEditor /> },
          { path: '/parent/clinician', element: <ClinicianArea /> },
          { path: '/parent/clinician/report/:childId', element: <ClinicianReport /> },
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
