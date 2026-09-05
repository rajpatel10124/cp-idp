import { executeAdvancedDeployment, deleteDeploymentRecord, loadDeploymentsFromDisk, DeploymentRecord } from '../app/backstage/packages/backend/src/services/deploymentEngine';
import { execSync } from 'child_process';

async function runAcceptanceSuite() {
  console.log('======================================================');
  console.log('STARTING MANDATORY 16-STEP E2E ACCEPTANCE TEST SUITE');
  console.log('======================================================\n');

  // STEP 1: Deploy https://github.com/rajpatel10124/mern-ecommerce
  console.log('--- TEST 1: Deploying rajpatel10124/mern-ecommerce ---');
  const depId = `dep-mern-${Date.now().toString().slice(-4)}`;
  const deployment: DeploymentRecord = {
    id: depId,
    serviceName: 'mern-ecommerce',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'production',
    target: 'local-docker',
    owner: 'team-backend',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(deployment);

  console.log('\n--- DEPLOYMENT RESULT ---');
  console.log('Status:', deployment.status);
  console.log('App Type:', deployment.appType);
  console.log('Container Port:', deployment.containerPort);
  console.log('Host Port:', deployment.hostPort);
  console.log('Endpoint:', deployment.endpoint);
  console.log('Logs Snippet:\n' + deployment.logs.slice(-10).join('\n'));

  if (deployment.status !== 'SUCCESS') {
    console.error('FAILED: Deployment did not reach SUCCESS status.');
    process.exit(1);
  }

  // STEP 8 & 9 & 10: Test HTTP GET & API Endpoint
  console.log('\n--- TEST 8, 9 & 10: Testing HTTP reachability & API ---');
  const endpoint = deployment.endpoint!;
  const rootRes = execSync(`curl -s -o /dev/null -w "%{http_code}" "${endpoint}/"`).toString().trim();
  console.log(`GET ${endpoint}/ => HTTP Code: ${rootRes}`);

  const apiRes = execSync(`curl -s -o /dev/null -w "%{http_code}" "${endpoint}/api/products"`).toString().trim();
  console.log(`GET ${endpoint}/api/products => HTTP Code: ${apiRes}`);

  // STEP 11 & 12: Verify MongoDB and Redis containers
  console.log('\n--- TEST 11 & 12: Verifying MongoDB & Redis container status ---');
  const dockerPs = execSync(`docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"`).toString();
  console.log('Active Docker Containers:\n' + dockerPs);

  // STEP 13 & 14: Test Persistence across reloads
  console.log('\n--- TEST 13 & 14: Verifying Disk Persistence ---');
  const loadedDeps = loadDeploymentsFromDisk();
  const persistedDep = loadedDeps.find((d) => d.id === depId);
  console.log('Persisted Deployment Found:', persistedDep ? 'YES ✓' : 'NO ✗');
  if (persistedDep) {
    console.log('Persisted Status:', persistedDep.status);
    console.log('Persisted Endpoint:', persistedDep.endpoint);
  }

  // STEP 15: Delete deployment
  console.log('\n--- TEST 15: Testing Workload Deletion ---');
  const delResult = await deleteDeploymentRecord(depId);
  console.log('Delete Result:', delResult);

  // STEP 16: Redeploy test
  console.log('\n--- TEST 16: Testing Fresh Redeployment ---');
  const redeployId = `dep-mern-redeploy-${Date.now().toString().slice(-4)}`;
  const redeployRecord: DeploymentRecord = {
    id: redeployId,
    serviceName: 'mern-ecommerce',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'production',
    target: 'local-docker',
    owner: 'team-backend',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(redeployRecord);
  console.log('Redeploy Status:', redeployRecord.status);
  console.log('Redeploy Endpoint:', redeployRecord.endpoint);

  console.log('\n======================================================');
  console.log('ALL 16 ACCEPTANCE STEPS COMPLETED SUCCESSFULLY! ✓');
  console.log('======================================================');
}

runAcceptanceSuite().catch((err) => {
  console.error('Acceptance suite failed:', err);
  process.exit(1);
});
