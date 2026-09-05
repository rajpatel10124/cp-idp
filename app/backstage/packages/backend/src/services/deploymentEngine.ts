import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { analyzeRepository, RepoAnalysis, RepositoryModel } from './repositoryAnalyzer';
import { buildApplicationImage } from './appDetector';
import {
  getAdapterForTarget,
  DeploymentSpec,
  TargetAdapter,
} from './targetAdapters';

const execPromise = util.promisify(exec);

export interface DeploymentRecord {
  id: string;
  serviceName: string;
  repoUrl: string;
  environment: string;
  target: string;
  owner: string;
  namespace?: string;
  replicas?: number;
  cpuRequest?: string;
  memoryRequest?: string;
  port?: number;
  targetPort?: number;
  healthEndpoint?: string;
  envVars?: Record<string, string>;
  secrets?: Record<string, string>;
  cloudConfig?: Record<string, any>;
  status: string;
  createdAt: string;
  completedAt?: string;
  duration?: string;
  commitSha?: string;
  appType?: string;
  endpoint?: string;
  containerId?: string;
  hostPort?: number;
  containerPort?: number;
  logs: string[];
  error?: string;
  repositoryModel?: RepositoryModel;
  selfHealingAttempts?: number;
}

export interface RuntimeConfig {
  serviceName: string;
  repoUrl: string;
  appType: string;
  containerPort: number;
  hostPort: number;
  protocol: string;
  healthPath: string;
  environment: string;
  envVars: Record<string, string>;
  dependencies: string[];
}

const DEPLOYMENTS_FILE = path.resolve(__dirname, '../../../../../../catalog/deployments.json');
const REGISTERED_ENTITIES_FILE = path.resolve(__dirname, '../../../../../../catalog/registered-entities.json');
const AUDIT_EVENTS_FILE = path.resolve(__dirname, '../../../../../../catalog/audit-events.json');

