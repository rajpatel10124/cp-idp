import { executeAdvancedDeployment, loadDeploymentsFromDisk, DeploymentRecord } from '../app/backstage/packages/backend/src/services/deploymentEngine';

async function runTests() {
  console.log('=== TEST 1: LOCAL_DOCKER Target ===');
  const depDocker: DeploymentRecord = {
    id: `dep-docker-${Date.now()}`,
    serviceName: 'mern-ecommerce-docker',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'development',
    target: 'local-docker',
    owner: 'team-ecommerce',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(depDocker);
  console.log('Test 1 Result Status:', depDocker.status);
  console.log('Test 1 Error:', depDocker.error || 'None');
  console.log('Test 1 Endpoint:', depDocker.endpoint || 'None');
  console.log('Test 1 Logs:\n' + depDocker.logs.join('\n'));

  console.log('\n=== TEST 2: LOCAL_KUBERNETES Target (with unavailable cluster) ===');
  const depK8s: DeploymentRecord = {
    id: `dep-k8s-${Date.now()}`,
    serviceName: 'mern-ecommerce-k8s',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'development',
    target: 'local-k8s',
    owner: 'team-ecommerce',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(depK8s);
  console.log('Test 2 Result Status:', depK8s.status);
  console.log('Test 2 Error:', depK8s.error || 'None');
  console.log('Test 2 Logs:\n' + depK8s.logs.join('\n'));
}

runTests();
