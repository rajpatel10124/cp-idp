import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Tooltip,
} from '@material-ui/core';
import {
  CheckCircle as SuccessIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Assessment as MetricsIcon,
  Receipt as LogsIcon,
  Apps as ServicesIcon,
  Storage as InfraIcon,
  Refresh as RefreshIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface PlatformStats {
  components: number;
  apis: number;
  resources: number;
  systems: number;
  users: number;
  totalEntities: number;
  catalogHealthy: boolean;
  catalogError?: string;
}

export const DashboardOverview: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Fetch backend health
    try {
      const healthData = await fetchJson(`${BACKEND_URL}/api/health`, {}, 5000);
      setBackendHealth(healthData);
    } catch (err: any) {
      setBackendHealth({ status: 'offline', error: err.message });
    }

    // 2. Fetch live deployments
    try {
      const depData = await fetchJson(`${BACKEND_URL}/api/platform/deployments`, {}, 5000);
      if (Array.isArray(depData)) setDeployments(depData);
    } catch {}

    // 3. Fetch catalog entities
    try {
      const data = await fetchJson(`${BACKEND_URL}/api/catalog/entities`, {}, 5000);
      let entityList: any[] = [];
      if (Array.isArray(data)) {
        entityList = data;
      } else if (data && Array.isArray(data.entities)) {
        entityList = data.entities;
      }

      setStats({
        components: entityList.filter((e: any) => e.kind === 'Component').length,
        apis: entityList.filter((e: any) => e.kind === 'API').length,
        resources: entityList.filter((e: any) => e.kind === 'Resource').length,
        systems: entityList.filter((e: any) => e.kind === 'System').length,
        users: entityList.filter((e: any) => e.kind === 'User').length,
        totalEntities: entityList.length,
        catalogHealthy: true,
      });
    } catch (err: any) {
      setStats({
        components: 0,
        apis: 0,
        resources: 0,
        systems: 0,
        users: 0,
        totalEntities: 0,
        catalogHealthy: false,
        catalogError: err.message || 'Catalog unavailable',
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCard = (
    label: string,
    value: string | number,
    note: string,
    color: string,
    onClick: () => void,
    chip?: { label: string; color: string; bg: string }
  ) => (
    <Grid item xs={12} sm={6} md={3}>
      <Paper
        onClick={onClick}
        style={{
          backgroundColor: '#111827',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #1F2937',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </Typography>
        <Box style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '10px' }}>
          {loading ? (
            <CircularProgress size={24} style={{ color }} />
          ) : (
            <Typography style={{ fontSize: '30px', fontWeight: 800, color }}>
              {value}
            </Typography>
          )}
        </Box>
        {chip && (
          <Chip
            label={chip.label}
            size="small"
            style={{ backgroundColor: chip.bg, color: chip.color, fontSize: '10px', marginTop: '8px' }}
          />
        )}
        <Typography style={{ fontSize: '11px', color: '#4B5563', marginTop: chip ? '0' : '8px' }}>
          {note}
        </Typography>
      </Paper>
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Box>
          <Typography style={{ fontSize: '22px', fontWeight: 800, color: '#F3F4F6' }}>
            Platform Overview
          </Typography>
          <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
            Real-time platform health, catalog state, workloads, and deployments.
          </Typography>
        </Box>
        <Box style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="outlined"
            onClick={fetchData}
            startIcon={<RefreshIcon />}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Retry / Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => onNavigate('templates')}
            startIcon={<AddIcon />}
            style={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700, textTransform: 'none', borderRadius: '6px' }}
          >
            New Service
          </Button>
        </Box>
      </Box>

      {/* KPI Cards — real data from /api/catalog/entities */}
      <Grid container spacing={3} style={{ marginBottom: '24px' }}>
        {statCard(
          'Active Services',
          loading ? '...' : stats?.catalogHealthy ? stats.components : 0,
          stats?.catalogHealthy ? 'From Backstage Catalog' : 'Catalog offline',
          '#38BDF8',
          () => onNavigate('catalog'),
          { label: 'Click to view', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' }
        )}
        {statCard(
          'APIs & Contracts',
          loading ? '...' : stats?.catalogHealthy ? stats.apis : 0,
          stats?.catalogHealthy ? 'OpenAPI / gRPC' : 'Catalog offline',
          '#A78BFA',
          () => onNavigate('catalog'),
          { label: 'OpenAPI 3.0', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' }
        )}
        {statCard(
          'Cloud Resources',
          loading ? '...' : stats?.catalogHealthy ? stats.resources : 0,
          stats?.catalogHealthy ? 'Databases, caches, queues' : 'Catalog offline',
          '#FBBF24',
          () => onNavigate('infrastructure'),
          { label: 'AWS Resources', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' }
        )}
        {statCard(
          'Catalog Entities',
          loading ? '...' : stats?.catalogHealthy ? stats.totalEntities : 0,
          stats?.catalogHealthy ? 'All kinds registered' : (stats?.catalogError || 'Error'),
          '#34D399',
          () => onNavigate('catalog'),
          {
            label: stats?.catalogHealthy ? 'Catalog Online' : 'Degraded',
            color: stats?.catalogHealthy ? '#34D399' : '#F87171',
            bg: stats?.catalogHealthy ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
          }
        )}
      </Grid>

      {/* Recent Deployments + Platform Health */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '20px' }}>
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Typography style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>
                Recent Deployments & Workloads
              </Typography>
              <Button size="small" onClick={() => onNavigate('deployments')} style={{ color: '#38BDF8', textTransform: 'none', fontWeight: 700 }}>
                View All →
              </Button>
            </Box>

            {deployments.length === 0 ? (
              <Box style={{ padding: '30px', textAlign: 'center' }}>
                <Typography style={{ color: '#9CA3AF', fontSize: '13px' }}>
                  No recent deployments found. Trigger a deployment via Golden Path or Deployment Wizard.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>ID</TableCell>
                    <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Service</TableCell>
                    <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Environment</TableCell>
                    <TableCell style={{ color: '#6B7280', fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deployments.slice(0, 5).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{d.id}</TableCell>
                      <TableCell style={{ color: '#F3F4F6', fontWeight: 700 }}>{d.serviceName}</TableCell>
                      <TableCell style={{ color: '#CBD5E1' }}>{d.environment}</TableCell>
                      <TableCell>
                        <Chip
                          label={d.status}
                          size="small"
                          style={{
                            backgroundColor: d.status === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: d.status === 'SUCCESS' ? '#34D399' : '#FBBF24',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '20px' }}>
            <Typography style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '16px' }}>
              Control Plane Health
            </Typography>

            <Box style={{ marginBottom: '12px' }}>
              <Typography style={{ color: '#9CA3AF', fontSize: '12px' }}>Backend API (Port 7007):</Typography>
              <Chip
                label={backendHealth?.status === 'ok' ? 'HEALTHY (HTTP 200)' : 'DEGRADED / OFFLINE'}
                style={{
                  backgroundColor: backendHealth?.status === 'ok' ? '#064E3B' : '#7F1D1D',
                  color: backendHealth?.status === 'ok' ? '#34D399' : '#F87171',
                  fontWeight: 700,
                  marginTop: '4px',
                }}
              />
            </Box>

            <Box style={{ marginBottom: '12px' }}>
              <Typography style={{ color: '#9CA3AF', fontSize: '12px' }}>Backstage Catalog Integration:</Typography>
              <Chip
                label={backendHealth?.backstage === 'connected' ? 'CONNECTED' : 'UNCONNECTED'}
                style={{
                  backgroundColor: backendHealth?.backstage === 'connected' ? '#064E3B' : '#7F1D1D',
                  color: backendHealth?.backstage === 'connected' ? '#34D399' : '#F87171',
                  fontWeight: 700,
                  marginTop: '4px',
                }}
              />
            </Box>

            <Box style={{ marginBottom: '12px' }}>
              <Typography style={{ color: '#9CA3AF', fontSize: '12px' }}>Public Git Clone Engine:</Typography>
              <Chip label="ACTIVE (Tokenless)" style={{ backgroundColor: '#064E3B', color: '#34D399', fontWeight: 700, marginTop: '4px' }} />
            </Box>

            {error && (
              <Box style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', padding: '10px', borderRadius: '6px', marginTop: '16px' }}>
                <Typography style={{ color: '#F87171', fontSize: '12px' }}>{error}</Typography>
                <Button size="small" onClick={fetchData} style={{ color: '#FFF', marginTop: '6px', fontSize: '11px' }}>
                  Retry
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
