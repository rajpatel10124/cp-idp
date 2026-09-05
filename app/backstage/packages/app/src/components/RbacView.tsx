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
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  PersonAdd as PersonAddIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface RoleRecord {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  status: string;
}

interface AssignmentRecord {
  id: string;
  principal: string;
  principalType: 'user' | 'group';
  roleId: string;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'catalog.read', label: 'Catalog: Read Entities', group: 'Software Catalog' },
  { id: 'catalog.create', label: 'Catalog: Register Entities', group: 'Software Catalog' },
  { id: 'catalog.delete', label: 'Catalog: Delete Entities', group: 'Software Catalog' },
  { id: 'goldenpath.read', label: 'Golden Path: View Templates', group: 'Scaffolder' },
  { id: 'goldenpath.execute', label: 'Golden Path: Execute Templates', group: 'Scaffolder' },
  { id: 'goldenpath.create', label: 'Golden Path: Create Templates', group: 'Scaffolder' },
  { id: 'deployment.read', label: 'Deployment: View Workloads', group: 'Deployments' },
  { id: 'deployment.create', label: 'Deployment: Trigger Deployments', group: 'Deployments' },
  { id: 'deployment.rollback', label: 'Deployment: Rollback Workloads', group: 'Deployments' },
  { id: 'deployment.delete', label: 'Deployment: Delete Workloads', group: 'Deployments' },
  { id: 'terraform.read', label: 'Terraform: View Stacks', group: 'Infrastructure' },
  { id: 'terraform.plan', label: 'Terraform: Execute Plan', group: 'Infrastructure' },
  { id: 'terraform.apply', label: 'Terraform: Execute Apply', group: 'Infrastructure' },
  { id: 'kubernetes.read', label: 'K8s: View Namespaces/Pods', group: 'Infrastructure' },
  { id: 'kubernetes.manage', label: 'K8s: Manage Namespaces', group: 'Infrastructure' },
  { id: 'policy.read', label: 'Policies: View Guardrails', group: 'Governance' },
  { id: 'policy.create', label: 'Policies: Register Rules', group: 'Governance' },
  { id: 'policy.test', label: 'Policies: Evaluate Guardrails', group: 'Governance' },
  { id: 'rbac.read', label: 'RBAC: View Matrix', group: 'Access Control' },
  { id: 'rbac.manage', label: 'RBAC: Manage Roles & Assignments', group: 'Access Control' },
  { id: 'audit.read', label: 'Audit: View Activity Log', group: 'Access Control' },
];

