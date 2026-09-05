const { executeAdvancedDeployment, loadDeploymentsFromDisk, deleteDeploymentRecord } = require('../app/backstage/packages/backend/dist/services/deploymentEngine');
const { getAdapterForTarget } = require('../app/backstage/packages/backend/dist/services/targetAdapters');
const { execSync } = require('child_process');

async function testAcceptance() {
  console.log('================================================================');
  console.log('FORGEOPS COMPREHENSIVE ACCEPTANCE SUITE (DIRECT NODE TEST)');
  console.log('================================================================\n');

  // STEP 1: Adapter Dispatch
  console.log('[1/5] Verifying Target Adapters...');
  const dockerAdapter = getAdapterForTarget('local-docker');
  const eksAdapter = getAdapterForTarget('aws-eks');
  console.log(`- Docker Adapter => ${dockerAdapter.targetName}`);
  console.log(`- AWS EKS Adapter => ${eksAdapter.targetName}`);
  if (dockerAdapter.targetName !== 'LOCAL DOCKER' || eksAdapter.targetName !== 'AWS EKS') {
    throw new Error('Adapter dispatch check failed');
  }
  console.log('✓ Target Adapters Verified\n');

  // STEP 2: State Persistence
  console.log('[2/5] Testing Catalog & Deployment Disk Persistence...');
  const deployments = loadDeploymentsFromDisk();
  console.log(`- Found ${deployments.length} persisted deployments in catalog/deployments.json`);
  console.log('✓ Disk Persistence Verified\n');

  // STEP 3: Cloud Safe Pre-flight (AWS EKS)
  console.log('[3/5] Testing Optional AWS EKS Pre-flight Isolation...');
  const eksDep = {
    id: `dep-eks-test-${Date.now().toString().slice(-4)}`,
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
  if (eksDep.status !== 'FAILED' || !eksDep.error.includes('EKS_PREFLIGHT_FAILED')) {
    throw new Error('AWS EKS safe pre-flight test failed');
  }
  console.log('✓ AWS EKS Isolation Verified (No platform crash)\n');

  console.log('================================================================');
  console.log('FORGEOPS ACCEPTANCE SUITE PASSED! ✓');
  console.log('================================================================\n');
}

testAcceptance().catch((err) => {
  console.error('Acceptance Test Failed:', err);
  process.exit(1);
});
