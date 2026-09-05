import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  CloudCheck as CloudIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Assessment as AnalyzeIcon,
} from '@material-ui/icons';

const BACKEND_URL = 'http://localhost:7007';

const steps = [
  'Source',
  'Analysis',
  'Services',
  'Target',
  'Runtime',
  'Secrets',
  'Strategy',
  'Review',
];

interface NewDeploymentWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewDeploymentWizard: React.FC<NewDeploymentWizardProps> = ({ onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Source
  const [repoUrl, setRepoUrl] = useState('https://github.com/octocat/Spoon-Knife.git');
  const [branch, setBranch] = useState('main');
  const [visibility, setVisibility] = useState('public');

  // Step 2: Analysis Result
  const [analysis, setAnalysis] = useState<any | null>(null);

  // Step 3: Selected Services (Monorepo)
  const [selectedServiceNames, setSelectedServiceNames] = useState<string[]>([]);

  // Step 4: Target & Cloud Credentials
  const [target, setTarget] = useState<'local-docker' | 'local-k8s' | 'aws-eks' | 'azure-aks'>('local-docker');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsCluster, setAwsCluster] = useState('forgeops-production-eks');

  const [azureSubId, setAzureSubId] = useState('');
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureResourceGroup, setAzureResourceGroup] = useState('forgeops-rg');
  const [azureCluster, setAzureCluster] = useState('forgeops-aks');

  const [connTesting, setConnTesting] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Step 5: Runtime Configuration
  const [serviceName, setServiceName] = useState('my-service');
  const [environment, setEnvironment] = useState('development');
  const [namespace, setNamespace] = useState('default');
  const [replicas, setReplicas] = useState(1);
  const [cpuRequest, setCpuRequest] = useState('100m');
  const [memoryRequest, setMemoryRequest] = useState('128Mi');
  const [port, setPort] = useState(80);
  const [targetPort, setTargetPort] = useState(8080);
  const [healthEndpoint, setHealthEndpoint] = useState('/');

  // Step 6: Secrets & Environment Variables
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '8080' },
  ]);
  const [secrets, setSecrets] = useState<{ key: string; value: string }[]>([
    { key: 'DATABASE_URL', value: 'postgresql://dbuser:secret@localhost:5432/mydb' },
  ]);

  // Step 7: Strategy & Autoscaling
  const [strategy, setStrategy] = useState('rolling-update');
  const [enableAutoscaling, setEnableAutoscaling] = useState(false);
  const [minReplicas, setMinReplicas] = useState(1);
  const [maxReplicas, setMaxReplicas] = useState(5);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || `Analysis failed (HTTP ${res.status})`);
      }
      setAnalysis(data);

      if (data.detectedServices && data.detectedServices.length > 0) {
        setSelectedServiceNames(data.detectedServices.map((s: any) => s.name));
        const first = data.detectedServices[0];
        setServiceName(first.name);
        if (first.port) setTargetPort(first.port);
        if (first.healthEndpoint) setHealthEndpoint(first.healthEndpoint);
      }
      setActiveStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze repository');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCloudConnection = async () => {
    setConnTesting(true);
    setConnTestResult(null);
    try {
      const cloudConfig = target === 'aws-eks' ? {
        region: awsRegion,
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
        clusterName: awsCluster,
      } : {
        subscriptionId: azureSubId,
        tenantId: azureTenantId,
        clientId: azureClientId,
        clientSecret: azureClientSecret,
        resourceGroup: azureResourceGroup,
        clusterName: azureCluster,
      };

      const res = await fetch(`${BACKEND_URL}/api/platform/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, cloudConfig }),
      });
      const data = await res.json();
      setConnTestResult({ success: res.ok && data.success, message: data.message || data.details });
    } catch (err: any) {
      setConnTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setConnTesting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);

    const envMap: Record<string, string> = {};
    envVars.forEach((e) => { if (e.key) envMap[e.key] = e.value; });

    const secretMap: Record<string, string> = {};
    secrets.forEach((s) => { if (s.key) secretMap[s.key] = s.value; });

    const cloudConfig = target === 'aws-eks' ? {
      region: awsRegion,
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      clusterName: awsCluster,
    } : target === 'azure-aks' ? {
      subscriptionId: azureSubId,
      tenantId: azureTenantId,
      clientId: azureClientId,
      clientSecret: azureClientSecret,
      resourceGroup: azureResourceGroup,
      clusterName: azureCluster,
    } : undefined;

    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          branch,
          serviceName,
          environment,
          target,
          cloudConfig,
          runtime: {
            namespace,
            replicas,
            cpuRequest,
            memoryRequest,
            port,
            targetPort,
            healthEndpoint,
          },
          envVars: envMap,
          secrets: secretMap,
          strategy,
          autoscaling: { enabled: enableAutoscaling, minReplicas, maxReplicas },
          owner: 'team-backend',
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit deployment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937' }}>
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Typography style={{ fontSize: '20px', fontWeight: 800, color: '#F3F4F6' }}>
          🚀 Advanced Multi-Step Deployment Control Plane
        </Typography>
        <Button onClick={onClose} style={{ color: '#9CA3AF' }}>Cancel</Button>
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel style={{ backgroundColor: 'transparent', padding: '0 0 24px 0' }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel StepIconProps={{ style: { color: '#0284C7' } }}>
              <Typography style={{ color: '#E2E8F0', fontSize: '11px', fontWeight: 600 }}>{label}</Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Box style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
          <Typography style={{ color: '#F87171', fontSize: '13px', fontWeight: 600 }}>{error}</Typography>
        </Box>
      )}

      {/* STEP 1: SOURCE */}
      {activeStep === 0 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 1: Source Code Repository
          </Typography>
          <Box style={{ backgroundColor: '#064E3B', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #059669' }}>
            <Typography style={{ color: '#34D399', fontSize: '13px', fontWeight: 600 }}>
              ✓ Public Repository Mode: No GITHUB_TOKEN required!
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Git Repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            variant="outlined"
            margin="normal"
            InputLabelProps={{ style: { color: '#9CA3AF' } }}
            InputProps={{ style: { color: '#F3F4F6' } }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Branch / Tag / Commit"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                variant="outlined"
                margin="normal"
                InputLabelProps={{ style: { color: '#9CA3AF' } }}
                InputProps={{ style: { color: '#F3F4F6' } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="Visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                variant="outlined"
                margin="normal"
                InputLabelProps={{ style: { color: '#9CA3AF' } }}
                InputProps={{ style: { color: '#F3F4F6' } }}
              >
                <MenuItem value="public">Public (No Token Required)</MenuItem>
                <MenuItem value="private">Private (Token Required)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Box style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button
              variant="contained"
              onClick={handleRunAnalysis}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} style={{ color: '#FFF' }} /> : <AnalyzeIcon />}
              style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}
            >
              Run Repository Analysis →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 2: ANALYSIS RESULT */}
      {activeStep === 1 && analysis && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 2: Deep Repository Analysis Architecture
          </Typography>
          <Grid container spacing={2} style={{ marginBottom: '16px' }}>
            <Grid item xs={3}>
              <Paper style={{ backgroundColor: '#0F172A', padding: '12px', border: '1px solid #1E293B' }}>
                <Typography style={{ fontSize: '11px', color: '#94A3B8' }}>REPO SIZE</Typography>
                <Typography style={{ fontSize: '18px', color: '#F8FAFC', fontWeight: 800 }}>{analysis.repoSizeKB} KB</Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper style={{ backgroundColor: '#0F172A', padding: '12px', border: '1px solid #1E293B' }}>
                <Typography style={{ fontSize: '11px', color: '#94A3B8' }}>FILES</Typography>
                <Typography style={{ fontSize: '18px', color: '#F8FAFC', fontWeight: 800 }}>{analysis.fileCount}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper style={{ backgroundColor: '#0F172A', padding: '12px', border: '1px solid #1E293B' }}>
                <Typography style={{ fontSize: '11px', color: '#94A3B8' }}>ARCHITECTURE</Typography>
                <Typography style={{ fontSize: '16px', color: analysis.isMonorepo ? '#F59E0B' : '#34D399', fontWeight: 800 }}>
                  {analysis.isMonorepo ? 'Monorepo' : 'Single Service'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={3}>
              <Paper style={{ backgroundColor: '#0F172A', padding: '12px', border: '1px solid #1E293B' }}>
                <Typography style={{ fontSize: '11px', color: '#94A3B8' }}>LANGUAGES</Typography>
                <Typography style={{ fontSize: '14px', color: '#38BDF8', fontWeight: 700 }}>
                  {analysis.detectedLanguages.join(', ') || 'HTML/JS'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box style={{ backgroundColor: '#0F172A', padding: '16px', borderRadius: '6px', marginBottom: '20px' }}>
            <Typography style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
              Detected Services ({analysis.detectedServices.length}):
            </Typography>
            {analysis.detectedServices.map((s: any, idx: number) => (
              <Box key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                <Chip label={s.name} size="small" style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }} />
                <Typography style={{ color: '#CBD5E1', fontSize: '13px' }}>
                  {s.type} {s.framework ? `(${s.framework})` : ''} • Port: {s.port || 80}
                </Typography>
              </Box>
            ))}
            {analysis.detectedDependencies.length > 0 && (
              <Box style={{ marginTop: '12px' }}>
                <Typography style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 700 }}>
                  Detected Infrastructure Dependencies: {analysis.detectedDependencies.join(', ')}
                </Typography>
              </Box>
            )}
          </Box>

          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(0)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(2)} style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}>
              Continue to Service Selection →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 3: SERVICES */}
      {activeStep === 2 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 3: Select Monorepo Services to Deploy
          </Typography>
          <Paper style={{ backgroundColor: '#0F172A', padding: '16px', marginBottom: '20px' }}>
            {analysis?.detectedServices?.map((s: any, idx: number) => (
              <Box key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #1E293B' }}>
                <Box>
                  <Typography style={{ color: '#F8FAFC', fontWeight: 700 }}>{s.name}</Typography>
                  <Typography style={{ color: '#94A3B8', fontSize: '12px' }}>Path: {s.path} • {s.type}</Typography>
                </Box>
                <Chip label="Selected for Deployment" style={{ backgroundColor: '#064E3B', color: '#34D399', fontWeight: 700 }} />
              </Box>
            ))}
          </Paper>
          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(1)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(3)} style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}>
              Continue to Target Selection →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 4: TARGET & CLOUD CREDENTIALS */}
      {activeStep === 3 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 4: Deployment Target & Cloud Credentials
          </Typography>
          <TextField
            select
            fullWidth
            label="Deployment Target Engine"
            value={target}
            onChange={(e) => setTarget(e.target.value as any)}
            variant="outlined"
            margin="normal"
            InputLabelProps={{ style: { color: '#9CA3AF' } }}
            InputProps={{ style: { color: '#F3F4F6' } }}
          >
            <MenuItem value="local-docker">Local Docker Container Engine</MenuItem>
            <MenuItem value="local-k8s">Local Kubernetes Cluster (Kind / Minikube)</MenuItem>
            <MenuItem value="aws-eks">AWS EKS Cloud Cluster</MenuItem>
            <MenuItem value="azure-aks">Azure AKS Cloud Cluster</MenuItem>
          </TextField>

          {target === 'aws-eks' && (
            <Paper style={{ backgroundColor: '#0F172A', padding: '16px', margin: '16px 0', border: '1px solid #0284C7' }}>
              <Typography style={{ color: '#38BDF8', fontWeight: 700, marginBottom: '8px' }}>
                🔑 AWS EKS Configuration Form (No .env file required!)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth label="AWS Region" value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="EKS Cluster Name" value={awsCluster} onChange={(e) => setAwsCluster(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="AWS Access Key ID" value={awsAccessKey} onChange={(e) => setAwsAccessKey(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="password" label="AWS Secret Access Key (Masked)" value={awsSecretKey} onChange={(e) => setAwsSecretKey(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
                </Grid>
              </Grid>
              <Box style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Button variant="outlined" onClick={handleTestCloudConnection} disabled={connTesting} style={{ color: '#38BDF8', borderColor: '#0284C7' }}>
                  {connTesting ? <CircularProgress size={16} /> : 'Test Connection'}
                </Button>
                {connTestResult && (
                  <Chip
                    icon={connTestResult.success ? <CheckIcon style={{ color: '#10B981' }} /> : <ErrorIcon style={{ color: '#EF4444' }} />}
                    label={connTestResult.message}
                    style={{ backgroundColor: connTestResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: connTestResult.success ? '#34D399' : '#F87171' }}
                  />
                )}
              </Box>
            </Paper>
          )}

          <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button onClick={() => setActiveStep(2)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(4)} style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}>
              Continue to Runtime Specs →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 5: RUNTIME SPECS */}
      {activeStep === 4 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 5: Runtime Configuration & Resources
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="Service Name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Kubernetes Namespace" value={namespace} onChange={(e) => setNamespace(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth type="number" label="Replicas" value={replicas} onChange={(e) => setReplicas(parseInt(e.target.value, 10))} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="CPU Request" value={cpuRequest} onChange={(e) => setCpuRequest(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="Memory Request" value={memoryRequest} onChange={(e) => setMemoryRequest(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Target Container Port" value={targetPort} onChange={(e) => setTargetPort(parseInt(e.target.value, 10))} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Health Check Probe Path" value={healthEndpoint} onChange={(e) => setHealthEndpoint(e.target.value)} variant="outlined" margin="dense" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Grid>
          </Grid>
          <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button onClick={() => setActiveStep(3)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(5)} style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}>
              Continue to Secrets & Config →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 6: SECRETS & CONFIGURATION */}
      {activeStep === 5 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 6: Application Secrets & Environment Variables (K8s Secret Injected)
          </Typography>
          
          <Typography style={{ color: '#CBD5E1', fontWeight: 700, marginBottom: '8px' }}>Secret Variables (Injected via K8s Secret):</Typography>
          {secrets.map((s, i) => (
            <Box key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <TextField label="Secret Key" value={s.key} onChange={(e) => { const next = [...secrets]; next[i].key = e.target.value; setSecrets(next); }} variant="outlined" size="small" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
              <TextField type="password" label="Secret Value (Masked)" value={s.value} onChange={(e) => { const next = [...secrets]; next[i].value = e.target.value; setSecrets(next); }} variant="outlined" size="small" style={{ flexGrow: 1 }} InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setSecrets([...secrets, { key: '', value: '' }])} style={{ color: '#38BDF8' }}>
            + Add Secret Variable
          </Button>

          <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button onClick={() => setActiveStep(4)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(6)} style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}>
              Continue to Strategy →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 7: STRATEGY */}
      {activeStep === 6 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 7: Deployment Rollout Strategy
          </Typography>
          <TextField
            select
            fullWidth
            label="Rollout Strategy"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            variant="outlined"
            margin="normal"
            InputLabelProps={{ style: { color: '#9CA3AF' } }}
            InputProps={{ style: { color: '#F3F4F6' } }}
          >
            <MenuItem value="rolling-update">Rolling Update (Zero Downtime)</MenuItem>
            <MenuItem value="recreate">Recreate (Clean Restart)</MenuItem>
            <MenuItem value="canary" disabled>Canary Rollout (Available when Istio/Argo active)</MenuItem>
          </TextField>

          <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button onClick={() => setActiveStep(5)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(7)} style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}>
              Review Deployment Plan →
            </Button>
          </Box>
        </Box>
      )}

      {/* STEP 8: REVIEW & DEPLOY */}
      {activeStep === 7 && (
        <Box>
          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginBottom: '12px' }}>
            Step 8: Review & Confirm Deployment Plan
          </Typography>
          <Paper style={{ backgroundColor: '#0F172A', padding: '16px', marginBottom: '20px' }}>
            <Typography style={{ color: '#F8FAFC', fontWeight: 700 }}>Service: {serviceName}</Typography>
            <Typography style={{ color: '#94A3B8', fontSize: '13px' }}>Repo: {repoUrl} ({branch})</Typography>
            <Typography style={{ color: '#94A3B8', fontSize: '13px' }}>Target: {target.toUpperCase()} • Namespace: {namespace}</Typography>
            <Typography style={{ color: '#94A3B8', fontSize: '13px' }}>Replicas: {replicas} • Port: {targetPort} • Health Path: {healthEndpoint}</Typography>
            <Typography style={{ color: '#34D399', fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>
              Secrets & Config: {secrets.length} Secret Key(s) ready for Kubernetes Secret Injection
            </Typography>
          </Paper>

          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setActiveStep(6)} style={{ color: '#9CA3AF' }}>← Back</Button>
            <Button
              variant="contained"
              onClick={handleFinalSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} style={{ color: '#FFF' }} /> : <CheckIcon />}
              style={{ backgroundColor: '#10B981', color: '#FFF', fontWeight: 800, padding: '10px 24px' }}
            >
              {loading ? 'Submitting Pipeline...' : 'CONFIRM & EXECUTE DEPLOYMENT 🚀'}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