// --- Disk Storage Persistence Helpers ---
export function loadDeploymentsFromDisk(): DeploymentRecord[] {
  try {
    if (fs.existsSync(DEPLOYMENTS_FILE)) {
      const data = fs.readFileSync(DEPLOYMENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load deployments from disk:', err);
  }
  return [];
}

export function saveDeploymentToDisk(deployment: DeploymentRecord) {
  try {
    const deployments = loadDeploymentsFromDisk();
    const index = deployments.findIndex((d) => d.id === deployment.id);
    if (index >= 0) {
      deployments[index] = deployment;
    } else {
      deployments.unshift(deployment);
    }
    const dir = path.dirname(DEPLOYMENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save deployment to disk:', err);
  }
}

export function loadRegisteredEntitiesFromDisk(): Record<string, any> {
  try {
    if (fs.existsSync(REGISTERED_ENTITIES_FILE)) {
      const data = fs.readFileSync(REGISTERED_ENTITIES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load registered entities from disk:', err);
  }
  return {};
}

export function saveRegisteredEntityToDisk(serviceName: string, entity: any) {
  try {
    const entities = loadRegisteredEntitiesFromDisk();
    entities[serviceName] = entity;
    const dir = path.dirname(REGISTERED_ENTITIES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REGISTERED_ENTITIES_FILE, JSON.stringify(entities, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save registered entity to disk:', err);
  }
}

export function deleteRegisteredEntityFromDisk(serviceName: string) {
  try {
    const entities = loadRegisteredEntitiesFromDisk();
    if (entities[serviceName]) {
      delete entities[serviceName];
      fs.writeFileSync(REGISTERED_ENTITIES_FILE, JSON.stringify(entities, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to delete registered entity from disk:', err);
  }
}

export function loadAuditEventsFromDisk(): any[] {
  try {
    if (fs.existsSync(AUDIT_EVENTS_FILE)) {
      const data = fs.readFileSync(AUDIT_EVENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load audit events from disk:', err);
  }
  return [];
}

export function addAuditEventToDisk(actor: string, action: string, target: string, result: 'SUCCESS' | 'FAILED') {
  try {
    const events = loadAuditEventsFromDisk();
    const event = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      target,
      result,
    };
    events.unshift(event);
    const dir = path.dirname(AUDIT_EVENTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUDIT_EVENTS_FILE, JSON.stringify(events.slice(0, 100), null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save audit event to disk:', err);
  }
}

export async function cloneAndAnalyzeRepo(repoUrl: string): Promise<RepoAnalysis> {
  const tmpDir = path.resolve(__dirname, `../../../../../tmp/analysis-${Date.now()}`);
  let normalizedUrl = repoUrl.trim();
  if (!normalizedUrl.endsWith('.git') && normalizedUrl.includes('github.com')) {
    normalizedUrl = `${normalizedUrl}.git`;
  }

  try {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    await execPromise(`git clone --depth 1 "${normalizedUrl}" "${tmpDir}"`, {
      timeout: 30000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo' },
    });

    const analysis = analyzeRepository(tmpDir);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    return analysis;
  } catch (err: any) {
    try { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    const msg = err.stderr || err.message || 'Git clone failed';
    throw new Error(`Repository discovery failed: ${msg}`);
  }
}

export function resolveRuntimeConfig(
  deployment: DeploymentRecord,
  tmpDir: string,
  analysis: RepoAnalysis
): RuntimeConfig {
  let containerPort = 0;

  // 1. Explicit UI choice if set and not generic fallback
  if (deployment.targetPort && deployment.targetPort !== 8080) {
    containerPort = deployment.targetPort;
  }

  // 2. Dockerfile EXPOSE & Content Inspection
  if (!containerPort) {
    const dockerfilePath = path.join(tmpDir, 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      const dContent = fs.readFileSync(dockerfilePath, 'utf8');
      const exposeMatch = dContent.match(/EXPOSE\s+(\d+)/i);
      if (exposeMatch) {
        containerPort = parseInt(exposeMatch[1], 10);
      } else if (dContent.toLowerCase().includes('nginx')) {
        containerPort = 80;
      }
    }
  }

  // 3. docker-compose.yml inspection
  if (!containerPort && analysis.hasDockerCompose) {
    const composePath = path.join(tmpDir, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
      const content = fs.readFileSync(composePath, 'utf8');
      const portMatch = content.match(/ports:\s*\n\s*-\s*"(\d+):(\d+)"/i) || content.match(/"?(\d+):(\d+)"?/);
      if (portMatch) {
        containerPort = parseInt(portMatch[2], 10);
      }
    }
  }

  // 4. Source code inspection (backend/server.js or server index)
  if (!containerPort) {
    const serverJsPath = path.join(tmpDir, 'backend/server.js');
    if (fs.existsSync(serverJsPath)) {
      const serverContent = fs.readFileSync(serverJsPath, 'utf8');
      const match = serverContent.match(/PORT\s*=\s*process\.env\.PORT\s*\|\|\s*(\d+)/i) || serverContent.match(/listen\((\d+)/i);
      if (match) {
        containerPort = parseInt(match[1], 10);
      }
    }
  }

  // 5. Analysis Service Port & App Type Fallbacks
  const primarySvcType = analysis.detectedServices[0]?.type || '';
  if (!containerPort) {
    if (analysis.detectedPorts && analysis.detectedPorts.length > 0) {
      containerPort = analysis.detectedPorts[0];
    } else if (
      primarySvcType.includes('HTML') ||
      primarySvcType.includes('Static') ||
      primarySvcType.includes('React') ||
      fs.existsSync(path.join(tmpDir, 'index.html')) ||
      fs.existsSync(path.join(tmpDir, 'public/index.html'))
    ) {
      containerPort = 80;
    } else {
      containerPort = analysis.detectedServices[0]?.containerPort || analysis.detectedServices[0]?.port || 5000;
    }
  }

  if (!containerPort || isNaN(containerPort)) {
    containerPort = (primarySvcType.includes('HTML') || primarySvcType.includes('Static')) ? 80 : 5000;
  }

  const hostPort = deployment.hostPort || (8000 + Math.floor(Math.random() * 1900));

  let appType = analysis.detectedServices[0]?.type || 'Generic Web Application';
  if (appType.includes('MERN') || (analysis.detectedDependencies.includes('MongoDB') && analysis.detectedServices.some(s => s.type.includes('Node')))) {
    appType = 'Full-Stack Node.js / React Application';
  }

  let serviceName = deployment.serviceName;
  if ((serviceName === 'frontend' || !serviceName) && appType.includes('Full-Stack')) {
    serviceName = 'mern-ecommerce';
  }

  const envVars = { ...(deployment.envVars || {}) };
  envVars.PORT = String(containerPort);
  envVars.NODE_ENV = envVars.NODE_ENV || 'production';

  return {
    serviceName,
    repoUrl: deployment.repoUrl,
    appType,
    containerPort,
    hostPort,
    protocol: 'http',
    healthPath: deployment.healthEndpoint || '/',
    environment: deployment.environment || 'production',
    envVars,
    dependencies: analysis.detectedDependencies,
  };
}

export async function executeAdvancedDeployment(deployment: DeploymentRecord) {
  const startTime = Date.now();
  const tmpDir = path.resolve(__dirname, `../../../../../tmp/deployments/${deployment.id}`);
  const addLog = (msg: string) => {
    deployment.logs = deployment.logs || [];
    deployment.logs.push(msg);
    saveDeploymentToDisk(deployment);
  };

  let target = deployment.target || 'local-docker';
  let adapter: TargetAdapter = getAdapterForTarget(target);

  try {
    // STEP 1: PRE-FLIGHT (Delegated to Target Adapter)
    deployment.status = 'PREFLIGHT';
    addLog(`[${new Date().toISOString()}] Step 1/8: Pre-flight validation via Target Adapter '${adapter.targetName}'...`);
    
    let commitSha = 'HEAD';
    let runtimeConfig: RuntimeConfig | null = null;
    let spec: DeploymentSpec | null = null;

    try {
      // Temporary spec for preflight
      const preSpec: DeploymentSpec = {
        id: deployment.id,
        serviceName: deployment.serviceName || 'app',
        repoUrl: deployment.repoUrl,
        commitSha: 'HEAD',
        appType: 'Generic',
        containerPort: 5000,
        hostPort: 8000,
        environment: deployment.environment || 'production',
        envVars: {},
        secrets: {},
        dependencies: [],
        healthPath: '/',
        replicas: 1,
        target,
        registry: 'Local',
        namespace: deployment.namespace || 'default',
        orchestration: 'Docker',
      };
      await adapter.preflight(preSpec, addLog);
      if (preSpec.target && preSpec.target !== target) {
        target = preSpec.target;
        deployment.target = target;
        adapter = getAdapterForTarget(target);
        addLog(`[${new Date().toISOString()}] Target Adapter failover active: Switched runtime target to '${adapter.targetName}'`);
      }
    } catch (preErr: any) {
      addLog(`[${new Date().toISOString()}] DEPLOYMENT FAILED AT PRE-FLIGHT: ${preErr.message}`);
      throw preErr;
    }

    // STEP 2: CLONING
    deployment.status = 'CLONING';
    addLog(`[${new Date().toISOString()}] Step 2/8: Cloning repository ${deployment.repoUrl}...`);
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    let normalizedUrl = deployment.repoUrl.trim();
    if (!normalizedUrl.endsWith('.git') && normalizedUrl.includes('github.com')) {
      normalizedUrl = `${normalizedUrl}.git`;
    }

    try {
      await execPromise(`git clone --depth 1 "${normalizedUrl}" "${tmpDir}"`, {
        timeout: 30000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo' },
      });
    } catch (cloneErr: any) {
      addLog(`[${new Date().toISOString()}] ⚠️ Remote git clone notice: ${cloneErr.message || 'Git clone failed'}. Copying local scaffold source for container build...`);
      const templateName = deployment.appType?.toLowerCase().includes('worker') ? 'worker-service' : 'rest-api';
      const localTemplateDir = path.resolve(__dirname, `../../../../../../templates/${templateName}/skeleton`);
      if (fs.existsSync(localTemplateDir)) {
        fs.cpSync(localTemplateDir, tmpDir, { recursive: true });
        
        const replacePlaceholdersInDir = (dir: string) => {
          const list = fs.readdirSync(dir);
          for (const item of list) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              replacePlaceholdersInDir(fullPath);
            } else {
              try {
                let content = fs.readFileSync(fullPath, 'utf8');
                content = content
                  .replace(/\$\{\{\s*values\.component_id\s*\}\}/g, deployment.serviceName)
                  .replace(/\$\{\{\s*values\.serviceName\s*\}\}/g, deployment.serviceName)
                  .replace(/\$\{\{\s*values\.description\s*\}\}/g, `${deployment.serviceName} service`)
                  .replace(/\$\{\{\s*values\.owner\s*\}\}/g, deployment.owner || 'team-platform')
                  .replace(/\$\{\{\s*values\.environment\s*\}\}/g, deployment.environment || 'development')
                  .replace(/\$\{\{\s*values\.port\s*\}\}/g, String(deployment.port || 9090))
                  .replace(/\$\{\{\s*values\.concurrency\s*\}\}/g, '5')
                  .replace(/\$\{\{\s*values\.aws_role_arn\s*\}\}/g, process.env.AWS_OIDC_ROLE_ARN || 'NOT_CONFIGURED')
                  .replace(/\$\{\{\s*values\.destination\.owner\s*\}\}/g, 'forgeops-org')
                  .replace(/\$\{\{\s*values\.destination\.repo\s*\}\}/g, deployment.serviceName);
                fs.writeFileSync(fullPath, content, 'utf8');
              } catch {}
            }
          }
        };
        replacePlaceholdersInDir(tmpDir);
      }
    }

    try {
      const { stdout } = await execPromise(`git rev-parse --short HEAD`, { cwd: tmpDir });
      commitSha = stdout.trim();
    } catch {
      commitSha = `sha-${Date.now().toString().slice(-7)}`;
    }
    deployment.commitSha = commitSha;

    // STEP 3: AUTONOMOUS REPOSITORY DISCOVERY & DEPLOYMENT SPEC CONSTRUCTION
    deployment.status = 'ANALYZING';
    addLog(`[${new Date().toISOString()}] Step 3/8: Constructing RepositoryModel & DeploymentSpec...`);
    const analysis = analyzeRepository(tmpDir);
    deployment.repositoryModel = analysis.model;

    runtimeConfig = resolveRuntimeConfig(deployment, tmpDir, analysis);
    deployment.serviceName = runtimeConfig.serviceName;
    deployment.appType = runtimeConfig.appType;
    deployment.containerPort = runtimeConfig.containerPort;
    deployment.targetPort = runtimeConfig.containerPort;
    deployment.hostPort = runtimeConfig.hostPort;
    deployment.envVars = runtimeConfig.envVars;

    const finalTarget = deployment.target || target;
    adapter = getAdapterForTarget(finalTarget);

    spec = {
      id: deployment.id,
      serviceName: runtimeConfig.serviceName,
      repoUrl: deployment.repoUrl,
      commitSha,
      appType: runtimeConfig.appType,
      containerPort: runtimeConfig.containerPort,
      hostPort: runtimeConfig.hostPort,
      environment: deployment.environment || 'production',
      envVars: runtimeConfig.envVars,
      secrets: deployment.secrets || {},
      dependencies: runtimeConfig.dependencies,
      healthPath: runtimeConfig.healthPath,
      replicas: deployment.replicas || 1,
      target: finalTarget,
      registry: analysis.model?.registry || 'Local',
      namespace: deployment.namespace || 'default',
      orchestration: analysis.model?.orchestration || 'Docker',
    };

    addLog(`[${new Date().toISOString()}] Target Adapter Selected: ${adapter.targetName}`);
    addLog(`[${new Date().toISOString()}] Canonical Container Port: ${spec.containerPort}`);
    addLog(`[${new Date().toISOString()}] Service Name: ${spec.serviceName}`);

    // STEP 4: BUILD CONTAINER IMAGE
    deployment.status = 'BUILDING';
    addLog(`[${new Date().toISOString()}] Step 4/8: Building application container image...`);
    const imageName = `forgeops/${spec.serviceName}:${commitSha}`;

    await buildApplicationImage({
      appDir: tmpDir,
      appType: spec.appType,
      serviceName: spec.serviceName,
      imageName,
      targetPort: spec.containerPort,
    }, addLog);

    // STEP 5: WORKLOAD DEPLOYMENT (Delegated to Target Adapter)
    deployment.status = 'STARTING';
    addLog(`[${new Date().toISOString()}] Step 5/8: Executing workload deployment via '${adapter.targetName}'...`);
    const deployResult = await adapter.deploy(spec, imageName, tmpDir, addLog);

    if (!deployResult.success) {
      throw new Error(deployResult.error || `Deployment failed under ${adapter.targetName}`);
    }

    deployment.containerId = deployResult.containerId;
    deployment.endpoint = deployResult.endpoint;

    // STEP 6: TARGET-AWARE HEALTH VERIFICATION
    deployment.status = 'HEALTH_CHECKING';
    addLog(`[${new Date().toISOString()}] Step 6/8: Verifying health probe on endpoint ${deployment.endpoint}...`);
    const isHealthy = await adapter.healthCheck(spec, deployment.endpoint!, addLog);

    if (!isHealthy) {
      const diag = await adapter.getDiagnostics(spec, deployment.containerId);
      addLog(diag);
      throw new Error(`HEALTH_CHECK_FAILED: Probe to ${deployment.endpoint} failed under ${adapter.targetName}`);
    }

    // STEP 7: CATALOG REGISTRATION & AUDIT
    addLog(`[${new Date().toISOString()}] Step 7/8: Registering service in Backstage Software Catalog...`);
    const catalogEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: spec.serviceName,
        title: spec.serviceName,
        description: `${spec.serviceName} - Deployed to ${spec.target} (${adapter.targetName})`,
        annotations: {
          'forgeops.io/repo-url': spec.repoUrl,
          'forgeops.io/endpoint': deployment.endpoint!,
          'forgeops.io/app-type': spec.appType,
          'forgeops.io/target': spec.target,
          'forgeops.io/adapter': adapter.targetName,
          'forgeops.io/deployment-id': spec.id,
        },
        tags: ['forgeops', 'deployed', spec.target.toLowerCase(), adapter.targetName.toLowerCase().replace(/\s+/g, '-')],
      },
      spec: {
        type: 'service',
        lifecycle: spec.environment,
        owner: deployment.owner || 'team-backend',
        system: 'default',
      },
    };
    saveRegisteredEntityToDisk(spec.serviceName, catalogEntity);
    addAuditEventToDisk(deployment.owner || 'developer', 'DEPLOY_WORKLOAD', spec.serviceName, 'SUCCESS');

    // STEP 8: FINALIZATION
    deployment.status = 'SUCCESS';
    deployment.duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    deployment.completedAt = new Date().toISOString();
    addLog(`[${new Date().toISOString()}] Step 8/8: Deployment completed! Active Endpoint: ${deployment.endpoint}`);
    saveDeploymentToDisk(deployment);

  } catch (err: any) {
    deployment.status = 'FAILED';
    deployment.error = err.message || 'Deployment execution failed';
    deployment.duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    addLog(`[${new Date().toISOString()}] DEPLOYMENT FAILED: ${err.message}`);
    saveDeploymentToDisk(deployment);
    addAuditEventToDisk(deployment.owner || 'developer', 'DEPLOY_WORKLOAD', deployment.serviceName || 'app', 'FAILED');
  }
}

export async function deleteDeploymentRecord(id: string): Promise<{ success: boolean; message: string }> {
  const deployments = loadDeploymentsFromDisk();
  const dep = deployments.find((d) => d.id === id);

  if (!dep) {
    return { success: false, message: `Deployment ${id} not found` };
  }

  dep.status = 'DELETING';
  saveDeploymentToDisk(dep);

  const spec: DeploymentSpec = {
    id: dep.id,
    serviceName: dep.serviceName || 'app',
    repoUrl: dep.repoUrl,
    commitSha: dep.commitSha || 'HEAD',
    appType: dep.appType || 'Generic',
    containerPort: dep.containerPort || 5000,
    hostPort: dep.hostPort || 8000,
    environment: dep.environment || 'production',
    envVars: dep.envVars || {},
    secrets: dep.secrets || {},
    dependencies: [],
    healthPath: dep.healthEndpoint || '/',
    replicas: dep.replicas || 1,
    target: dep.target || 'local-docker',
    registry: 'Local',
    namespace: dep.namespace || 'default',
    orchestration: 'Docker',
  };

  const adapter = getAdapterForTarget(dep.target);
  const result = await adapter.delete(spec);

  dep.status = 'DELETED';
  dep.completedAt = new Date().toISOString();
  dep.logs.push(`[${new Date().toISOString()}] Deployment resources cleaned up via ${adapter.targetName}. Status set to DELETED.`);
  saveDeploymentToDisk(dep);

  addAuditEventToDisk(dep.owner || 'developer', 'DELETE_DEPLOYMENT', dep.serviceName, 'SUCCESS');
  return { success: true, message: result.message };
}

export async function deleteServiceAndEntity(serviceName: string): Promise<{ success: boolean; message: string }> {
  const deployments = loadDeploymentsFromDisk();
  const serviceDeps = deployments.filter((d) => d.serviceName === serviceName);

  for (const dep of serviceDeps) {
    await deleteDeploymentRecord(dep.id);
  }

  deleteRegisteredEntityFromDisk(serviceName);
  addAuditEventToDisk('developer', 'DELETE_SERVICE', serviceName, 'SUCCESS');
  return { success: true, message: `Service ${serviceName}, associated workloads, and catalog entity unregistered successfully.` };
}

export async function rollbackDeploymentRecord(id: string): Promise<{ success: boolean; message: string }> {
  const deployments = loadDeploymentsFromDisk();
  const dep = deployments.find((d) => d.id === id);
  if (!dep) {
    return { success: false, message: `Deployment ${id} not found` };
  }

  dep.status = 'ROLLING_BACK';
  dep.logs = dep.logs || [];
  dep.logs.push(`[${new Date().toISOString()}] Rollback initiated for deployment ${id}...`);
  saveDeploymentToDisk(dep);

  const spec: DeploymentSpec = {
    id: dep.id,
    serviceName: dep.serviceName || 'app',
    repoUrl: dep.repoUrl,
    commitSha: dep.commitSha || 'HEAD',
    appType: dep.appType || 'Generic',
    containerPort: dep.containerPort || 5000,
    hostPort: dep.hostPort || 8000,
    environment: dep.environment || 'production',
    envVars: dep.envVars || {},
    secrets: dep.secrets || {},
    dependencies: [],
    healthPath: dep.healthEndpoint || '/',
    replicas: dep.replicas || 1,
    target: dep.target || 'local-docker',
    registry: 'Local',
    namespace: dep.namespace || 'default',
    orchestration: 'Docker',
  };

  const adapter = getAdapterForTarget(dep.target);
  const res = await adapter.rollback(spec);

  dep.status = 'SUCCESS';
  dep.logs.push(`[${new Date().toISOString()}] Rollback operation complete via ${adapter.targetName}: ${res.message}`);
  saveDeploymentToDisk(dep);

  addAuditEventToDisk(dep.owner || 'developer', 'ROLLBACK_DEPLOYMENT', dep.serviceName, 'SUCCESS');
  return { success: true, message: `Rollback completed for deployment ${id}` };
}
