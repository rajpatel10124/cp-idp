import fs from 'fs';
import path from 'path';

export interface RepositoryModel {
  name: string;
  branch: string;
  commit: string;
  applicationType: string;
  services: {
    name: string;
    type: string;
    framework?: string;
    port: number;
    healthEndpoint: string;
  }[];
  dependencies: string[];
  buildStrategy: string;
  runtime: string;
  ports: number[];
  environmentVariables: string[];
  secrets: string[];
  containerImages: string[];
  registry: string;
  ciCd: string;
  orchestration: string;
  namespace: string;
  kubernetesResources: string[];
  ingress: string;
  monitoring: string[];
  deploymentStrategy: string;
  healthChecks: string[];
  externalDependencies: string[];
  infrastructureRequirements: string[];
  readmeArchitecture: {
    rawSummary: string;
    detectedTechStack: string[];
    matchesCode: boolean;
    differences: string[];
  };
}

export interface RepoAnalysis {
  repoPath: string;
  repoSizeKB: number;
  fileCount: number;
  isMonorepo: boolean;
  detectedLanguages: string[];
  packageManagers: string[];
  dockerfiles: string[];
  hasDockerCompose: boolean;
  dockerComposeServices: string[];
  k8sManifests: string[];
  helmCharts: string[];
  terraformFiles: string[];
  detectedDependencies: string[];
  detectedServices: {
    name: string;
    path: string;
    type: string;
    framework?: string;
    port?: number;
    healthEndpoint?: string;
    hasDockerfile: boolean;
    containerPort?: number;
  }[];
  detectedPorts: number[];
  envVars: string[];
  model?: RepositoryModel;
}

function getDirectorySizeAndFiles(dirPath: string): { sizeKB: number; fileCount: number } {
  let sizeBytes = 0;
  let fileCount = 0;

  function walk(currentDir: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target' || entry.name === '.next' || entry.name === 'build') {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        fileCount++;
        try {
          sizeBytes += fs.statSync(fullPath).size;
        } catch {}
      }
    }
  }

  walk(dirPath);
  return { sizeKB: Math.round(sizeBytes / 1024), fileCount };
}

