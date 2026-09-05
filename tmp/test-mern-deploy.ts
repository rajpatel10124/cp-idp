import { executeAdvancedDeployment, DeploymentRecord } from '../app/backstage/packages/backend/src/services/deploymentEngine';

async function runMernTest() {
  console.log('=== STARTING REAL MERN E-COMMERCE DEPLOYMENT TEST ===');

  const testDep: DeploymentRecord = {
    id: `dep-mern-${Date.now().toString().slice(-4)}`,
    serviceName: 'mern-ecommerce',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'production',
    target: 'local-docker',
    owner: 'team-ecom',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(testDep);

  console.log('\n======================================================');
  console.log('FINAL DEPLOYMENT STATUS:', testDep.status);
  console.log('ENDPOINT:', testDep.endpoint || 'N/A');
  console.log('ERROR:', testDep.error || 'None');
  console.log('LOGS:\n' + testDep.logs.join('\n'));
  console.log('======================================================\n');
}

runMernTest();
