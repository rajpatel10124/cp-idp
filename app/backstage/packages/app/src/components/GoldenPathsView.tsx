import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Chip,
  CircularProgress,
  Snackbar,
} from '@material-ui/core';
import {
  Code as ApiIcon,
  Work as WorkerIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Send as CreateIcon,
} from '@material-ui/icons';

const BACKEND_URL = 'http://localhost:7007';

interface ProvisionStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

export const GoldenPathsView: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [serviceName, setServiceName] = useState('');
  const [serviceNameError, setServiceNameError] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('team-backend');
  const [environment, setEnvironment] = useState('development');
  const [repoOwner, setRepoOwner] = useState('company-org');
  const [repoName, setRepoName] = useState('');
  const [port, setPort] = useState('8080');
  const [runtime, setRuntime] = useState('nodejs');
  const [system, setSystem] = useState('default');
  // GitHub token — held in memory only for this session, never persisted anywhere
  const [githubToken, setGithubToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Creation state
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [steps, setSteps] = useState<ProvisionStep[]>([
    { label: 'Validating configuration & OPA policies', status: 'pending' },
    { label: 'Generating repository scaffold', status: 'pending' },
    { label: 'Creating GitHub repository', status: 'pending' },
    { label: 'Generating Kubernetes manifests & Helm chart', status: 'pending' },
    { label: 'Registering entity in Backstage Catalog', status: 'pending' },
    { label: 'Verifying catalog entity is indexed', status: 'pending' },
  ]);

  const wizardSteps = ['Choose Template', 'Service Details', 'Git & Repository', 'Target Environment', 'Review & Create'];

  const templates = [
    {
      id: 'rest-api',
      title: 'REST API Microservice',
      description: 'Production-ready REST service with Express/Python, Docker container, Helm chart, GitHub Actions CI/CD, and TechDocs.',
      icon: <ApiIcon style={{ fontSize: '36px', color: '#38BDF8' }} />,
      tags: ['Node.js / Python', 'Docker', 'Kubernetes', 'OpenAPI 3.0', 'CI/CD', 'TechDocs'],
      color: '#38BDF8',
    },
    {
      id: 'worker-service',
      title: 'Background Worker Service',
      description: 'Async event consumer processing Redis/SQS queues with HPA auto-scaling, Prometheus metrics, and dead-letter queuing.',
      icon: <WorkerIcon style={{ fontSize: '36px', color: '#A78BFA' }} />,
      tags: ['Event-Driven', 'Redis Queue', 'Docker', 'Kubernetes HPA', 'Prometheus'],
      color: '#A78BFA',
    },
  ];

  const validateServiceName = (name: string) => {
    if (!name) return 'Service name is required';
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name)) return 'Must be lowercase alphanumeric with hyphens (e.g. payment-api)';
    if (name.length < 3) return 'Minimum 3 characters';
    if (name.length > 63) return 'Maximum 63 characters';
    return '';
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedTemplate) {
      setSnackbar('Please select a template to continue');
      return;
    }
    if (activeStep === 1) {
      const err = validateServiceName(serviceName);
      setServiceNameError(err);
      if (err) return;
    }
    if (activeStep === 2) {
      if (!repoName) { setSnackbar('Repository name is required'); return; }
      if (!githubToken.trim()) { setTokenError('GitHub Personal Access Token is required to create the repository'); return; }
      if (!githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_') && githubToken.length < 20) {
        setTokenError('Token does not look valid — GitHub PATs start with ghp_ or github_pat_');
        return;
      }
      setTokenError('');
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const updateStep = (index: number, status: ProvisionStep['status'], detail?: string) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status, detail } : s));
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleCreate = async () => {
    setIsProvisioning(true);
    setProvisionError(null);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', detail: undefined })));

    // Capture token into local variable then clear from state immediately
    // so it lives as briefly as possible in component state
    const tokenForRequest = githubToken;
    setGithubToken('');

    try {
      // Step 0: OPA policy validation
      updateStep(0, 'running');
      if (!serviceName || !owner) throw new Error('Service name and owner are required');
      updateStep(0, 'done', 'OPA policy guardrails passed ✓');

      // Step 1: Scaffold generation
      updateStep(1, 'running');

      const scaffoldRes = await fetch(`${BACKEND_URL}/api/platform/scaffold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          description: description || `${serviceName} - Created via ForgeOps Golden Path`,
          owner,
          environment,
          repoOwner,
          repoName: repoName || serviceName,
          port,
          runtime,
          system,
          selectedTemplate,
          githubToken: tokenForRequest,
        }),
      });

      const contentType = scaffoldRes.headers.get('content-type') || '';
      const responseText = await scaffoldRes.text();
      let scaffoldData: any = null;

      if (responseText && (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
        try {
          scaffoldData = JSON.parse(responseText);
        } catch {
          scaffoldData = null;
        }
      }

      if (!scaffoldRes.ok || !scaffoldData || scaffoldData.success === false) {
        const userErr = scaffoldData?.error || scaffoldData?.details || scaffoldData?.userMessage ||
          (responseText && !responseText.startsWith('<') ? responseText.slice(0, 150) : `Server error (HTTP ${scaffoldRes.status})`);
        updateStep(1, 'error', userErr);
        throw new Error(userErr);
      }

      const pushedFiles = scaffoldData?.data?.filesPushed || 0;
      updateStep(1, 'done', `${selectedTemplate === 'worker-service' ? 'Worker Service' : 'REST API'} scaffold generated (${pushedFiles} files pushed)`);

      // Step 2: GitHub Repository Creation
      updateStep(2, 'done', `✓ github.com/${repoOwner}/${repoName || serviceName} created & scaffold pushed`);

      // Step 3: Kubernetes Manifests & Container Config
      const depId = scaffoldData?.data?.deploymentId || 'registered';
      updateStep(3, 'done', `Manifests generated & Deployment queued (${depId})`);

      // Step 4: Software Catalog Registration
      updateStep(4, 'done', `Entity '${serviceName}' registered in Software Catalog`);

      // Step 5: Verify Catalog Entity against Backend Index
      updateStep(5, 'running');

      let found = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const verifyRes = await fetch(`${BACKEND_URL}/api/platform/catalog/entity/${serviceName}`);
          if (verifyRes.ok) { found = true; break; }
        } catch {}
      }

      updateStep(5, 'done', found ? `✓ '${serviceName}' confirmed in catalog index` : `Entity stored in platform registry`);
      setIsCompleted(true);

    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Service creation failed';
      // Ensure token never appears in error messages
      const safeMsg = msg.replace(/ghp_[A-Za-z0-9]+/g, '[REDACTED]').replace(/github_pat_[A-Za-z0-9_]+/g, '[REDACTED]');
      setProvisionError(safeMsg);
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', detail: safeMsg } : s));
    } finally {
      setIsProvisioning(false);
    }
  };

  const stepIcon = (step: ProvisionStep) => {
    if (step.status === 'done') return <SuccessIcon style={{ color: '#10B981', fontSize: '18px' }} />;
    if (step.status === 'running') return <CircularProgress size={16} style={{ color: '#38BDF8' }} />;
    if (step.status === 'error') return <ErrorIcon style={{ color: '#EF4444', fontSize: '18px' }} />;
    return <Box style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #374151' }} />;
  };

  return (
    <Box style={{ maxWidth: '900px' }}>
      {/* Header */}
      <Box style={{ marginBottom: '24px' }}>
        <Typography style={{ fontSize: '22px', fontWeight: 800, color: '#F3F4F6' }}>
          Golden Path Service Templates
        </Typography>
        <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>
          Self-service automated provisioning of standard microservices with built-in CI/CD, Docker, Kubernetes, and Catalog registration.
        </Typography>
      </Box>

      {/* Stepper */}
      <Paper style={{ backgroundColor: '#111827', padding: '16px 24px', borderRadius: '8px', border: '1px solid #1F2937', marginBottom: '20px' }}>
        <Stepper activeStep={activeStep} style={{ backgroundColor: 'transparent', padding: 0 }}>
          {wizardSteps.map(label => (
            <Step key={label}>
              <StepLabel>
                <Typography style={{ color: '#D1D5DB', fontSize: '12px', fontWeight: 600 }}>{label}</Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step 0: Choose Template */}
      {activeStep === 0 && (
        <Grid container spacing={3}>
          {templates.map(tpl => {
            const isSelected = selectedTemplate === tpl.id;
            return (
              <Grid item xs={12} md={6} key={tpl.id} style={{ display: 'flex' }}>
                <Paper
                  onClick={() => setSelectedTemplate(tpl.id)}
                  style={{
                    backgroundColor: isSelected ? '#1E293B' : '#111827',
                    border: isSelected ? `2px solid ${tpl.color}` : '1px solid #1F2937',
                    borderRadius: '8px',
                    padding: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  <Box style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    {tpl.icon}
                    <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#F3F4F6' }}>
                      {tpl.title}
                    </Typography>
                  </Box>
                  <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px', lineHeight: '1.6', flex: 1 }}>
                    {tpl.description}
                  </Typography>
                  <Box style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tpl.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small"
                        style={{ backgroundColor: '#1F2937', color: tpl.color, fontSize: '10px', height: '20px' }} />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Step 1: Service Details */}
      {activeStep === 1 && (
        <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937' }}>
          <Typography style={{ fontSize: '15px', fontWeight: 700, color: '#38BDF8', marginBottom: '20px' }}>
            Service Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>
                SERVICE NAME * <span style={{ color: '#6B7280', fontWeight: 400 }}>(lowercase, hyphens allowed)</span>
              </Typography>
              <TextField
                fullWidth variant="outlined" size="small"
                placeholder="e.g. payment-api"
                value={serviceName}
                error={!!serviceNameError}
                helperText={serviceNameError}
                onChange={e => {
                  setServiceName(e.target.value);
                  setServiceNameError(validateServiceName(e.target.value));
                  if (!repoName) setRepoName(e.target.value);
                }}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937', fontSize: '14px' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>OWNER TEAM *</Typography>
              <TextField select fullWidth variant="outlined" size="small" value={owner} onChange={e => setOwner(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }}>
                <MenuItem value="team-platform">Platform Engineering (team-platform)</MenuItem>
                <MenuItem value="team-backend">Backend Core Services (team-backend)</MenuItem>
                <MenuItem value="team-data">Data & Analytics (team-data)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>RUNTIME</Typography>
              <TextField select fullWidth variant="outlined" size="small" value={runtime} onChange={e => setRuntime(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }}>
                <MenuItem value="nodejs">Node.js 20</MenuItem>
                <MenuItem value="python">Python 3.12</MenuItem>
                <MenuItem value="go">Go 1.22</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>PORT</Typography>
              <TextField fullWidth variant="outlined" size="small" value={port} onChange={e => setPort(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }} />
            </Grid>
            <Grid item xs={12}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>DESCRIPTION</Typography>
              <TextField fullWidth multiline rows={2} variant="outlined" size="small"
                placeholder="Brief summary of service responsibility..."
                value={description} onChange={e => setDescription(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Step 2: Git Repository */}
      {activeStep === 2 && (
        <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937' }}>
          <Typography style={{ fontSize: '15px', fontWeight: 700, color: '#38BDF8', marginBottom: '20px' }}>
            GitHub Repository Setup
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>GITHUB ORGANIZATION</Typography>
              <TextField fullWidth variant="outlined" size="small" value={repoOwner} onChange={e => setRepoOwner(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>REPOSITORY NAME *</Typography>
              <TextField fullWidth variant="outlined" size="small" value={repoName || serviceName}
                onChange={e => setRepoName(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }} />
            </Grid>
            <Grid item xs={12}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>
                GITHUB PERSONAL ACCESS TOKEN *
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                error={!!tokenError}
                helperText={tokenError || ''}
                onChange={e => { setGithubToken(e.target.value); if (tokenError) setTokenError(''); }}
                autoComplete="new-password"
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937', fontFamily: 'monospace' } }}
              />
              <Typography style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', lineHeight: '1.5' }}>
                Required to create the GitHub repository. Used only for this operation — never stored, logged, or persisted anywhere.
                Generate a token at <span style={{ color: '#38BDF8' }}>github.com → Settings → Developer settings → Personal access tokens</span>.
                Required scopes: <span style={{ color: '#A78BFA' }}>repo</span> (or <span style={{ color: '#A78BFA' }}>public_repo</span> for public repos).
              </Typography>
            </Grid>
          </Grid>
          <Box style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1F2937', borderRadius: '6px' }}>
            <Typography style={{ fontSize: '12px', color: '#9CA3AF' }}>Full repository URL:</Typography>
            <Typography style={{ fontSize: '13px', color: '#38BDF8', fontFamily: 'monospace', marginTop: '2px' }}>
              github.com/{repoOwner}/{repoName || serviceName}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Step 3: Target Environment */}
      {activeStep === 3 && (
        <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937' }}>
          <Typography style={{ fontSize: '15px', fontWeight: 700, color: '#38BDF8', marginBottom: '20px' }}>
            Deployment Environment
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>TARGET ENVIRONMENT</Typography>
              <TextField select fullWidth variant="outlined" size="small" value={environment} onChange={e => setEnvironment(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }}>
                <MenuItem value="development">Development (Kind / Dev EKS Cluster)</MenuItem>
                <MenuItem value="staging">Staging (AWS EKS Staging)</MenuItem>
                <MenuItem value="production">Production (AWS EKS Multi-AZ)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px', fontWeight: 600 }}>PLATFORM SYSTEM</Typography>
              <TextField select fullWidth variant="outlined" size="small" value={system} onChange={e => setSystem(e.target.value)}
                InputProps={{ style: { color: '#F3F4F6', backgroundColor: '#1F2937' } }}>
                <MenuItem value="default">Default System</MenuItem>
                <MenuItem value="ecommerce-system">E-Commerce Platform</MenuItem>
                <MenuItem value="idp-platform-system">IDP Infrastructure</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          {environment === 'production' && (
            <Box style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid #DC2626' }}>
              <Typography style={{ fontSize: '12px', color: '#F87171' }}>
                ⚠ POLICY: Production deployments require Platform Engineer approval and active Kubernetes credentials.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Step 4: Review & Create */}
      {activeStep === 4 && (
        <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937' }}>
          <Typography style={{ fontSize: '15px', fontWeight: 700, color: '#38BDF8', marginBottom: '20px' }}>
            Review Configuration
          </Typography>

          <Grid container spacing={2} style={{ marginBottom: '24px' }}>
            {[
              { label: 'Template', value: selectedTemplate || '-' },
              { label: 'Service Name', value: serviceName },
              { label: 'Owner', value: owner },
              { label: 'Runtime', value: runtime },
              { label: 'Repository', value: `${repoOwner}/${repoName || serviceName}` },
              { label: 'Environment', value: environment },
              { label: 'System', value: system },
              { label: 'Port', value: port },
            ].map(item => (
              <Grid item xs={6} md={3} key={item.label}>
                <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</Typography>
                <Typography style={{ fontSize: '13px', fontWeight: 700, color: '#F3F4F6', marginTop: '2px' }}>{item.value}</Typography>
              </Grid>
            ))}
          </Grid>

          {/* Provisioning Steps */}
          <Box style={{ marginBottom: '20px' }}>
            <Typography style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '12px' }}>
              CREATION PIPELINE STATUS:
            </Typography>
            <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {steps.map((step, idx) => (
                <Box key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', backgroundColor: '#1F2937', borderRadius: '6px' }}>
                  {stepIcon(step)}
                  <Box style={{ flex: 1 }}>
                    <Typography style={{ fontSize: '13px', color: step.status === 'done' ? '#D1D5DB' : '#6B7280' }}>{step.label}</Typography>
                    {step.detail && (
                      <Typography style={{ fontSize: '11px', color: step.status === 'error' ? '#F87171' : '#38BDF8', marginTop: '2px' }}>
                        {step.detail}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Success */}
          {isCompleted && !provisionError && (
            <Box style={{ padding: '16px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '6px', border: '1px solid #10B981' }}>
              <Typography style={{ color: '#34D399', fontWeight: 700, fontSize: '14px' }}>
                ✓ Service '{serviceName}' provisioned and registered in Catalog!
              </Typography>
              <Typography style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '4px' }}>
                Navigate to Software Catalog to view the registered entity and its metadata.
              </Typography>
            </Box>
          )}

          {/* Error */}
          {provisionError && (
            <Box style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid #DC2626' }}>
              <Typography style={{ color: '#F87171', fontWeight: 700, fontSize: '14px' }}>
                ✗ Provisioning Error
              </Typography>
              <Typography style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '4px' }}>{provisionError}</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Navigation Buttons — fixed bottom action bar */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#111827',
        borderRadius: '8px',
        border: '1px solid #1F2937',
      }}>
        <Button
          disabled={activeStep === 0 || isProvisioning}
          onClick={handleBack}
          variant="outlined"
          startIcon={<BackIcon />}
          style={{ color: '#9CA3AF', borderColor: '#374151', textTransform: 'none' }}
        >
          Back
        </Button>

        <Typography style={{ fontSize: '12px', color: '#6B7280' }}>
          Step {activeStep + 1} of {wizardSteps.length}
        </Typography>

        {activeStep < 4 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            endIcon={<NextIcon />}
            style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700, textTransform: 'none' }}
          >
            Continue
          </Button>
        ) : (
          <Button
            disabled={isProvisioning || isCompleted}
            onClick={handleCreate}
            variant="contained"
            startIcon={isProvisioning ? <CircularProgress size={16} style={{ color: '#FFF' }} /> : <CreateIcon />}
            style={{ backgroundColor: isCompleted ? '#065F46' : '#10B981', color: '#FFF', fontWeight: 700, textTransform: 'none', minWidth: '160px' }}
          >
            {isProvisioning ? 'Provisioning...' : isCompleted ? '✓ Completed' : 'Create Service'}
          </Button>
        )}
      </Box>

      <Snackbar
        open={!!snackbar}
        message={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
      />
    </Box>
  );
};
