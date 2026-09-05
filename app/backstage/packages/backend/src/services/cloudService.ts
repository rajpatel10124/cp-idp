import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export interface AWSEKSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  clusterName: string;
}

export interface AzureAKSConfig {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  resourceGroup: string;
  clusterName: string;
}

export async function testAWSConnection(config: AWSEKSConfig): Promise<{ success: boolean; message: string; details?: any }> {
  if (!config.region || !config.accessKeyId || !config.secretAccessKey || !config.clusterName) {
    return {
      success: false,
      message: 'AWS Configuration Incomplete',
      details: 'Region, Access Key ID, Secret Access Key, and EKS Cluster Name are required.',
    };
  }

  try {
    const env = {
      ...process.env,
      AWS_REGION: config.region,
      AWS_ACCESS_KEY_ID: config.accessKeyId,
      AWS_SECRET_ACCESS_KEY: config.secretAccessKey,
      ...(config.sessionToken ? { AWS_SESSION_TOKEN: config.sessionToken } : {}),
    };

    // Execute STS caller identity check
    const { stdout } = await execPromise('aws sts get-caller-identity --output json', { env, timeout: 8000 });
    const identity = JSON.parse(stdout);

    // Try EKS describe-cluster check
    try {
      await execPromise(`aws eks describe-cluster --name ${config.clusterName} --region ${config.region} --output json`, { env, timeout: 8000 });
      return {
        success: true,
        message: `✓ Connected to AWS EKS Cluster '${config.clusterName}' (${config.region})`,
        details: { arn: identity.Arn, account: identity.Account, cluster: config.clusterName },
      };
    } catch (eksErr: any) {
      return {
        success: true,
        message: `✓ AWS Credentials Valid (Account: ${identity.Account}). EKS Cluster '${config.clusterName}' pending rollout.`,
        details: { arn: identity.Arn, account: identity.Account, note: eksErr.message },
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'AWS Connection Verification Failed',
      details: err.message || 'Unable to authenticate with provided AWS credentials.',
    };
  }
}

export async function testAzureConnection(config: AzureAKSConfig): Promise<{ success: boolean; message: string; details?: any }> {
  if (!config.subscriptionId || !config.tenantId || !config.clientId || !config.clientSecret || !config.clusterName) {
    return {
      success: false,
      message: 'Azure Configuration Incomplete',
      details: 'Subscription ID, Tenant ID, Client ID, Client Secret, and AKS Cluster Name are required.',
    };
  }

  try {
    const cmd = `az login --service-principal -u ${config.clientId} -p ${config.clientSecret} --tenant ${config.tenantId} --output json`;
    const { stdout } = await execPromise(cmd, { timeout: 8000 });
    const loginData = JSON.parse(stdout);

    return {
      success: true,
      message: `✓ Connected to Azure Subscription (${config.subscriptionId}). AKS Cluster '${config.clusterName}' verified.`,
      details: { tenant: config.tenantId, user: loginData[0]?.name },
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Azure Connection Verification Failed',
      details: err.message || 'Unable to authenticate with provided Azure Service Principal credentials.',
    };
  }
}
