import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Chip,
  CircularProgress,
  Divider,
} from '@material-ui/core';
import {
  DeleteForever as DeleteIcon,
  Security as ShieldIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarnIcon,
} from '@material-ui/icons';

const BACKEND_URL = 'http://localhost:7007';

export interface ServiceDeleteModalProps {
  open: boolean;
  onClose: () => void;
  serviceName: string;
  environment?: string;
  onDeleted?: () => void;
}

export const ServiceDeleteModal: React.FC<ServiceDeleteModalProps> = ({
  open,
  onClose,
  serviceName,
  environment = 'development',
  onDeleted,
}) => {
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionResult, setDeletionResult] = useState<any>(null);
  const [githubToken, setGithubToken] = useState('');

  useEffect(() => {
    if (open && serviceName) {
      setConfirmInput('');
      setDeletionResult(null);
      setLoadingPlan(true);
      fetch(`${BACKEND_URL}/api/platform/lifecycle/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, environment }),
      })
        .then(r => r.json())
        .then(data => {
          setPlan(data);
        })
        .catch(err => {
          console.error('Failed to discover service resources:', err);
        })
        .finally(() => setLoadingPlan(false));
    }
  }, [open, serviceName, environment]);

  const isConfirmed = confirmInput.trim().toLowerCase() === serviceName.trim().toLowerCase();

  const handleExecuteDeletion = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/lifecycle/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          environment,
          confirmationName: confirmInput,
          githubToken: githubToken || undefined,
        }),
      });
      const data = await res.json();
      setDeletionResult(data);
      if (onDeleted) onDeleted();
    } catch (err: any) {
      setDeletionResult({
        success: false,
        status: 'FAILED',
        error: err.message || 'Deletion execution failed',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle style={{ backgroundColor: '#0D1117', color: '#F0F6FC', fontWeight: 800 }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DeleteIcon style={{ color: '#EF4444', fontSize: 24 }} />
          <Typography style={{ fontSize: 18, fontWeight: 800, color: '#F0F6FC' }}>
            Delete Service: {serviceName}
          </Typography>
          <Chip
            label={environment}
            size="small"
            style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', fontWeight: 700, marginLeft: 'auto' }}
          />
        </Box>
      </DialogTitle>

      <DialogContent style={{ backgroundColor: '#0D1117', color: '#C9D1D9' }}>
        {loadingPlan ? (
          <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
            <CircularProgress style={{ color: '#EF4444', marginBottom: 16 }} />
            <Typography style={{ color: '#8B949E', fontSize: 14 }}>
              Discovering owned cloud & Kubernetes resources...
            </Typography>
          </Box>
        ) : deletionResult ? (
          /* Deletion Result & Stepper View */
          <Box style={{ padding: '12px 0' }}>
            <Box
              style={{
                backgroundColor: deletionResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${deletionResult.success ? '#10B981' : '#EF4444'}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Typography style={{ fontSize: 16, fontWeight: 800, color: deletionResult.success ? '#10B981' : '#EF4444' }}>
                {deletionResult.success ? '✓ Service & Real Cloud Resources Permanently Deleted' : '⚠️ Partial Deletion Completed'}
              </Typography>
              <Typography style={{ fontSize: 13, color: '#8B949E', marginTop: 4 }}>
                Target Environment: <strong>{environment}</strong> | Status: <strong>{deletionResult.status}</strong>
              </Typography>
            </Box>

            <Typography style={{ fontSize: 14, fontWeight: 700, color: '#F0F6FC', marginBottom: 12 }}>
              Lifecycle Deletion State Machine Log:
            </Typography>

            <Box
              style={{
                backgroundColor: '#161B22',
                padding: 14,
                borderRadius: 8,
                border: '1px solid #30363D',
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {Array.isArray(deletionResult.steps) &&
                deletionResult.steps.map((step: any, idx: number) => (
                  <Box key={idx} style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Typography style={{ color: step.status === 'SUCCESS' ? '#10B981' : step.status === 'FAILED' ? '#EF4444' : '#F59E0B' }}>
                      {step.status === 'SUCCESS' ? '✓' : step.status === 'FAILED' ? '✗' : '•'}
                    </Typography>
                    <Box style={{ flex: 1 }}>
                      <Typography style={{ color: '#E6EDF3', fontSize: 12, fontWeight: 600 }}>[{step.step}] {step.message}</Typography>
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>
        ) : (
          /* Deletion Plan & Confirmation View */
          <Box>
            <Typography style={{ fontSize: 14, color: '#C9D1D9', marginBottom: 16 }}>
              This operation will permanently clean up real infrastructure resources owned by <strong>{serviceName}</strong>.
            </Typography>

            {/* Service-owned resources to be deleted */}
            <Typography style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 8, textTransform: 'uppercase' }}>
              Service-Owned Resources (Will Be DELETED):
            </Typography>
            <Box style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              {plan?.serviceOwnedResources?.map((res: any) => (
                <Box key={res.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Typography style={{ fontSize: 13, color: '#F0F6FC', fontWeight: 600 }}>• {res.name}</Typography>
                  <Chip label={res.kind} size="small" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 11 }} />
                </Box>
              ))}
            </Box>

            {/* Shared Platform resources NOT deleted */}
            <Typography style={{ fontSize: 13, fontWeight: 700, color: '#10B981', marginBottom: 8, textTransform: 'uppercase' }}>
              Shared Infrastructure (PROTECTED — NOT DELETED):
            </Typography>
            <Box style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
              {plan?.sharedPlatformResources?.map((res: any) => (
                <Box key={res.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldIcon style={{ color: '#10B981', fontSize: 16 }} />
                    <Typography style={{ fontSize: 13, color: '#C9D1D9' }}>{res.name}</Typography>
                  </Box>
                  <Chip label="PROTECTED" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 11, fontWeight: 700 }} />
                </Box>
              ))}
            </Box>

            <Divider style={{ backgroundColor: '#30363D', marginBottom: 16 }} />

            {/* Confirmation input */}
            <Typography style={{ fontSize: 13, color: '#8B949E', marginBottom: 8 }}>
              Type <strong>{serviceName}</strong> to confirm deletion:
            </Typography>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder={serviceName}
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              style={{ marginBottom: 12, backgroundColor: '#161B22' }}
              InputProps={{ style: { color: '#F0F6FC' } }}
            />

            <Typography style={{ fontSize: 12, color: '#8B949E' }}>
              GitHub PAT (Optional for deleting GitHub repository):
            </Typography>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              type="password"
              placeholder="ghp_... (Requires 'delete_repo' scope)"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              style={{ backgroundColor: '#161B22' }}
              InputProps={{ style: { color: '#F0F6FC' } }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions style={{ backgroundColor: '#0D1117', padding: 16 }}>
        {deletionResult ? (
          <Button variant="contained" onClick={onClose} style={{ backgroundColor: '#0284C7', color: '#fff', fontWeight: 700 }}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={deleting} style={{ color: '#8B949E' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!isConfirmed || deleting}
              onClick={handleExecuteDeletion}
              style={{
                backgroundColor: isConfirmed ? '#EF4444' : '#30363D',
                color: '#fff',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              {deleting ? <CircularProgress size={18} style={{ color: '#fff' }} /> : 'Delete Service & Real Cloud Resources'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
