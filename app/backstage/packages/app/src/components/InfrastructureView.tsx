import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
} from '@material-ui/core';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Storage as K8sIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CloudQueue as CloudIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface EnvironmentRecord {
  id: string;
  name: string;
  environment: string;
  cluster: string;
  namespace: string;
  status: string;
  createdBy: string;
  createdAt: string;
  servicesCount: number;
}

interface Workload {
  name: string;
  ready: string;
  restarts: number;
  status: string;
  cpu: string;
  memory: string;
}

export const InfrastructureView: React.FC = () => {
  const [environments, setEnvironments] = useState<EnvironmentRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create environment state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envType, setEnvType] = useState('development');
  const [clusterTarget, setClusterTarget] = useState('Minikube / Local Kubernetes');
  const [creating, setCreating] = useState(false);

  // Environment details state
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentRecord | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Terraform state
  const [tfExecuting, setTfExecuting] = useState(false);
  const [tfLogs, setTfLogs] = useState<string>('Terraform Provisioner Engine initialized. Ready to execute HCL operations.');

  const fetchInfrastructureData = async () => {
    setLoading(true);
    try {
      const envData = await fetchJson(`${BACKEND_URL}/api/platform/environments`, {}, 5000);
      if (envData?.success && Array.isArray(envData.environments)) {
        setEnvironments(envData.environments);
      }
      const diagData = await fetchJson(`${BACKEND_URL}/api/platform/diagnostics`, {}, 5000);
      if (diagData?.diagnostics) {
        setDiagnostics(diagData.diagnostics);
      }
    } catch (err: any) {
      console.warn('Infrastructure API fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfrastructureData();
  }, []);

  const handleCreateEnvironment = async () => {
    if (!envName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: envName,
          environment: envType,
          cluster: clusterTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create environment');

      setCreateDialogOpen(false);
      setEnvName('');
      fetchInfrastructureData();
    } catch (err: any) {
      alert(`Environment Creation Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEnvironment = async (id: string, ns: string) => {
    if (!window.confirm(`Are you sure you want to delete environment namespace '${ns}'?`)) return;
    try {
      await fetch(`${BACKEND_URL}/api/platform/environments/${id}`, { method: 'DELETE' });
      fetchInfrastructureData();
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  const handleOpenDetails = async (env: EnvironmentRecord) => {
    setSelectedEnv(env);
    setDetailsDialogOpen(true);
    setLoadingDetails(true);
    try {
      const detailsData = await fetchJson(`${BACKEND_URL}/api/platform/environments/${env.namespace}/details`, {}, 5000);
      if (detailsData?.workloads) {
        setWorkloads(detailsData.workloads);
      }
    } catch {
      setWorkloads([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const runTerraformAction = async (action: 'validate' | 'plan' | 'apply' | 'destroy') => {
    setTfExecuting(true);
    setTfLogs(`Executing 'terraform ${action}' on stack 'infrastructure/terraform/environments/dev'...\n--------------------------------------------------\n`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/terraform/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, environment: 'dev' }),
      });
      const data = await res.json();
      setTfLogs((prev) => prev + (data.output || data.error || 'Operation complete.'));
    } catch (err: any) {
      setTfLogs((prev) => prev + `Terraform Execution Error: ${err.message}`);
    } finally {
      setTfExecuting(false);
    }
  };

  return (
    <Box style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <Box>
          <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
            Kubernetes Environments & Terraform IaC
          </Typography>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Managed Kubernetes environment namespaces, cluster topology, workload details, and Terraform infrastructure stacks.
          </Typography>
        </Box>

        <Box style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="outlined"
            onClick={fetchInfrastructureData}
            startIcon={<RefreshIcon />}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Probe Infrastructure
          </Button>

          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
            startIcon={<K8sIcon />}
            style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700, textTransform: 'none' }}
          >
            Provision Environment
          </Button>
        </Box>
      </Box>

      {/* Target Topology Cards */}
      <Grid container spacing={3} style={{ marginBottom: '28px' }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Docker Container Engine</Typography>
            <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#38BDF8', marginTop: '8px' }}>Local Docker</Typography>
            <Chip label="Active Container Target" size="small" style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', marginTop: '8px', fontWeight: 700 }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Kubernetes Cluster</Typography>
            <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#34D399', marginTop: '8px' }}>Minikube / Kind</Typography>
            <Chip label="Local Kubernetes" size="small" style={{ backgroundColor: '#1F2937', color: '#9CA3AF', marginTop: '8px', fontWeight: 600 }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Cloud Target Adapter</Typography>
            <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#FBBF24', marginTop: '8px' }}>AWS EKS / Azure AKS</Typography>
            <Chip label="Production Adapter" size="small" style={{ backgroundColor: '#1F2937', color: '#FBBF24', marginTop: '8px', fontWeight: 600 }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Terraform IaC Module</Typography>
            <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#A78BFA', marginTop: '8px' }}>AWS S3 / VPC / RDS</Typography>
            <Chip label="HCL Automation" size="small" style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA', marginTop: '8px', fontWeight: 600 }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Kubernetes Environments Table */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '24px', marginBottom: '28px' }}>
        <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6', marginBottom: '16px' }}>
          Kubernetes Managed Environments & Namespaces
        </Typography>

        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <CircularProgress style={{ color: '#38BDF8' }} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Environment Name</TableCell>
                <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Kubernetes Cluster</TableCell>
                <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Namespace</TableCell>
                <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Status</TableCell>
                <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {environments.map((env) => (
                <TableRow key={env.id} style={{ borderBottom: '1px solid #1F2937' }}>
                  <TableCell style={{ color: '#F3F4F6', fontWeight: 700 }}>{env.name}</TableCell>
                  <TableCell style={{ color: '#D1D5DB' }}>{env.cluster}</TableCell>
                  <TableCell>
                    <Chip label={env.namespace} size="small" style={{ backgroundColor: '#1E293B', color: '#38BDF8', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={env.status} size="small" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#34D399', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Box style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        size="small"
                        onClick={() => handleOpenDetails(env)}
                        startIcon={<ViewIcon />}
                        style={{ color: '#38BDF8', textTransform: 'none', fontWeight: 700 }}
                      >
                        Details
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleDeleteEnvironment(env.id, env.namespace)}
                        startIcon={<DeleteIcon />}
                        style={{ color: '#EF4444', textTransform: 'none', fontWeight: 700 }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Terraform Provisioning Console */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '24px' }}>
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Box>
            <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6' }}>
              Terraform Cloud Infrastructure Provisioner
            </Typography>
            <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
              HCL validation, plan generation, and cloud resource provisioning for <code>infrastructure/terraform/environments/dev</code>.
            </Typography>
          </Box>
          <Box style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outlined"
              size="small"
              disabled={tfExecuting}
              onClick={() => runTerraformAction('validate')}
              style={{ color: '#38BDF8', borderColor: '#38BDF8', textTransform: 'none', fontWeight: 700 }}
            >
              Validate
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={tfExecuting}
              onClick={() => runTerraformAction('plan')}
              style={{ backgroundColor: '#0284C7', color: '#FFF', textTransform: 'none', fontWeight: 700 }}
            >
              Plan
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={tfExecuting}
              onClick={() => runTerraformAction('apply')}
              style={{ backgroundColor: '#10B981', color: '#FFF', textTransform: 'none', fontWeight: 700 }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={tfExecuting}
              onClick={() => runTerraformAction('destroy')}
              style={{ color: '#EF4444', borderColor: '#EF4444', textTransform: 'none', fontWeight: 700 }}
            >
              Destroy
            </Button>
          </Box>
        </Box>

        <Box
          style={{
            backgroundColor: '#090D16',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #1F2937',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#34D399',
            maxHeight: '260px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {tfExecuting && <CircularProgress size={14} style={{ color: '#38BDF8', marginRight: '8px' }} />}
          {tfLogs}
        </Box>
      </Paper>

      {/* Dialog: Create Environment */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle style={{ backgroundColor: '#111827', color: '#F3F4F6', fontWeight: 800 }}>
          Provision Kubernetes Environment
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#111827' }}>
          <TextField
            label="Namespace / Environment Name"
            placeholder="e.g. forgeops-staging"
            fullWidth
            variant="outlined"
            size="small"
            value={envName}
            onChange={(e) => setEnvName(e.target.value)}
            style={{ marginBottom: '16px', backgroundColor: '#1F2937', borderRadius: '4px' }}
            InputProps={{ style: { color: '#F3F4F6' } }}
            InputLabelProps={{ style: { color: '#9CA3AF' } }}
          />

          <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px', fontWeight: 600 }}>
            Environment Type
          </Typography>
          <Select
            value={envType}
            onChange={(e) => setEnvType(e.target.value as string)}
            fullWidth
            variant="outlined"
            size="small"
            style={{ marginBottom: '16px', backgroundColor: '#1F2937', color: '#F3F4F6' }}
          >
            <MenuItem value="development">Development</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="production">Production</MenuItem>
          </Select>

          <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px', fontWeight: 600 }}>
            Cluster Target
          </Typography>
          <Select
            value={clusterTarget}
            onChange={(e) => setClusterTarget(e.target.value as string)}
            fullWidth
            variant="outlined"
            size="small"
            style={{ backgroundColor: '#1F2937', color: '#F3F4F6' }}
          >
            <MenuItem value="Minikube / Local Kubernetes">Minikube / Local Cluster</MenuItem>
            <MenuItem value="Kind Cluster (forgeops)">Kind Cluster</MenuItem>
            <MenuItem value="AWS EKS Cluster (forgeops-prod)">AWS EKS</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#111827', padding: '16px' }}>
          <Button onClick={() => setCreateDialogOpen(false)} style={{ color: '#9CA3AF' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateEnvironment}
            disabled={creating}
            variant="contained"
            style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700 }}
          >
            {creating ? <CircularProgress size={16} style={{ color: '#FFF' }} /> : 'Provision Namespace'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Environment Details */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ backgroundColor: '#111827', color: '#F3F4F6', fontWeight: 800 }}>
          Environment Details: {selectedEnv?.name} ({selectedEnv?.namespace})
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#111827' }}>
          <Box style={{ marginBottom: '20px' }}>
            <Typography style={{ color: '#9CA3AF', fontSize: '13px' }}>
              Cluster: <strong style={{ color: '#F3F4F6' }}>{selectedEnv?.cluster}</strong> | Created By:{' '}
              <strong style={{ color: '#F3F4F6' }}>{selectedEnv?.createdBy}</strong>
            </Typography>
          </Box>

          <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#F3F4F6', marginBottom: '12px' }}>
            Active Workloads & Pods
          </Typography>

          {loadingDetails ? (
            <CircularProgress style={{ color: '#38BDF8' }} />
          ) : workloads.length === 0 ? (
            <Typography style={{ color: '#9CA3AF', fontSize: '13px' }}>No active workloads running in namespace.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Workload / Pod</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Ready</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Restarts</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Status</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>CPU</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Memory</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workloads.map((w) => (
                  <TableRow key={w.name} style={{ borderBottom: '1px solid #1F2937' }}>
                    <TableCell style={{ color: '#38BDF8', fontWeight: 600 }}>{w.name}</TableCell>
                    <TableCell style={{ color: '#D1D5DB' }}>{w.ready}</TableCell>
                    <TableCell style={{ color: '#D1D5DB' }}>{w.restarts}</TableCell>
                    <TableCell>
                      <Chip label={w.status} size="small" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#34D399', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell style={{ color: '#D1D5DB' }}>{w.cpu}</TableCell>
                    <TableCell style={{ color: '#D1D5DB' }}>{w.memory}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#111827', padding: '16px' }}>
          <Button onClick={() => setDetailsDialogOpen(false)} style={{ color: '#38BDF8', fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
