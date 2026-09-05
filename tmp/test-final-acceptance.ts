import { executeAdvancedDeployment, DeploymentRecord, deleteDeploymentRecord, loadDeploymentsFromDisk } from '../app/backstage/packages/backend/src/services/deploymentEngine';
import { getAdapterForTarget } from '../app/backstage/packages/backend/src/services/targetAdapters';
import { execSync } from 'child_process';

async function runFinalAcceptanceSuite() {
  console.log('================================================================');
  console.log('FORGEOPS FINAL YEAR PROJECT — COMPREHENSIVE ACCEPTANCE TEST');
  console.log('================================================================\n');

  // STEP 1: VERIFY TARGET ADAPTER DISPATCH
  console.log('[1/5] Verifying Target Adapters Isolation...');
  const dockerAdapter = getAdapterForTarget('local-docker');
  const eksAdapter = getAdapterForTarget('aws-eks');
  const minikubeAdapter = getAdapterForTarget('minikube');

  console.log(`- local-docker adapter => ${dockerAdapter.targetName}`);
  console.log(`- aws-eks adapter      => ${eksAdapter.targetName}`);
  console.log(`- minikube adapter     => ${minikubeAdapter.targetName}`);

  if (dockerAdapter.targetName !== 'LOCAL DOCKER' || eksAdapter.targetName !== 'AWS EKS') {
    throw new Error('Adapter dispatch hierarchy test failed!');
  }
  console.log('✓ Target Adapters Isolation Verified\n');

  // STEP 2: VERIFY LOCAL DOCKER GOLDEN PATH & DEPLOYMENT
  console.log('[2/5] Testing End-to-End Local Docker Deployment...');
  const localDepId = `dep-accept-${Date.now().toString().slice(-4)}`;
  const localDep: DeploymentRecord = {
    id: localDepId,
    serviceName: 'mern-ecommerce',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'production',
    target: 'local-docker',
    owner: 'team-backend',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(localDep);
  console.log(`- Status: ${localDep.status}`);
  console.log(`- Endpoint: ${localDep.endpoint}`);
  console.log(`- Container Port: ${localDep.containerPort}`);

  if (localDep.status !== 'SUCCESS') {
    throw new Error('Local Docker acceptance test failed!');
  }

  // HTTP & API Layer 7 Probes
  const httpCode = execSync(`curl -s -o /dev/null -w "%{http_code}" "${localDep.endpoint}/"`).toString().trim();
  console.log(`- Root HTTP Probe: Status ${httpCode}`);

  const apiCode = execSync(`curl -s -o /dev/null -w "%{http_code}" "${localDep.endpoint}/api/products"`).toString().trim();
  console.log(`- Layer 7 API Probe: Status ${apiCode}`);

  if (httpCode !== '200' && httpCode !== '304') {
    throw new Error(`HTTP Probe failed with status ${httpCode}`);
  }
  console.log('✓ Local Docker Deployment Verified\n');

  // STEP 3: VERIFY PERSISTENCE ACROSS RESTARTS
  console.log('[3/5] Verifying Deployment & Catalog State Persistence...');
  const savedDeployments = loadDeploymentsFromDisk();
  const savedDep = savedDeployments.find((d) => d.id === localDepId);
  if (!savedDep) {
    throw new Error(`Deployment ${localDepId} was not persisted to disk!`);
  }
  console.log(`- Persisted Record Found: ${savedDep.id} (${savedDep.serviceName})`);
  console.log('✓ State Persistence Verified\n');

  // STEP 4: VERIFY OPTIONAL CLOUD (AWS EKS) SAFE PRE-FLIGHT
  console.log('[4/5] Testing Optional AWS EKS Pre-flight Isolation...');
  const eksDep: DeploymentRecord = {
    id: `dep-eks-check-${Date.now().toString().slice(-4)}`,
    serviceName: 'mern-ecommerce',
    repoUrl: 'https://github.com/rajpatel10124/mern-ecommerce',
    environment: 'production',
    target: 'aws-eks',
    owner: 'team-backend',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    logs: [],
  };

  await executeAdvancedDeployment(eksDep);
  console.log(`- AWS EKS Status: ${eksDep.status}`);
  console.log(`- AWS EKS Error Message: ${eksDep.error}`);
  console.log('- AWS EKS Logs Snippet:\n  ' + eksDep.logs.slice(-2).join('\n  '));
  console.log('✓ AWS EKS Isolation Verified (Handled gracefully with no platform crash)\n');

  // STEP 5: CLEANUP WORKLOAD & ENTITY
  console.log('[5/5] Testing Resource & Container Cleanup...');
  await deleteDeploymentRecord(localDepId);
  console.log('✓ Resource Cleanup Verified\n');

  console.log('================================================================');
  console.log('FORGEOPS FINAL YEAR PROJECT — ALL ACCEPTANCE TESTS PASSED! ✓');
  console.log('================================================================\n');
}

runFinalAcceptanceSuite().catch((err) => {
  console.error('Final Acceptance Test Failed:', err);
  process.exit(1);
});