export const RbacView: React.FC = () => {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dialog States
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [roleIdInput, setRoleIdInput] = useState('');
  const [roleNameInput, setRoleNameInput] = useState('');
  const [roleDescInput, setRoleDescInput] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['catalog.read', 'goldenpath.read']);

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [principalInput, setPrincipalInput] = useState('');
  const [principalTypeInput, setPrincipalTypeInput] = useState<'user' | 'group'>('user');
  const [assignRoleId, setAssignRoleId] = useState('DEVELOPER');

  const fetchRbacData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [rData, aData] = await Promise.all([
        fetchJson(`${BACKEND_URL}/api/platform/rbac/roles`, {}, 5000),
        fetchJson(`${BACKEND_URL}/api/platform/rbac/assignments`, {}, 5000),
      ]);
      if (Array.isArray(rData)) setRoles(rData);
      if (Array.isArray(aData)) setAssignments(aData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load RBAC data from platform control plane');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRbacData();
  }, []);

  const handleCreateRole = async () => {
    if (!roleIdInput.trim() || !roleNameInput.trim()) {
      setErrorMsg('Role ID and Role Name are required.');
      return;
    }
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/rbac/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roleIdInput.trim(),
          name: roleNameInput.trim(),
          description: roleDescInput.trim(),
          permissions: selectedPerms,
        }),
      });
      setCreateRoleOpen(false);
      setRoleIdInput('');
      setRoleNameInput('');
      setRoleDescInput('');
      setSelectedPerms(['catalog.read', 'goldenpath.read']);
      fetchRbacData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create role');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/rbac/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingRole.name,
          description: editingRole.description,
          permissions: editingRole.permissions,
        }),
      });
      setEditRoleOpen(false);
      setEditingRole(null);
      fetchRbacData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role '${roleId}'?`)) return;
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/rbac/roles/${roleId}`, { method: 'DELETE' });
      fetchRbacData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete role');
    }
  };

  const handleAssignRole = async () => {
    if (!principalInput.trim()) {
      setErrorMsg('User or Group principal name is required.');
      return;
    }
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/rbac/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: principalInput.trim(),
          principalType: principalTypeInput,
          roleId: assignRoleId,
        }),
      });
      setAssignOpen(false);
      setPrincipalInput('');
      fetchRbacData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign role');
    }
  };

  const handleUnassignRole = async (assignmentId: string) => {
    try {
      await fetchJson(`${BACKEND_URL}/api/platform/rbac/assignments/${assignmentId}`, { method: 'DELETE' });
      fetchRbacData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unassign role');
    }
  };

  const togglePerm = (permId: string) => {
    if (selectedPerms.includes(permId)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== permId));
    } else {
      setSelectedPerms([...selectedPerms, permId]);
    }
  };

  const toggleEditingPerm = (permId: string) => {
    if (!editingRole) return;
    const cur = editingRole.permissions || [];
    const updated = cur.includes(permId) ? cur.filter((p) => p !== permId) : [...cur, permId];
    setEditingRole({ ...editingRole, permissions: updated });
  };

  return (
    <Box style={{ maxWidth: '1200px', paddingBottom: '40px' }}>
      {/* Top Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SecurityIcon style={{ color: '#38BDF8', fontSize: '28px' }} />
            <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
              Access Control (RBAC) & Authorization Matrix
            </Typography>
          </Box>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Real persistent role-based access enforcement, permission definitions, and principal assignments.
          </Typography>
        </Box>
        <Box style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="contained"
            onClick={() => setCreateRoleOpen(true)}
            startIcon={<AddIcon />}
            style={{ backgroundColor: '#0284C7', color: '#FFFFFF', textTransform: 'none', fontWeight: 700 }}
          >
            Create Custom Role
          </Button>
          <Button
            variant="outlined"
            onClick={fetchRbacData}
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

      {/* Section 1: Roles Matrix */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1F2937', padding: '24px', marginBottom: '32px' }}>
        <Typography style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6', marginBottom: '16px' }}>
          Platform Roles & Permission Scope
        </Typography>

        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress style={{ color: '#38BDF8' }} />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Role ID & Name</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Type</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Description</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Granted Permissions ({roles.length})</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id} style={{ borderBottom: '1px solid #1F2937' }}>
                  <TableCell>
                    <Typography style={{ color: '#F9FAFB', fontWeight: 700, fontSize: '15px' }}>{r.name}</Typography>
                    <Typography style={{ color: '#38BDF8', fontFamily: 'monospace', fontSize: '12px' }}>{r.id}</Typography>
                  </TableCell>
                  <TableCell>
                    {r.isSystem ? (
                      <Chip label="SYSTEM ROLE" size="small" style={{ backgroundColor: '#1E3A8A', color: '#93C5FD', fontWeight: 700, fontSize: '11px' }} />
                    ) : (
                      <Chip label="CUSTOM ROLE" size="small" style={{ backgroundColor: '#065F46', color: '#6EE7B7', fontWeight: 700, fontSize: '11px' }} />
                    )}
                  </TableCell>
                  <TableCell style={{ color: '#D1D5DB', fontSize: '13px', maxWidth: '280px' }}>{r.description}</TableCell>
                  <TableCell>
                    <Box style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '380px' }}>
                      {(r.permissions || []).slice(0, 5).map((p) => (
                        <Chip key={p} label={p} size="small" style={{ backgroundColor: '#1F2937', color: '#CBD5E1', fontSize: '11px' }} />
                      ))}
                      {(r.permissions || []).length > 5 && (
                        <Chip label={`+${r.permissions.length - 5} more`} size="small" style={{ backgroundColor: '#374151', color: '#9CA3AF', fontSize: '11px' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                    <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                      <Tooltip title="Edit Permissions">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingRole({ ...r });
                            setEditRoleOpen(true);
                          }}
                          style={{ color: '#38BDF8' }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!r.isSystem && (
                        <Tooltip title="Delete Custom Role">
                          <IconButton size="small" onClick={() => handleDeleteRole(r.id)} style={{ color: '#EF4444' }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Section 2: User & Group Role Assignments */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1F2937', padding: '24px' }}>
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Typography style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6' }}>
            User & Group Assignments
          </Typography>
          <Button
            variant="contained"
            onClick={() => setAssignOpen(true)}
            startIcon={<PersonAddIcon />}
            style={{ backgroundColor: '#10B981', color: '#FFFFFF', textTransform: 'none', fontWeight: 700 }}
          >
            Assign Role to Principal
          </Button>
        </Box>

        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <CircularProgress style={{ color: '#10B981' }} />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Principal (User / Group)</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Type</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Assigned Role</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Assigned At</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map((a) => {
                const assignedRoleObj = roles.find((r) => r.id.toUpperCase() === a.roleId.toUpperCase());
                return (
                  <TableRow key={a.id} style={{ borderBottom: '1px solid #1F2937' }}>
                    <TableCell style={{ color: '#F9FAFB', fontWeight: 700, fontSize: '14px' }}>{a.principal}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.principalType.toUpperCase()}
                        size="small"
                        style={{
                          backgroundColor: a.principalType === 'group' ? '#3730A3' : '#1E293B',
                          color: a.principalType === 'group' ? '#C7D2FE' : '#94A3B8',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={assignedRoleObj ? assignedRoleObj.name : a.roleId}
                        size="small"
                        style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700, fontSize: '12px' }}
                      />
                    </TableCell>
                    <TableCell style={{ color: '#9CA3AF', fontSize: '12px' }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <Button
                        size="small"
                        onClick={() => handleUnassignRole(a.id)}
                        style={{ color: '#EF4444', textTransform: 'none', fontWeight: 600 }}
                      >
                        Unassign
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Modal 1: Create Custom Role */}
      <Dialog open={createRoleOpen} onClose={() => setCreateRoleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ backgroundColor: '#1E293B', color: '#F8FAFC', fontWeight: 800 }}>
          Create Custom Platform Role
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '20px' }}>
          <TextField
            fullWidth
            label="Role Identifier (e.g. DEVOPS_LEAD)"
            value={roleIdInput}
            onChange={(e) => setRoleIdInput(e.target.value.toUpperCase())}
            variant="outlined"
            style={{ marginBottom: '16px' }}
            InputLabelProps={{ style: { color: '#94A3B8' } }}
            InputProps={{ style: { color: '#F8FAFC' } }}
          />
          <TextField
            fullWidth
            label="Role Display Name"
            value={roleNameInput}
            onChange={(e) => setRoleNameInput(e.target.value)}
            variant="outlined"
            style={{ marginBottom: '16px' }}
            InputLabelProps={{ style: { color: '#94A3B8' } }}
            InputProps={{ style: { color: '#F8FAFC' } }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={roleDescInput}
            onChange={(e) => setRoleDescInput(e.target.value)}
            variant="outlined"
            style={{ marginBottom: '20px' }}
            InputLabelProps={{ style: { color: '#94A3B8' } }}
            InputProps={{ style: { color: '#F8FAFC' } }}
          />

          <Typography style={{ fontWeight: 700, fontSize: '15px', color: '#38BDF8', marginBottom: '12px' }}>
            Select Granted Permissions ({selectedPerms.length} selected)
          </Typography>
          <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {AVAILABLE_PERMISSIONS.map((p) => (
              <FormControlLabel
                key={p.id}
                control={
                  <Checkbox
                    checked={selectedPerms.includes(p.id)}
                    onChange={() => togglePerm(p.id)}
                    style={{ color: '#38BDF8' }}
                  />
                }
                label={<Typography style={{ color: '#E2E8F0', fontSize: '13px' }}>{p.label}</Typography>}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#1E293B', padding: '16px' }}>
          <Button onClick={() => setCreateRoleOpen(false)} style={{ color: '#94A3B8' }}>Cancel</Button>
          <Button onClick={handleCreateRole} variant="contained" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700 }}>
            Save Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 2: Edit Role Permissions */}
      <Dialog open={editRoleOpen} onClose={() => setEditRoleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle style={{ backgroundColor: '#1E293B', color: '#F8FAFC', fontWeight: 800 }}>
          Edit Role: {editingRole?.name} ({editingRole?.id})
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '20px' }}>
          {editingRole && (
            <>
              <TextField
                fullWidth
                label="Role Display Name"
                value={editingRole.name}
                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                variant="outlined"
                style={{ marginBottom: '16px' }}
                InputLabelProps={{ style: { color: '#94A3B8' } }}
                InputProps={{ style: { color: '#F8FAFC' } }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={editingRole.description}
                onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                variant="outlined"
                style={{ marginBottom: '20px' }}
                InputLabelProps={{ style: { color: '#94A3B8' } }}
                InputProps={{ style: { color: '#F8FAFC' } }}
              />
              <Typography style={{ fontWeight: 700, fontSize: '15px', color: '#38BDF8', marginBottom: '12px' }}>
                Permissions Granted ({editingRole.permissions?.length || 0} selected)
              </Typography>
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {AVAILABLE_PERMISSIONS.map((p) => (
                  <FormControlLabel
                    key={p.id}
                    control={
                      <Checkbox
                        checked={(editingRole.permissions || []).includes(p.id)}
                        onChange={() => toggleEditingPerm(p.id)}
                        style={{ color: '#38BDF8' }}
                      />
                    }
                    label={<Typography style={{ color: '#E2E8F0', fontSize: '13px' }}>{p.label}</Typography>}
                  />
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#1E293B', padding: '16px' }}>
          <Button onClick={() => setEditRoleOpen(false)} style={{ color: '#94A3B8' }}>Cancel</Button>
          <Button onClick={handleUpdateRole} variant="contained" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Assign Role to User or Group */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ backgroundColor: '#1E293B', color: '#F8FAFC', fontWeight: 800 }}>
          Assign Role to Principal
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '20px' }}>
          <TextField
            fullWidth
            label="Principal Identifier (Username or Team Name e.g. team-backend)"
            value={principalInput}
            onChange={(e) => setPrincipalInput(e.target.value)}
            variant="outlined"
            style={{ marginBottom: '16px' }}
            InputLabelProps={{ style: { color: '#94A3B8' } }}
            InputProps={{ style: { color: '#F8FAFC' } }}
          />
          <FormControl fullWidth variant="outlined" style={{ marginBottom: '16px' }}>
            <InputLabel style={{ color: '#94A3B8' }}>Principal Type</InputLabel>
            <Select
              value={principalTypeInput}
              onChange={(e) => setPrincipalTypeInput(e.target.value as any)}
              label="Principal Type"
              style={{ color: '#F8FAFC' }}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="group">Group / Team</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth variant="outlined" style={{ marginBottom: '16px' }}>
            <InputLabel style={{ color: '#94A3B8' }}>Select Platform Role</InputLabel>
            <Select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value as string)}
              label="Select Platform Role"
              style={{ color: '#F8FAFC' }}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#1E293B', padding: '16px' }}>
          <Button onClick={() => setAssignOpen(false)} style={{ color: '#94A3B8' }}>Cancel</Button>
          <Button onClick={handleAssignRole} variant="contained" style={{ backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: 700 }}>
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