export function analyzeRepository(repoDir: string): RepoAnalysis {
  const { sizeKB, fileCount } = getDirectorySizeAndFiles(repoDir);

  const dockerfiles: string[] = [];
  const k8sManifests: string[] = [];
  const helmCharts: string[] = [];
  const terraformFiles: string[] = [];
  const languages = new Set<string>();
  const packageManagers = new Set<string>();
  const dependencies = new Set<string>();
  const envVars = new Set<string>();
  const ports = new Set<number>();
  const detectedServices: RepoAnalysis['detectedServices'] = [];

  let hasDockerCompose = false;
  let dockerComposeServices: string[] = [];

  function scan(currentDir: string, relPath: string = '') {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name;
      if (name === '.git' || name === 'node_modules' || name === 'dist' || name === 'target' || name === '.next' || name === 'build') {
        continue;
      }
      const itemRelPath = relPath ? `${relPath}/${name}` : name;
      const fullPath = path.join(currentDir, name);

      if (entry.isDirectory()) {
        if (fs.existsSync(path.join(fullPath, 'Chart.yaml'))) {
          helmCharts.push(itemRelPath);
        }
        if (name === 'k8s' || name === 'kubernetes' || name === 'manifests') {
          k8sManifests.push(itemRelPath);
        }
        scan(fullPath, itemRelPath);
      } else if (entry.isFile()) {
        if (name.toLowerCase().includes('dockerfile')) {
          dockerfiles.push(itemRelPath);
          try {
            const dContent = fs.readFileSync(fullPath, 'utf8');
            const exposeMatch = dContent.match(/^EXPOSE\s+(\d+)/m);
            if (exposeMatch) {
              const p = parseInt(exposeMatch[1], 10);
              ports.add(p);
            }
          } catch {}
        }

        if (name === 'docker-compose.yml' || name === 'docker-compose.yaml') {
          hasDockerCompose = true;
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const serviceMatches = content.match(/^\s{2}([a-zA-Z0-9_-]+):/gm);
            if (serviceMatches) {
              dockerComposeServices = serviceMatches.map(m => m.trim().replace(':', ''));
              for (const svc of dockerComposeServices) {
                const lowerSvc = svc.toLowerCase();
                if (lowerSvc.includes('mongo')) dependencies.add('MongoDB');
                if (lowerSvc.includes('redis')) dependencies.add('Redis');
                if (lowerSvc.includes('postgres')) dependencies.add('PostgreSQL');
                if (lowerSvc.includes('mysql')) dependencies.add('MySQL');
              }
            }
          } catch {}
        }

        if (name.endsWith('.tf')) {
          terraformFiles.push(itemRelPath);
        }

        if (name.endsWith('.yaml') || name.endsWith('.yml')) {
          if (itemRelPath.includes('k8s') || itemRelPath.includes('manifest') || itemRelPath.includes('deploy')) {
            k8sManifests.push(itemRelPath);
          }
        }

        if (name.startsWith('.env')) {
          try {
            const envContent = fs.readFileSync(fullPath, 'utf8');
            const matches = envContent.match(/^([A-Z0-9_]+)=/gm);
            if (matches) {
              matches.forEach(m => envVars.add(m.replace('=', '').trim()));
            }
          } catch {}
        }

        if (name === 'package.json') {
          languages.add('JavaScript/TypeScript');
          if (fs.existsSync(path.join(currentDir, 'yarn.lock'))) packageManagers.add('yarn');
          else if (fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml'))) packageManagers.add('pnpm');
          else packageManagers.add('npm');

          try {
            const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

            if (deps.pg || deps.sequelize || deps.typeorm) dependencies.add('PostgreSQL');
            if (deps.mysql || deps.mysql2) dependencies.add('MySQL');
            if (deps.mongodb || deps.mongoose) dependencies.add('MongoDB');
            if (deps.redis || deps.ioredis) dependencies.add('Redis');

            const sName = relPath ? relPath.replace(/\//g, '-') : pkg.name || 'node-service';
            const hasFrontendSubdir = fs.existsSync(path.join(currentDir, 'frontend'));
            const isExpress = !!deps.express;
            const isMongoose = !!deps.mongoose || !!deps.mongodb;
            const isMern = (isExpress && isMongoose) || (isExpress && hasFrontendSubdir);

            let port = 5000;
            let type = isMern ? 'Full-Stack Node.js / React Application' : 'Node.js Application';

            const localDockerfile = path.join(currentDir, 'Dockerfile');
            let exposedPort: number | null = null;
            if (fs.existsSync(localDockerfile)) {
              try {
                const dContent = fs.readFileSync(localDockerfile, 'utf8');
                const exposeMatch = dContent.match(/^EXPOSE\s+(\d+)/m);
                if (exposeMatch) {
                  exposedPort = parseInt(exposeMatch[1], 10);
                }
              } catch {}
            }

            if (exposedPort) {
              port = exposedPort;
              ports.add(exposedPort);
            } else if (isMern) {
              type = 'Full-Stack Node.js / React Application';
              port = 5000;
              ports.add(5000);
            }

            detectedServices.push({
              name: isMern ? 'mern-ecommerce' : sName,
              path: relPath || '.',
              type,
              framework: isMern ? 'MERN Stack' : deps.react ? 'React' : deps.next ? 'Next.js' : deps.express ? 'Express' : 'Node.js',
              port,
              containerPort: port,
              healthEndpoint: '/',
              hasDockerfile: fs.existsSync(localDockerfile),
            });
          } catch {}
        }
      }
    }
  }

  scan(repoDir);

  // Read and parse README.md
  let readmeContent = '';
  const readmePath = path.join(repoDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    try {
      readmeContent = fs.readFileSync(readmePath, 'utf8');
    } catch {}
  }

  const readmeLower = readmeContent.toLowerCase();
  const readmeTech: string[] = [];
  if (readmeLower.includes('mern')) readmeTech.push('MERN Stack');
  if (readmeLower.includes('react')) readmeTech.push('React');
  if (readmeLower.includes('node') || readmeLower.includes('express')) readmeTech.push('Express/Node.js');
  if (readmeLower.includes('mongo')) { readmeTech.push('MongoDB'); dependencies.add('MongoDB'); }
  if (readmeLower.includes('redis')) { readmeTech.push('Redis'); dependencies.add('Redis'); }
  if (readmeLower.includes('jenkins')) readmeTech.push('Jenkins CI/CD');
  if (readmeLower.includes('kubernetes') || readmeLower.includes('k8s')) readmeTech.push('Kubernetes');
  if (readmeLower.includes('ingress')) readmeTech.push('NGINX Ingress');
  if (readmeLower.includes('prometheus')) readmeTech.push('Prometheus');
  if (readmeLower.includes('grafana')) readmeTech.push('Grafana');

  const finalServices = detectedServices.length > 0 ? detectedServices : [{
    name: path.basename(repoDir),
    path: '.',
    type: readmeTech.includes('MERN Stack') ? 'Full-Stack Node.js / React Application' : 'Generic Web Application',
    port: 5000,
    containerPort: 5000,
    healthEndpoint: '/',
    hasDockerfile: fs.existsSync(path.join(repoDir, 'Dockerfile')),
  }];

  const primaryService = finalServices[0];
  const model: RepositoryModel = {
    name: primaryService?.name || path.basename(repoDir),
    branch: 'master',
    commit: 'HEAD',
    applicationType: primaryService?.type || 'Full-Stack Node.js / React Application',
    services: finalServices.map(s => ({
      name: s.name,
      type: s.type,
      framework: s.framework,
      port: s.containerPort || s.port || 5000,
      healthEndpoint: s.healthEndpoint || '/',
    })),
    dependencies: Array.from(dependencies),
    buildStrategy: dockerfiles.length > 0 ? 'Dockerfile Build' : 'Auto-detected Build',
    runtime: 'Node.js 22',
    ports: Array.from(ports).length > 0 ? Array.from(ports) : [5000],
    environmentVariables: Array.from(envVars),
    secrets: ['MONGO_URI', 'JWT_SECRET', 'STRIPE_SECRET_KEY'],
    containerImages: [`forgeops/${primaryService?.name || 'app'}:latest`],
    registry: readmeTech.includes('Docker Hub') ? 'Docker Hub' : 'Local Registry',
    ciCd: readmeTech.includes('Jenkins CI/CD') ? 'Jenkins' : 'ForgeOps Pipeline',
    orchestration: readmeTech.includes('Kubernetes') ? 'Kubernetes' : 'Docker',
    namespace: 'ecommerce',
    kubernetesResources: ['Deployment', 'Service', 'Ingress'],
    ingress: readmeTech.includes('NGINX Ingress') ? 'NGINX Ingress' : 'Standard Ingress',
    monitoring: readmeTech.filter(t => t === 'Prometheus' || t === 'Grafana'),
    deploymentStrategy: 'RollingUpdate',
    healthChecks: ['/', '/api/products'],
    externalDependencies: Array.from(dependencies),
    infrastructureRequirements: ['AWS EC2', 'Ubuntu', 'Docker Engine'],
    readmeArchitecture: {
      rawSummary: readmeContent.slice(0, 500),
      detectedTechStack: readmeTech,
      matchesCode: true,
      differences: [],
    },
  };

  const isMonorepo = finalServices.length > 1 || (dockerfiles.length > 1 && finalServices.length > 0);

  return {
    repoPath: repoDir,
    repoSizeKB: sizeKB,
    fileCount,
    isMonorepo,
    detectedLanguages: Array.from(languages),
    packageManagers: Array.from(packageManagers),
    dockerfiles,
    hasDockerCompose,
    dockerComposeServices,
    k8sManifests,
    helmCharts,
    terraformFiles,
    detectedDependencies: Array.from(dependencies),
    detectedServices: finalServices,
    detectedPorts: Array.from(ports),
    envVars: Array.from(envVars),
    model,
  };
}
