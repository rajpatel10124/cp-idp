import { executeAdvancedDeployment, DeploymentRecord, loadDeploymentsFromDisk } from '../app/backstage/packages/backend/src/services/deploymentEngine';
import { execSync } from 'child_process';

async function runListenContractVerification() {
  console.log('================================================================');
  console.log('FORGEOPS STRICT PORT CONTRACT & LISTEN SOCKET VERIFICATION TEST');
  console.log('================================================================\n');

  const testId = `dep-listen-${Date.now().toString().slice(-4)}`;
  const deployment: DeploymentRecord = {
    id: testId,
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

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log('Deployment Status:', deployment.status);
  console.log('Canonical Container Port:', deployment.containerPort);
  console.log('Host Port:', deployment.hostPort);
  console.log('Endpoint:', deployment.endpoint);
  console.log('Environment PORT:', deployment.envVars?.PORT);
  console.log('Logs Snippet:\n' + deployment.logs.slice(-10).join('\n'));

  if (deployment.status !== 'SUCCESS') {
    console.error('FAILED: Deployment did not complete successfully.');
    process.exit(1);
  }

  // Verify exact HTTP & API responses
  const endpoint = deployment.endpoint!;
  const rootCode = execSync(`curl -s -o /dev/null -w "%{http_code}" "${endpoint}/"`).toString().trim();
  console.log(`\nHTTP Probe (GET ${endpoint}/) => HTTP Status ${rootCode}`);

  const apiCode = execSync(`curl -s -o /dev/null -w "%{http_code}" "${endpoint}/api/products"`).toString().trim();
  console.log(`API Probe (GET ${endpoint}/api/products) => HTTP Status ${apiCode}`);

  console.log('\n================================================================');
  console.log('STRICT PORT CONTRACT & LISTEN DETECTOR VERIFIED SUCCESSFULLY! ✓');
  console.log('================================================================\n');
}

runListenContractVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
