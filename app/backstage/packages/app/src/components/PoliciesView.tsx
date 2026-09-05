import React, { useState, useEffect } from 'react';
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
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  CheckCircle as ActiveIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  Gavel as PolicyIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface PolicyRecord {
  id: string;
  name: string;
  description: string;
  engine: string;
  scope: string;
  attachment: string;
  rule: string;
  status: 'ACTIVE' | 'DISABLED' | 'DRAFT';
  createdBy: string;
  createdAt: string;
}

export const PoliciesView: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Policy CRUD Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [engineInput, setEngineInput] = useState('OPA');
  const [scopeInput, setScopeInput] = useState('Kubernetes Workloads');
  const [attachmentInput, setAttachmentInput] = useState('Global');
  const [ruleInput, setRuleInput] = useState('');

  // Interactive Policy Tester State
  const [testOwner, setTestOwner] = useState('team-backend');
  const [testEnv, setTestEnv] = useState('development');
  const [testRole, setTestRole] = useState('Developer');
  const [testPort, setTestPort] = useState('8080');
  const [testCpu, setTestCpu] = useState('100m');
  const [testMemory, setTestMemory] = useState('128Mi');
  const [testRegistry, setTestRegistry] = useState('Local');
  const [testPrivileged, setTestPrivileged] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchJson(`${BACKEND_URL}/api/platform/policies`, {}, 5000);
      if (Array.isArray(data)) setPolicies(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load policy registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async () => {
    if (!nameInput.trim() || !ruleInput.trim()) {
      setErrorMsg('Policy Name and Rule definition are required.');
      return;
    }
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          description: descInput.trim(),
          engine: engineInput,
          scope: scopeInput,
          attachment: attachmentInput,
          rule: ruleInput.trim(),
        }),
      });
      setCreateModalOpen(false);
      setNameInput('');
      setDescInput('');
      setRuleInput('');
      fetchPolicies();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create policy');
    }
  };

  const handleToggleStatus = async (policyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/policies/${policyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchPolicies();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle policy status');
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!window.confirm('Delete this policy from registry?')) return;
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/policies/${policyId}`, { method: 'DELETE' });
      fetchPolicies();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete policy');
    }
  };

  const handleTestPolicy = async () => {
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/policies/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole: testRole,
          owner: testOwner,
          environment: testEnv,
          port: parseInt(testPort, 10) || 8080,
          cpuRequest: testCpu,
          memoryRequest: testMemory,
          privileged: testPrivileged,
          imageRegistry: testRegistry,
        }),
      });
      const data = await res.json();
      setEvalResult(data);
    } catch (err: any) {
      setEvalResult({ allow: false, violations: [{ policy: 'API Error', reason: err.message }] });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Box style={{ maxWidth: '1200px', paddingBottom: '40px' }}>
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PolicyIcon style={{ color: '#38BDF8', fontSize: '28px' }} />
            <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
              Policy Engine & Guardrail Registry (OPA / Kyverno)
            </Typography>
          </Box>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Central policy registry with persistent rule storage, attachment targets, and interactive evaluation.
          </Typography>
        </Box>
        <Box style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="contained"
            onClick={() => setCreateModalOpen(true)}
            startIcon={<AddIcon />}
            style={{ backgroundColor: '#0284C7', color: '#FFFFFF', textTransform: 'none', fontWeight: 700 }}
          >
            Create Policy Rule
          </Button>
          <Button
            variant="outlined"
            onClick={fetchPolicies}
            startIcon={<RefreshIcon />}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {errorMsg && (
        <Paper style={{ backgroundColor: '#7F1D1D', border: '1px solid #EF4444', color: '#FEE2E2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          <Typography style={{ fontWeight: 600, fontSize: '14px' }}>{errorMsg}</Typography>
        </Paper>
      )}

      {/* Active Rules Registry Table */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1F2937', padding: '24px', marginBottom: '32px' }}>
        <Typography style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6', marginBottom: '16px' }}>
          Policy Registry & Attachment Targets ({policies.length})
        </Typography>
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress style={{ color: '#38BDF8' }} />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Policy Name</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Engine</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Scope</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Attachment Target</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Status</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((p) => (
                <TableRow key={p.id} style={{ borderBottom: '1px solid #1F2937' }}>
                  <TableCell>
                    <Typography style={{ color: '#F9FAFB', fontWeight: 700, fontSize: '14px' }}>{p.name}</Typography>
                    <Typography style={{ color: '#9CA3AF', fontSize: '12px' }}>{p.description}</Typography>
                  </TableCell>
                  <TableCell style={{ color: '#38BDF8', fontWeight: 700, fontSize: '13px' }}>{p.engine}</TableCell>
                  <TableCell style={{ color: '#D1D5DB', fontSize: '13px' }}>{p.scope}</TableCell>
                  <TableCell>
                    <Chip label={p.attachment || 'Global'} size="small" style={{ backgroundColor: '#1E293B', color: '#94A3B8', fontWeight: 600, fontSize: '11px' }} />
                  </TableCell>
                  <TableCell>
                    {p.status === 'ACTIVE' ? (
                      <Chip icon={<ActiveIcon style={{ color: '#10B981', fontSize: '14px' }} />} label="ACTIVE" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#34D399', fontWeight: 700 }} />
                    ) : (
                      <Chip label={p.status} size="small" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#F87171', fontWeight: 700 }} />
                    )}
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Button
                      size="small"
                      onClick={() => handleToggleStatus(p.id, p.status)}
                      style={{ color: p.status === 'ACTIVE' ? '#F59E0B' : '#10B981', textTransform: 'none', fontWeight: 600, marginRight: '8px' }}
                    >
                      {p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </Button>
                    <IconButton size="small" onClick={() => handleDeletePolicy(p.id)} style={{ color: '#EF4444' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Interactive Policy Guardrails Evaluator */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1F2937', padding: '24px' }}>
        <Typography style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6', marginBottom: '8px' }}>
          Interactive Guardrail Evaluator (OPA / Kyverno Test Engine)
        </Typography>
        <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '20px' }}>
          Test proposed workload deployment specifications against attached platform guardrails.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel style={{ color: '#9CA3AF' }}>User Role</InputLabel>
              <Select value={testRole} onChange={(e) => setTestRole(e.target.value as string)} label="User Role" style={{ color: '#F3F4F6' }}>
                <MenuItem value="Developer">Developer</MenuItem>
                <MenuItem value="Platform Engineer">Platform Engineer</MenuItem>
                <MenuItem value="Viewer">Viewer (Read-Only)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Owner Team Tag" value={testOwner} onChange={(e) => setTestOwner(e.target.value)} variant="outlined" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel style={{ color: '#9CA3AF' }}>Target Environment</InputLabel>
              <Select value={testEnv} onChange={(e) => setTestEnv(e.target.value as string)} label="Target Environment" style={{ color: '#F3F4F6' }}>
                <MenuItem value="development">development</MenuItem>
                <MenuItem value="staging">staging</MenuItem>
                <MenuItem value="production">production</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Service Port" value={testPort} onChange={(e) => setTestPort(e.target.value)} variant="outlined" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="CPU Request" value={testCpu} onChange={(e) => setTestCpu(e.target.value)} variant="outlined" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Memory Request" value={testMemory} onChange={(e) => setTestMemory(e.target.value)} variant="outlined" InputLabelProps={{ style: { color: '#9CA3AF' } }} InputProps={{ style: { color: '#F3F4F6' } }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel style={{ color: '#9CA3AF' }}>Image Registry</InputLabel>
              <Select value={testRegistry} onChange={(e) => setTestRegistry(e.target.value as string)} label="Image Registry" style={{ color: '#F3F4F6' }}>
                <MenuItem value="Local">Local Docker Daemon</MenuItem>
                <MenuItem value="ECR">Amazon ECR</MenuItem>
                <MenuItem value="DockerHub">Docker Hub</MenuItem>
                <MenuItem value="untrusted-registry.io">Untrusted External Registry</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleTestPolicy}
              disabled={evaluating}
              startIcon={evaluating ? <CircularProgress size={18} style={{ color: '#FFF' }} /> : <TestIcon />}
              style={{ backgroundColor: '#10B981', color: '#FFFFFF', textTransform: 'none', fontWeight: 700 }}
            >
              {evaluating ? 'Evaluating OPA Rego Rules...' : 'Evaluate Specification Against Active Guardrails'}
            </Button>
          </Grid>
        </Grid>

        {evalResult && (
          <Box style={{ marginTop: '24px' }}>
            {evalResult.allow ? (
              <Paper style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', padding: '16px', borderRadius: '8px' }}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ActiveIcon style={{ color: '#10B981' }} />
                  <Typography style={{ color: '#34D399', fontWeight: 800, fontSize: '16px' }}>
                    PASSED: Specification Complies with All Active Platform Guardrails
                  </Typography>
                </Box>
              </Paper>
            ) : (
              <Paper style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', padding: '16px', borderRadius: '8px' }}>
                <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ErrorIcon style={{ color: '#EF4444' }} />
                  <Typography style={{ color: '#F87171', fontWeight: 800, fontSize: '16px' }}>
                    POLICY DENIED: Deployment Violates Platform Guardrails ({evalResult.violations?.length || 0} violations)
                  </Typography>
                </Box>
                {evalResult.violations?.map((v: any, idx: number) => (
                  <Box key={idx} style={{ backgroundColor: '#1F2937', padding: '12px', borderRadius: '6px', marginBottom: '8px' }}>
                    <Typography style={{ color: '#F87171', fontWeight: 700, fontSize: '14px' }}>{v.policy}</Typography>
                    <Typography style={{ color: '#D1D5DB', fontSize: '13px', marginTop: '2px' }}>Reason: {v.reason}</Typography>
                    <Typography style={{ color: '#38BDF8', fontSize: '12px', marginTop: '2px' }}>Remediation: {v.remediation}</Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
        )}
      </Paper>

      {/* Modal: Create Policy Rule */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ backgroundColor: '#1E293B', color: '#F8FAFC', fontWeight: 800 }}>
          Create New Guardrail Policy
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '20px' }}>
          <TextField fullWidth label="Policy Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} variant="outlined" style={{ marginBottom: '16px' }} InputLabelProps={{ style: { color: '#94A3B8' } }} InputProps={{ style: { color: '#F8FAFC' } }} />
          <TextField fullWidth multiline rows={2} label="Description" value={descInput} onChange={(e) => setDescInput(e.target.value)} variant="outlined" style={{ marginBottom: '16px' }} InputLabelProps={{ style: { color: '#94A3B8' } }} InputProps={{ style: { color: '#F8FAFC' } }} />

          <Grid container spacing={2} style={{ marginBottom: '16px' }}>
            <Grid item xs={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel style={{ color: '#94A3B8' }}>Engine</InputLabel>
                <Select value={engineInput} onChange={(e) => setEngineInput(e.target.value as string)} label="Engine" style={{ color: '#F8FAFC' }}>
                  <MenuItem value="OPA">OPA (Open Policy Agent)</MenuItem>
                  <MenuItem value="Kyverno">Kyverno</MenuItem>
                  <MenuItem value="Catalog Guard">Catalog Guard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel style={{ color: '#94A3B8' }}>Attachment Target</InputLabel>
                <Select value={attachmentInput} onChange={(e) => setAttachmentInput(e.target.value as string)} label="Attachment Target" style={{ color: '#F8FAFC' }}>
                  <MenuItem value="Global">Global Platform</MenuItem>
                  <MenuItem value="production">production environment</MenuItem>
                  <MenuItem value="team-platform">team-platform</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField fullWidth multiline rows={3} label="Rule Specification Definition" value={ruleInput} onChange={(e) => setRuleInput(e.target.value)} variant="outlined" style={{ marginBottom: '16px' }} InputLabelProps={{ style: { color: '#94A3B8' } }} InputProps={{ style: { color: '#F8FAFC' } }} />
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#1E293B', padding: '16px' }}>
          <Button onClick={() => setCreateModalOpen(false)} style={{ color: '#94A3B8' }}>Cancel</Button>
          <Button onClick={handleCreatePolicy} variant="contained" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700 }}>
            Save Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
