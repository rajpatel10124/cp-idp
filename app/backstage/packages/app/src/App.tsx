import React, { useState } from 'react';
import { Route } from 'react-router-dom';
import { FlatRoutes } from '@backstage/core-app-api';
import { AlertDisplay, OAuthRequestDialog } from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';

import { ForgeOpsLayout } from './components/ForgeOpsLayout';
import { DashboardOverview } from './components/DashboardOverview';
import { ServicesView } from './components/ServicesView';
import { ProjectsView } from './components/ProjectsView';
import { EnvironmentsView } from './components/EnvironmentsView';
import { DeploymentsView } from './components/DeploymentsView';
import { GoldenPathsView } from './components/GoldenPathsView';
import { CatalogView } from './components/CatalogView';
import { InfrastructureView } from './components/InfrastructureView';
import { ObservabilityUnifiedView } from './components/ObservabilityUnifiedView';
import { LogsView } from './components/LogsView';
import { DocumentationView } from './components/DocumentationView';
import { ActivityView } from './components/ActivityView';
import { RbacView } from './components/RbacView';
import { PoliciesView } from './components/PoliciesView';
import { SettingsView } from './components/SettingsView';
import { EvaluationView } from './components/EvaluationView';
import { DoraMetricsView } from './components/DoraMetricsView';

const ForgeOpsConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview onNavigate={setActiveTab} />;
      case 'services':
        return <ServicesView onNavigate={setActiveTab} />;
      case 'projects':
        return <ProjectsView />;
      case 'environments':
        return <EnvironmentsView />;
      case 'deployments':
        return <DeploymentsView />;
      case 'templates':
        return <GoldenPathsView />;
      case 'catalog':
        return <CatalogView onNavigate={setActiveTab} />;
      case 'infrastructure':
        return <InfrastructureView />;
      case 'observability':
        return <ObservabilityUnifiedView />;
      case 'logs':
        return <LogsView />;
      case 'documentation':
        return <DocumentationView />;
      case 'activity':
        return <ActivityView />;
      case 'rbac':
        return <RbacView />;
      case 'policies':
        return <PoliciesView />;
      case 'evaluation':
        return <EvaluationView />;
      case 'dora':
        return <DoraMetricsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardOverview onNavigate={setActiveTab} />;
    }
  };

  return (
    <ForgeOpsLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderContent()}
    </ForgeOpsLayout>
  );
};

const app = createApp({
  components: {
    SignInPage: props => <ForgeOpsConsole />,
  },
});

const AppProvider = app.getProvider();
const AppRouter = app.getRouter();

export const App = () => (
  <AppProvider>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <FlatRoutes>
        <Route path="/" element={<ForgeOpsConsole />} />
        <Route path="/*" element={<ForgeOpsConsole />} />
      </FlatRoutes>
    </AppRouter>
  </AppProvider>
);

export default App;
