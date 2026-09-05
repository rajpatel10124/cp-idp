import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  CheckCircle as SuccessIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon,
  OpenInNew as LaunchIcon,
  CloudUpload as DeployIcon,
  Refresh as RefreshIcon,
  DeleteForever as DeleteIcon,
  Replay as RedeployIcon,
  Undo as RollbackIcon,
} from '@material-ui/icons';
import { NewDeploymentWizard } from './NewDeploymentWizard';
import { BACKEND_URL } from '../apiClient';
import { ServiceDeleteModal } from './ServiceDeleteModal';

interface Deployment {
  id: string;
  serviceName: string;
  repoUrl?: string;
  environment: string;
  status: string;
  createdAt: string;
  commitSha?: string;
  commitMsg?: string;
  owner?: string;
  duration?: string;
  appType?: string;
  endpoint?: string;
  target?: string;
  logs?: string[];
  error?: string;
}

export const DeploymentsView: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<{ id: string; logs: string[] } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Deployment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/deployments`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/capabilities`);
      if (res.ok) {
        setCapabilities(await res.json());
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchDeployments();
    fetchCapabilities();
    const interval = setInterval(fetchDeployments, 3000);
    return () => clearInterval(interval);
  }, [fetchDeployments, fetchCapabilities]);

  const handleRedeploy = async (id: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/platform/deployments/${id}/redeploy`, { method: 'POST' });
      fetchDeployments();
    } catch (err) {
      console.error('Redeploy failed:', err);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/platform/deployments/${id}/rollback`, { method: 'POST' });
      fetchDeployments();
    } catch (err) {
      console.error('Rollback failed:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${BACKEND_URL}/api/platform/deployments/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchDeployments();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'Healthy':
        return <Chip icon={<SuccessIcon style={{ color: '#10B981', fontSize: '14px' }} />} label="Healthy" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#34D399', fontWeight: 600 }} />;
      case 'FAILED':
        return <Chip icon={<ErrorIcon style={{ color: '#EF4444', fontSize: '14px' }} />} label="Failed" size="small" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#F87171', fontWeight: 600 }} />;
      case 'DELETED':
        return <Chip label="Deleted" size="small" style={{ backgroundColor: '#1E293B', color: '#64748B', fontWeight: 600 }} />;
      default:
        return <Chip icon={<PendingIcon style={{ color: '#F59E0B', fontSize: '14px' }} />} label={status || 'In Progress'} size="small" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#FBBF24', fontWeight: 600 }} />;
    }
  };

  if (wizardOpen) {
    return (
      <NewDeploymentWizard
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          setWizardOpen(false);
          fetchDeployments();
        }}
      />
    );
  }

  return (
    <Box>
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Box>
          <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
            Deployment Control Plane & Workloads
          </Typography>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Real GitOps deployment engine supporting public/private GitHub repos, multi-stage builds, cloud credentials & deletion.
          </Typography>
        </Box>
        <Box style={{ display: 'flex', gap: '12px' }}>
          <IconButton onClick={fetchDeployments} style={{ color: '#9CA3AF', backgroundColor: '#1F2937' }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<DeployIcon />}
            onClick={() => setWizardOpen(true)}
            style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700, textTransform: 'none' }}
          >
            New Deployment Wizard
          </Button>
        </Box>
      </Box>

      {/* Integration Capabilities Bar */}
      {capabilities && (
        <Box style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Chip label="Public Git: Tokenless Active" size="small" style={{ backgroundColor: '#064E3B', color: '#34D399', fontWeight: 600 }} />
          <Chip label="Docker Engine: Ready" size="small" style={{ backgroundColor: '#064E3B', color: '#34D399', fontWeight: 600 }} />
          <Chip label="Local K8s: Active" size="small" style={{ backgroundColor: '#064E3B', color: '#34D399', fontWeight: 600 }} />
          <Chip label="AWS EKS: Configurable" size="small" style={{ backgroundColor: '#1E293B', color: '#38BDF8', fontWeight: 600 }} />
          <Chip label="Azure AKS: Configurable" size="small" style={{ backgroundColor: '#1E293B', color: '#38BDF8', fontWeight: 600 }} />
        </Box>
      )}

      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '20px' }}>
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress style={{ color: '#38BDF8' }} />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>Deployment ID</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>Service Name</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>App Type</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>Target</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>Status</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>Endpoint</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deployments.map((dep) => (
                <TableRow key={dep.id} style={{ borderBottom: '1px solid #1F2937' }}>
                  <TableCell style={{ color: '#38BDF8', fontFamily: 'monospace', fontWeight: 700 }}>{dep.id}</TableCell>
                  <TableCell style={{ color: '#F3F4F6', fontWeight: 700 }}>{dep.serviceName}</TableCell>
                  <TableCell style={{ color: '#CBD5E1', fontSize: '13px' }}>{dep.appType || 'Web App'}</TableCell>
                  <TableCell style={{ color: '#9CA3AF', fontSize: '12px' }}>
                    <Chip label={dep.target || 'local'} size="small" style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontSize: '11px' }} />
                  </TableCell>
                  <TableCell>{getStatusChip(dep.status)}</TableCell>
                  <TableCell>
                    {dep.endpoint && dep.status === 'SUCCESS' ? (
                      <Button
                        size="small"
                        component="a"
                        href={dep.endpoint}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<LaunchIcon style={{ fontSize: '14px' }} />}
                        style={{ color: '#38BDF8', textTransform: 'none', fontSize: '12px', fontWeight: 700 }}
                      >
                        Open App ({dep.endpoint.replace('http://localhost:', ':')})
                      </Button>
                    ) : (
                      <Typography style={{ color: '#64748B', fontSize: '12px' }}>Not exposed</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box style={{ display: 'flex', gap: '6px' }}>
                      {dep.logs && dep.logs.length > 0 && (
                        <Button size="small" variant="outlined" onClick={() => setSelectedLogs({ id: dep.id, logs: dep.logs || [] })} style={{ color: '#94A3B8', borderColor: '#334155', fontSize: '11px', textTransform: 'none' }}>
                          Logs
                        </Button>
                      )}
                      <Tooltip title="Redeploy Service">
                        <IconButton size="small" onClick={() => handleRedeploy(dep.id)} style={{ color: '#38BDF8' }}>
                          <RedeployIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rollback Workload">
                        <IconButton size="small" onClick={() => handleRollback(dep.id)} style={{ color: '#F59E0B' }}>
                          <RollbackIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Workload & Clean Resources">
                        <IconButton size="small" onClick={() => setDeleteTarget(dep)} style={{ color: '#EF4444' }}>
                          <DeleteIcon style={{ fontSize: '16px' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Logs Dialog */}
      <Dialog open={Boolean(selectedLogs)} onClose={() => setSelectedLogs(null)} maxWidth="md" fullWidth>
        <DialogTitle style={{ backgroundColor: '#111827', color: '#F3F4F6', borderBottom: '1px solid #1F2937' }}>
          📋 Deployment Execution Logs — {selectedLogs?.id}
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#0F172A', color: '#38BDF8', fontFamily: 'monospace', padding: '16px' }}>
          <Box style={{ backgroundColor: '#020617', padding: '16px', borderRadius: '6px', maxHeight: '400px', overflowY: 'auto' }}>
            {selectedLogs?.logs?.map((log, idx) => (
              <Typography key={idx} style={{ fontFamily: 'monospace', fontSize: '13px', color: '#E2E8F0', marginBottom: '4px' }}>
                {log}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#111827', padding: '12px 24px' }}>
          <Button onClick={() => setSelectedLogs(null)} style={{ color: '#38BDF8', fontWeight: 700 }}>
            Close Logs
          </Button>
        </DialogActions>
      </Dialog>

      {/* Real Cloud Resource Deletion Lifecycle Modal */}
      {deleteTarget && (
        <ServiceDeleteModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          serviceName={deleteTarget.serviceName || deleteTarget.id}
          environment={deleteTarget.environment || 'development'}
          onDeleted={fetchDeployments}
        />
      )}
    </Box>
  );
};
