import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip,
  IconButton,
  Drawer as DiagDrawer,
  CircularProgress,
} from '@material-ui/core';
import {
  Dashboard as DashboardIcon,
  Apps as ServicesIcon,
  FolderSpecial as ProjectsIcon,
  Layers as EnvironmentsIcon,
  CloudUpload as DeploymentsIcon,
  Extension as TemplatesIcon,
  AccountTree as CatalogIcon,
  Storage as InfraIcon,
  Assessment as MetricsIcon,
  Receipt as LogsIcon,
  MenuBook as DocsIcon,
  History as AuditIcon,
  Security as SecurityIcon,
  Gavel as PolicyIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  CheckCircle as HealthyIcon,
  Warning as WarnIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
} from '@material-ui/icons';

const DRAWER_WIDTH = 250;
const BACKEND_URL = 'http://localhost:7007';

interface DiagnosticItem {
  component: string;
  status: string;
  detail?: string;
  latency?: string;
  error?: string;
  lastChecked: string;
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const ForgeOpsLayout: React.FC<LayoutProps> = ({ children, activeTab, onSelectTab }) => {
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'degraded'>('checking');
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [diagOpen, setDiagOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('E-Commerce System');
  const [selectedEnv, setSelectedEnv] = useState('development');
  const [selectedRole, setSelectedRole] = useState('Developer');
  const [anchorElProject, setAnchorElProject] = useState<null | HTMLElement>(null);
  const [anchorElEnv, setAnchorElEnv] = useState<null | HTMLElement>(null);
  const [anchorElRole, setAnchorElRole] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data.status === 'ok' ? 'healthy' : 'degraded');
      } else {
        setHealthStatus('degraded');
      }
    } catch {
      setHealthStatus('degraded');
    }
  }, []);

  const loadDiagnostics = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/diagnostics`);
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data.diagnostics || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleDiagOpen = () => {
    setDiagOpen(true);
    loadDiagnostics();
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
    { id: 'services', label: 'Services & Workloads', icon: <ServicesIcon fontSize="small" /> },
    { id: 'projects', label: 'Projects', icon: <ProjectsIcon fontSize="small" /> },
    { id: 'environments', label: 'Environments', icon: <EnvironmentsIcon fontSize="small" /> },
    { id: 'deployments', label: 'Deployments', icon: <DeploymentsIcon fontSize="small" /> },
    { id: 'templates', label: 'Golden Paths', icon: <TemplatesIcon fontSize="small" /> },
    { id: 'catalog', label: 'Software Catalog', icon: <CatalogIcon fontSize="small" /> },
    { id: 'infrastructure', label: 'Infrastructure', icon: <InfraIcon fontSize="small" /> },
    { id: 'observability', label: 'Observability & Telemetry', icon: <MetricsIcon fontSize="small" style={{ color: '#38bdf8' }} /> },
    { id: 'dora', label: 'DORA Metrics', icon: <TrendingUpIcon fontSize="small" style={{ color: '#38bdf8' }} /> },
    { id: 'logs', label: 'Live Logs', icon: <LogsIcon fontSize="small" /> },
    { id: 'documentation', label: 'TechDocs', icon: <DocsIcon fontSize="small" /> },
    { id: 'activity', label: 'Audit & Activity', icon: <AuditIcon fontSize="small" /> },
    { id: 'rbac', label: 'Access Control', icon: <SecurityIcon fontSize="small" /> },
    { id: 'policies', label: 'Policies (OPA)', icon: <PolicyIcon fontSize="small" /> },
    { id: 'evaluation', label: 'Time-to-Deploy', icon: <TimerIcon fontSize="small" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon fontSize="small" /> },
  ];

  const envColor = {
    production: { bg: '#831843', color: '#F472B6' },
    staging: { bg: '#78350F', color: '#FBBF24' },
    development: { bg: '#064E3B', color: '#34D399' },
  }[selectedEnv] || { bg: '#1F2937', color: '#9CA3AF' };

  return (
    <Box style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#0B0F19', color: '#F3F4F6' }}>
      {/* Sidebar — Flex Column */}
      <Box
        style={{
          width: DRAWER_WIDTH,
          minWidth: DRAWER_WIDTH,
          maxWidth: DRAWER_WIDTH,
          flexShrink: 0,
          height: '100vh',
          backgroundColor: '#0D1117',
          borderRight: '1px solid #1F2937',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <Box style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937', display: 'flex', alignItems: 'center', gap: '10px', height: '56px', boxSizing: 'border-box', flexShrink: 0 }}>
          <Box style={{ backgroundColor: '#0369A1', borderRadius: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography style={{ fontWeight: 900, color: '#FFF', fontSize: '15px' }}>⚡</Typography>
          </Box>
          <Box>
            <Typography style={{ fontWeight: 800, fontSize: '15px', color: '#F3F4F6', letterSpacing: '0.3px', lineHeight: 1.1 }}>
              Forge<span style={{ color: '#38BDF8' }}>Ops</span>
            </Typography>
            <Typography style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Internal Developer Platform
            </Typography>
          </Box>
        </Box>

        {/* Nav Items — Internal Scroll */}
        <List style={{ padding: '8px', overflowY: 'auto', flex: 1 }}>
          {navItems.map(item => {
            const isSelected = activeTab === item.id;
            return (
              <ListItem
                button key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  borderRadius: '6px',
                  marginBottom: '2px',
                  backgroundColor: isSelected ? 'rgba(56,189,248,0.08)' : 'transparent',
                  borderLeft: isSelected ? '2px solid #38BDF8' : '2px solid transparent',
                  padding: '6px 10px',
                }}
              >
                <ListItemIcon style={{ color: isSelected ? '#38BDF8' : '#6B7280', minWidth: '32px' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ style: { fontSize: '13px', fontWeight: isSelected ? 600 : 400, color: isSelected ? '#E2E8F0' : '#9CA3AF' } }}
                />
              </ListItem>
            );
          })}
        </List>

        {/* Sidebar Footer */}
        <Box style={{ padding: '12px 16px', borderTop: '1px solid #1F2937', flexShrink: 0 }}>
          <Typography style={{ fontSize: '10px', color: '#4B5563', textAlign: 'center' }}>
            ForgeOps v1.0 • Backstage 1.25
          </Typography>
        </Box>
      </Box>

      {/* Main View Area — Flex Column */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0, overflow: 'hidden' }}>
        {/* Top Navigation Header */}
        <Box
          style={{
            height: '56px',
            minHeight: '56px',
            backgroundColor: '#0D1117',
            borderBottom: '1px solid #1F2937',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            padding: '0 24px',
            gap: '16px',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          {/* Left Context Selectors */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Chip
              label={selectedProject.length > 20 ? selectedProject.slice(0, 20) + '…' : selectedProject}
              size="small"
              onClick={e => setAnchorElProject(e.currentTarget)}
              style={{ backgroundColor: '#1F2937', color: '#9CA3AF', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
            />
            <Menu anchorEl={anchorElProject} open={Boolean(anchorElProject)} onClose={() => setAnchorElProject(null)}>
              {['E-Commerce System', 'IDP Infrastructure', 'Data Pipeline System'].map(p => (
                <MenuItem key={p} onClick={() => { setSelectedProject(p); setAnchorElProject(null); }}>{p}</MenuItem>
              ))}
            </Menu>

            <Chip
              label={selectedEnv.toUpperCase()}
              size="small"
              onClick={e => setAnchorElEnv(e.currentTarget)}
              style={{ backgroundColor: envColor.bg, color: envColor.color, fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
            />
            <Menu anchorEl={anchorElEnv} open={Boolean(anchorElEnv)} onClose={() => setAnchorElEnv(null)}>
              {['development', 'staging', 'production'].map(e => (
                <MenuItem key={e} onClick={() => { setSelectedEnv(e); setAnchorElEnv(null); }}>{e}</MenuItem>
              ))}
            </Menu>

            <Chip
              label={`ROLE: ${selectedRole.toUpperCase()}`}
              size="small"
              onClick={e => setAnchorElRole(e.currentTarget)}
              style={{ backgroundColor: '#1E293B', color: '#38BDF8', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}
            />
            <Menu anchorEl={anchorElRole} open={Boolean(anchorElRole)} onClose={() => setAnchorElRole(null)}>
              {['Developer', 'PlatformEngineer', 'PlatformAdmin', 'Viewer'].map(r => (
                <MenuItem key={r} onClick={() => { setSelectedRole(r); setAnchorElRole(null); }}>{r}</MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Search Input */}
          <TextField
            placeholder="Search services, docs, catalog…"
            variant="outlined"
            size="small"
            style={{ flex: 1, maxWidth: '400px', backgroundColor: '#1F2937', borderRadius: '6px' }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon style={{ color: '#6B7280', fontSize: '18px' }} /></InputAdornment>,
              style: { color: '#F3F4F6', fontSize: '13px' },
            }}
          />

          {/* Health & User */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <Tooltip title={healthStatus === 'healthy' ? 'All backend services healthy — click for diagnostics' : 'Platform issues detected — click for diagnostics'}>
              <Chip
                icon={
                  healthStatus === 'checking'
                    ? <CircularProgress size={12} style={{ color: '#9CA3AF' }} />
                    : healthStatus === 'healthy'
                    ? <HealthyIcon style={{ color: '#10B981', fontSize: '14px' }} />
                    : <WarnIcon style={{ color: '#F59E0B', fontSize: '14px' }} />
                }
                label={
                  healthStatus === 'checking' ? 'Checking...'
                    : healthStatus === 'healthy' ? 'Control Plane Healthy'
                    : 'Issues'
                }
                size="small"
                onClick={handleDiagOpen}
                style={{
                  backgroundColor: healthStatus === 'healthy' ? 'rgba(16,185,129,0.1)' : healthStatus === 'degraded' ? 'rgba(245,158,11,0.1)' : '#1F2937',
                  color: healthStatus === 'healthy' ? '#34D399' : healthStatus === 'degraded' ? '#FBBF24' : '#9CA3AF',
                  border: `1px solid ${healthStatus === 'healthy' ? '#059669' : healthStatus === 'degraded' ? '#D97706' : '#374151'}`,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              />
            </Tooltip>

            <Tooltip title="Refresh status">
              <IconButton size="small" onClick={checkHealth} style={{ color: '#6B7280', padding: '4px' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Box
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}
              onClick={e => setAnchorElUser(e.currentTarget)}
            >
              <Avatar style={{ width: 28, height: 28, backgroundColor: '#0369A1', fontSize: '12px', fontWeight: 'bold' }}>
                JS
              </Avatar>
            </Box>
            <Menu anchorEl={anchorElUser} open={Boolean(anchorElUser)} onClose={() => setAnchorElUser(null)}>
              <MenuItem disabled><Typography style={{ fontSize: '12px' }}>Jane Smith — Platform Lead</Typography></MenuItem>
              <MenuItem onClick={() => { onSelectTab('settings'); setAnchorElUser(null); }}>Settings</MenuItem>
              <MenuItem onClick={() => setAnchorElUser(null)}>Sign Out</MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Main Content Body — Single Scroll Container */}
        <Box
          component="main"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px',
            boxSizing: 'border-box',
            backgroundColor: '#0B0F19',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Diagnostics Drawer */}
      <DiagDrawer
        anchor="right"
        open={diagOpen}
        onClose={() => setDiagOpen(false)}
        PaperProps={{ style: { width: 380, backgroundColor: '#0D1117', color: '#F3F4F6', borderLeft: '1px solid #1F2937' } }}
      >
        <Box style={{ padding: '20px' }}>
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Typography style={{ fontSize: '16px', fontWeight: 700 }}>Platform Diagnostics</Typography>
            <IconButton size="small" onClick={() => setDiagOpen(false)} style={{ color: '#9CA3AF' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {diagnostics.length === 0 ? (
            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CircularProgress size={16} style={{ color: '#38BDF8' }} />
              <Typography style={{ fontSize: '13px', color: '#9CA3AF' }}>Loading diagnostics...</Typography>
            </Box>
          ) : (
            diagnostics.map((item, idx) => (
              <Box key={idx} style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#1F2937', borderRadius: '6px' }}>
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <Typography style={{ fontSize: '13px', fontWeight: 600, color: '#F3F4F6' }}>{item.component}</Typography>
                  <Chip
                    label={item.status}
                    size="small"
                    style={{
                      backgroundColor: item.status === 'healthy' || item.status === 'connected'
                        ? 'rgba(16,185,129,0.15)' : item.status === 'not-configured'
                        ? 'rgba(107,114,128,0.15)' : 'rgba(239,68,68,0.15)',
                      color: item.status === 'healthy' || item.status === 'connected'
                        ? '#34D399' : item.status === 'not-configured'
                        ? '#6B7280' : '#F87171',
                      fontSize: '10px', fontWeight: 700,
                    }}
                  />
                </Box>
                <Typography style={{ fontSize: '11px', color: '#6B7280' }}>{item.detail || item.error || ''}</Typography>
                {item.latency && (
                  <Typography style={{ fontSize: '10px', color: '#4B5563', marginTop: '2px' }}>Latency: {item.latency}</Typography>
                )}
              </Box>
            ))
          )}

          <Box style={{ marginTop: '16px', padding: '12px', backgroundColor: '#111827', borderRadius: '6px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#4B5563' }}>
              Backend: {BACKEND_URL}<br />
              Last checked: {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      </DiagDrawer>
    </Box>
  );
};
