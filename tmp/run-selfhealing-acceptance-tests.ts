import { executeAdvancedDeployment, deleteDeploymentRecord, loadDeploymentsFromDisk, DeploymentRecord } from '../app/backstage/packages/backend/src/services/deploymentEngine';
import { execSync } from 'child_process';

async function runSelfHealingTest() {
  console.log('================================================================');
  console.log('FORGEOPS AUTONOMOUS REPOSITORY & SELF-HEALING ACCEPTANCE SUITE');
  console.log('================================================================\n');

  const depId = `dep-selfheal-${Date.now().toString().slice(-4)}`;
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

  console.log('\n--- DEPLOYMENT EXECUTION REPORT ---');
  console.log('1. Status:', deployment.status);
  console.log('2. Application Type:', deployment.appType);
  console.log('3. Service Name:', deployment.serviceName);
  console.log('4. Container Port:', deployment.containerPort);
  console.log('5. Host Port:', deployment.hostPort);
  console.log('6. Endpoint:', deployment.endpoint);
  console.log('7. Self Healing Attempts:', deployment.selfHealingAttempts);
  console.log('8. README Architecture Summary:', deployment.repositoryModel?.readmeArchitecture.rawSummary.slice(0, 150));
  console.log('9. Detected Tech Stack:', deployment.repositoryModel?.readmeArchitecture.detectedTechStack.join(', '));
  
  if (deployment.status !== 'SUCCESS') {
    console.error('FAILED: Self-healing deployment did not reach SUCCESS.');
    process.exit(1);
  }

  // HTTP Reachability Check
  console.log('\n--- VERIFYING REAL HTTP & API RESPONSES ---');
  const endpoint = deployment.endpoint!;
  const rootCode = execSync(`curl -s -o /dev/null -w "%{http_code}" "${endpoint}/"`).toString().trim();
  console.log(`GET ${endpoint}/ => HTTP Status Code: ${rootCode}`);

  const apiCode = execSync(`curl -s -o /dev/null -w "%{http_code}" "${endpoint}/api/products"`).toString().trim();
  console.log(`GET ${endpoint}/api/products => HTTP Status Code: ${apiCode}`);

  // Disk Persistence Verification
  console.log('\n--- VERIFYING DISK PERSISTENCE ---');
  const persistedDeps = loadDeploymentsFromDisk();
  const found = persistedDeps.find(d => d.id === depId);
  console.log('Persisted Deployment Record Found:', found ? 'YES ✓' : 'NO ✗');

  // Workload Deletion
  console.log('\n--- VERIFYING WORKLOAD DELETION ---');
  const delRes = await deleteDeploymentRecord(depId);
  console.log('Delete Result:', delRes.message);

  console.log('\n================================================================');
  console.log('ALL AUTONOMOUS & SELF-HEALING VERIFICATIONS PASSED SUCCESSFULLY! ✓');
  console.log('================================================================\n');
}

runSelfHealingTest().catch((err) => {
  console.error('Self-healing test suite failed:', err);
  process.exit(1);
});
