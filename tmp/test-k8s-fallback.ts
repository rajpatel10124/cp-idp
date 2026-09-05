import { executeAdvancedDeployment, DeploymentRecord, deleteDeploymentRecord } from '../app/backstage/packages/backend/src/services/deploymentEngine';

async function testK8sFallback() {
  console.log('================================================================');
  console.log('TESTING KUBERNETES PRE-FLIGHT DIAGNOSTICS & AUTONOMOUS FALLBACK');
  console.log('================================================================\n');

  const testId = `dep-k8s-${Date.now().toString().slice(-4)}`;
  const deployment: DeploymentRecord = {
    id: testId,
    serviceName: 'mern-ecommerce',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'production',
    target: 'local-k8s',
    owner: 'team-backend',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(deployment);

  console.log('\n--- EXECUTION SUMMARY ---');
  console.log('Final Status:', deployment.status);
  console.log('Effective Target:', deployment.target);
  console.log('Active Endpoint:', deployment.endpoint);
  console.log('Logs Snippet:\n' + deployment.logs.slice(0, 6).join('\n'));

  if (deployment.status !== 'SUCCESS') {
    console.error('FAILED: Deployment did not handle unreachable K8s API server gracefully.');
    process.exit(1);
  }

  await deleteDeploymentRecord(testId);

  console.log('\n================================================================');
  console.log('AUTONOMOUS TARGET FALLBACK TEST PASSED PERFECTLY! ✓');
  console.log('================================================================\n');
}

testK8sFallback().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
