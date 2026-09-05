import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export interface BuildOptions {
  appDir: string;
  appType: string;
  framework?: string;
  serviceName: string;
  imageName: string;
  targetPort: number;
  dockerHubUsername?: string;
  dockerHubPassword?: string;
}

export async function buildApplicationImage(opts: BuildOptions, addLog: (msg: string) => void): Promise<{ success: boolean; image: string; logs: string[] }> {
  const { appDir, appType, serviceName, imageName, targetPort, dockerHubUsername, dockerHubPassword } = opts;
  const dockerfilePath = path.join(appDir, 'Dockerfile');
  const logs: string[] = [];

  const log = (msg: string) => {
    logs.push(msg);
    addLog(msg);
  };

  log(`[${new Date().toISOString()}] Initiating build process for ${serviceName} (${appType})...`);

  // 1. Dockerfile generation if not present
  if (!fs.existsSync(dockerfilePath)) {
    log(`[${new Date().toISOString()}] No Dockerfile found at ${dockerfilePath}. Auto-generating Dockerfile for ${appType}...`);

    if (appType.includes('Static') || appType.includes('HTML')) {
      fs.writeFileSync(dockerfilePath, `FROM nginx:alpine\nCOPY . /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]`);
      log(`[${new Date().toISOString()}] Generated Nginx Alpine static website Dockerfile.`);
    } else if (appType.includes('Frontend') || appType.includes('React')) {
      fs.writeFileSync(
        dockerfilePath,
        `FROM node:18-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build || true\nFROM nginx:alpine\nCOPY --from=build /app/build /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]`
      );
      log(`[${new Date().toISOString()}] Generated React static build Dockerfile.`);
    } else if (appType.includes('Node') || appType.includes('Express') || appType.includes('MERN Backend')) {
      const lockfile = fs.existsSync(path.join(appDir, 'yarn.lock')) ? 'yarn' : fs.existsSync(path.join(appDir, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
      const installCmd = lockfile === 'yarn' ? 'yarn install' : lockfile === 'pnpm' ? 'pnpm install' : 'npm install';
      fs.writeFileSync(
        dockerfilePath,
        `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN ${installCmd}\nCOPY . .\nEXPOSE ${targetPort || 5000}\nCMD ["npm", "start"]`
      );
      log(`[${new Date().toISOString()}] Generated Node.js Dockerfile.`);
    } else if (appType.includes('Python')) {
      fs.writeFileSync(
        dockerfilePath,
        `FROM python:3.10-slim\nWORKDIR /app\nCOPY requirements*.txt pyproject.toml* ./\nRUN pip install --no-cache-dir -r requirements.txt || pip install .\nCOPY . .\nEXPOSE ${targetPort || 8000}\nCMD ["python", "app.py"]`
      );
      log(`[${new Date().toISOString()}] Generated Python Dockerfile.`);
    } else if (appType.includes('Java')) {
      fs.writeFileSync(
        dockerfilePath,
        `FROM maven:3.9-eclipse-temurin-17 AS build\nWORKDIR /app\nCOPY . .\nRUN mvn clean package -DskipTests || true\nFROM eclipse-temurin:17-jre-alpine\nWORKDIR /app\nCOPY --from=build /app/target/*.jar app.jar\nEXPOSE ${targetPort || 8080}\nENTRYPOINT ["java", "-jar", "app.jar"]`
      );
      log(`[${new Date().toISOString()}] Generated Java multi-stage Dockerfile.`);
    } else if (appType.includes('Go')) {
      fs.writeFileSync(
        dockerfilePath,
        `FROM golang:1.21-alpine AS build\nWORKDIR /app\nCOPY . .\nRUN go build -o main .\nFROM alpine:latest\nWORKDIR /app\nCOPY --from=build /app/main .\nEXPOSE ${targetPort || 8080}\nCMD ["./main"]`
      );
      log(`[${new Date().toISOString()}] Generated Go multi-stage Dockerfile.`);
    } else {
      fs.writeFileSync(
        dockerfilePath,
        `FROM alpine:latest\nWORKDIR /app\nCOPY . .\nEXPOSE ${targetPort || 8080}\nCMD ["tail", "-f", "/dev/null"]`
      );
      log(`[${new Date().toISOString()}] Generated Generic container Dockerfile.`);
    }
  } else {
    log(`[${new Date().toISOString()}] Existing Dockerfile detected at ${dockerfilePath}.`);
  }

  // 2. Execute Docker Build
  try {
    log(`[${new Date().toISOString()}] Executing 'docker build -t ${imageName} "${appDir}"'...`);
    const { stdout } = await execPromise(`docker build -t ${imageName} "${appDir}"`, { timeout: 180000 });
    log(`[${new Date().toISOString()}] Docker build complete for ${imageName}.`);

    // 3. Optional Docker Hub / Container Registry Push
    if (dockerHubUsername) {
      const targetTag = `docker.io/${dockerHubUsername}/${serviceName}:${imageName.split(':')[1] || 'latest'}`;
      log(`[${new Date().toISOString()}] Tagging image for Docker Hub registry: ${targetTag}...`);
      await execPromise(`docker tag ${imageName} ${targetTag}`);

      if (dockerHubPassword) {
        log(`[${new Date().toISOString()}] Authenticating with Docker Hub registry as '${dockerHubUsername}'...`);
        await execPromise(`echo "${dockerHubPassword}" | docker login -u "${dockerHubUsername}" --password-stdin`).catch(() => {});
      }

      log(`[${new Date().toISOString()}] Pushing image to Docker Hub registry: ${targetTag}...`);
      try {
        await execPromise(`docker push ${targetTag}`, { timeout: 180000 });
        log(`[${new Date().toISOString()}] Image successfully pushed to Docker Hub: ${targetTag}`);
      } catch (pushErr: any) {
        log(`[${new Date().toISOString()}] Docker Hub push notice: ${pushErr.message}. Local container image retained.`);
      }
    }

    return { success: true, image: imageName, logs };
  } catch (err: any) {
    const errorMsg = `Docker build failed for ${serviceName}: ${err.message || 'Build process error'}`;
    log(`[${new Date().toISOString()}] BUILD_FAILED: ${errorMsg}`);
    throw new Error(errorMsg);
  }
}
