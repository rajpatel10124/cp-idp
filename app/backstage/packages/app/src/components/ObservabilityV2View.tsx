import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@material-ui/core';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  OpenInNew as LaunchIcon,
  Storage as ServerIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface V2Diagnostics {
  prometheus: string;
  prometheusUrl: string;
  prometheusQueryApi: string;
  cAdvisor: string;
  targets: string;
  grafana: string;
  grafanaUrl: string;
  grafanaDatasource: string;
  grafanaDashboard: string;
  dashboardUid: string;
}

interface V2Telemetry {
  cpuUsage: string;
  memoryUsage: string;
  networkRx: string;
  networkTx: string;
  requestRate: string | null;
  httpTelemetryAvailable: boolean;
  httpStatusNotice: string;
}

interface WorkloadItem {
  id: string;
  name: string;
  container: string;
  image: string;
  status: string;
  ports: string;
  startedAt: string;
}

export const ObservabilityV2View: React.FC = () => {
  const [selectedWorkload, setSelectedWorkload] = useState<string>('orders-api');
  const [timeRange, setTimeRange] = useState<string>('15m');
  const [loading, setLoading] = useState<boolean>(true);

  const [diagnostics, setDiagnostics] = useState<V2Diagnostics | null>(null);
  const [telemetry, setTelemetry] = useState<V2Telemetry | null>(null);
  const [workloads, setWorkloads] = useState<WorkloadItem[]>([]);
  const [grafanaUrl, setGrafanaUrl] = useState<string>('http://localhost:3002');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Diagnostics
      const diagData = await fetchJson(`${BACKEND_URL}/api/platform/observability-v2/diagnostics`, {}, 5000);
      if (diagData?.diagnostics) {
        setDiagnostics(diagData.diagnostics);
      }

      // 2. Workloads Inventory
      const wlData = await fetchJson(`${BACKEND_URL}/api/platform/observability-v2/workloads`, {}, 5000);
      if (wlData?.workloads) {
        setWorkloads(wlData.workloads);
      }

      // 3. Workload Telemetry
      const metricData = await fetchJson(
        `${BACKEND_URL}/api/platform/observability-v2/metrics?service=${selectedWorkload}&range=${timeRange}`,
        {},
        5000
      );

      if (metricData?.telemetry) {
        setTelemetry(metricData.telemetry);
        if (metricData.grafanaUrl) setGrafanaUrl(metricData.grafanaUrl);
      }
    } catch (e) {
      console.error('Error fetching V2 observability data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [selectedWorkload, timeRange]);

  return (
    <Box p={3} style={{ backgroundColor: '#0b0f19', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Top Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <ServerIcon style={{ fontSize: 32, marginRight: 12, color: '#38bdf8' }} />
          <Box>
            <Typography variant="h5" style={{ fontWeight: 700, color: '#f8fafc' }}>
              ForgeOps Observability V2 (Workload Telemetry Pipeline)
            </Typography>
            <Typography variant="body2" style={{ color: '#94a3b8' }}>
              cAdvisor Docker container metrics & Prometheus PromQL time-series discovery
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" style={{ gap: 12 }}>
          <Select
            value={selectedWorkload}
            onChange={e => setSelectedWorkload(e.target.value as string)}
            variant="outlined"
            style={{ backgroundColor: '#1e293b', color: '#f8fafc', height: 40 }}
          >
            <MenuItem value="orders-api">orders-api</MenuItem>
            <MenuItem value="payment-api">payment-api</MenuItem>
            <MenuItem value="worker-service">worker-service</MenuItem>
            <MenuItem value="forgeops-backend">forgeops-backend</MenuItem>
            <MenuItem value="forgeops-grafana">forgeops-grafana</MenuItem>
            <MenuItem value="forgeops-prometheus">forgeops-prometheus</MenuItem>
            {workloads.map(w => (
              <MenuItem key={w.id} value={w.name}>{w.name}</MenuItem>
            ))}
          </Select>

          <Select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as string)}
            variant="outlined"
            style={{ backgroundColor: '#1e293b', color: '#f8fafc', height: 40 }}
          >
            <MenuItem value="5m">5 Minutes</MenuItem>
            <MenuItem value="15m">15 Minutes</MenuItem>
            <MenuItem value="30m">30 Minutes</MenuItem>
            <MenuItem value="1h">1 Hour</MenuItem>
          </Select>

          <Button
            variant="contained"
            color="primary"
            startIcon={<LaunchIcon />}
            href={grafanaUrl}
            target="_blank"
            disabled={diagnostics?.grafanaDashboard !== 'PROVISIONED'}
            style={{ backgroundColor: diagnostics?.grafanaDashboard === 'PROVISIONED' ? '#0284c7' : '#475569', color: '#fff' }}
          >
            Open Grafana V2
          </Button>

          <Button
            variant="outlined"
            onClick={fetchData}
            startIcon={<RefreshIcon />}
            style={{ color: '#38bdf8', borderColor: '#0284c7' }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={24} style={{ color: '#38bdf8' }} />
        </Box>
      )}

      {/* Diagnostics Grid */}
      <Grid container spacing={2} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Paper style={{ padding: 16, backgroundColor: '#1e293b', borderLeft: '4px solid #38bdf8' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>PROMETHEUS V2</Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {diagnostics?.prometheus === 'CONNECTED' ? (
                <HealthyIcon style={{ color: '#4ade80', marginRight: 6 }} />
              ) : (
                <ErrorIcon style={{ color: '#f87171', marginRight: 6 }} />
              )}
              <Typography variant="subtitle2" style={{ color: '#f8fafc', fontWeight: 600 }}>
                {diagnostics?.prometheus || 'CHECKING'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Paper style={{ padding: 16, backgroundColor: '#1e293b', borderLeft: '4px solid #a855f7' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>PROMQL API</Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {diagnostics?.prometheusQueryApi === 'PASS' ? (
                <HealthyIcon style={{ color: '#4ade80', marginRight: 6 }} />
              ) : (
                <ErrorIcon style={{ color: '#f87171', marginRight: 6 }} />
              )}
              <Typography variant="subtitle2" style={{ color: '#f8fafc', fontWeight: 600 }}>
                {diagnostics?.prometheusQueryApi || 'CHECKING'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Paper style={{ padding: 16, backgroundColor: '#1e293b', borderLeft: '4px solid #3b82f6' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>cADVISOR ENGINE</Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {diagnostics?.cAdvisor === 'CONNECTED' ? (
                <HealthyIcon style={{ color: '#4ade80', marginRight: 6 }} />
              ) : (
                <ErrorIcon style={{ color: '#f87171', marginRight: 6 }} />
              )}
              <Typography variant="subtitle2" style={{ color: '#f8fafc', fontWeight: 600 }}>
                {diagnostics?.cAdvisor || 'CHECKING'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Paper style={{ padding: 16, backgroundColor: '#1e293b', borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>ACTIVE TARGETS</Typography>
            <Typography variant="subtitle2" style={{ color: '#f8fafc', fontWeight: 600, marginTop: 8 }}>
              {diagnostics?.targets || '0 healthy / 0 total'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Paper style={{ padding: 16, backgroundColor: '#1e293b', borderLeft: '4px solid #10b981' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>GRAFANA ENGINE</Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {diagnostics?.grafana === 'CONNECTED' ? (
                <HealthyIcon style={{ color: '#4ade80', marginRight: 6 }} />
              ) : (
                <ErrorIcon style={{ color: '#f87171', marginRight: 6 }} />
              )}
              <Typography variant="subtitle2" style={{ color: '#f8fafc', fontWeight: 600 }}>
                {diagnostics?.grafana || 'CHECKING'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Paper style={{ padding: 16, backgroundColor: '#1e293b', borderLeft: '4px solid #ec4899' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>V2 DASHBOARD</Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {diagnostics?.grafanaDashboard === 'PROVISIONED' ? (
                <Chip label="PROVISIONED" style={{ backgroundColor: '#166534', color: '#86efac', fontWeight: 700, height: 24 }} />
              ) : (
                <Chip label="MISSING" style={{ backgroundColor: '#991b1b', color: '#fca5a5', fontWeight: 700, height: 24 }} />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Metrics Cards */}
      <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 16, color: '#f8fafc' }}>
        Selected Workload Telemetry: <span style={{ color: '#38bdf8' }}>{selectedWorkload}</span>
      </Typography>

      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ padding: 20, backgroundColor: '#1e293b' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>CPU UTILIZATION (cAdvisor)</Typography>
            <Typography variant="h4" style={{ fontWeight: 700, color: '#38bdf8', marginTop: 8 }}>
              {telemetry?.cpuUsage || 'N/A'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ padding: 20, backgroundColor: '#1e293b' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>MEMORY USAGE (cAdvisor)</Typography>
            <Typography variant="h4" style={{ fontWeight: 700, color: '#a855f7', marginTop: 8 }}>
              {telemetry?.memoryUsage || 'N/A'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ padding: 20, backgroundColor: '#1e293b' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>NETWORK RECEIVE (RX)</Typography>
            <Typography variant="h4" style={{ fontWeight: 700, color: '#10b981', marginTop: 8 }}>
              {telemetry?.networkRx || 'N/A'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ padding: 20, backgroundColor: '#1e293b' }}>
            <Typography variant="caption" style={{ color: '#94a3b8' }}>NETWORK TRANSMIT (TX)</Typography>
            <Typography variant="h4" style={{ fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>
              {telemetry?.networkTx || 'N/A'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* HTTP Status Box */}
      <Paper style={{ padding: 20, backgroundColor: '#1e293b', borderLeft: '4px solid #0284c7', marginBottom: 32 }}>
        <Typography variant="subtitle1" style={{ fontWeight: 600, color: '#f8fafc' }}>
          Application HTTP Metrics Status
        </Typography>
        <Typography variant="body2" style={{ color: telemetry?.httpTelemetryAvailable ? '#4ade80' : '#fbbf24', marginTop: 4 }}>
          {telemetry?.httpStatusNotice || 'CHECKING WORKLOAD METRICS...'}
        </Typography>
        {telemetry?.requestRate && (
          <Typography variant="h5" style={{ color: '#38bdf8', fontWeight: 700, marginTop: 8 }}>
            Current Request Rate: {telemetry.requestRate}
          </Typography>
        )}
      </Paper>

      {/* Deployed Workloads Table */}
      <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 16, color: '#f8fafc' }}>
        Discovered Deployed Workloads (Read-Only Inventory)
      </Typography>
      <Paper style={{ backgroundColor: '#1e293b', overflowX: 'auto' }}>
        <Table>
          <TableHead style={{ backgroundColor: '#0f172a' }}>
            <TableRow>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>WORKLOAD NAME</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>CONTAINER / IMAGE</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>STATUS</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>PORTS</TableCell>
              <TableCell style={{ color: '#94a3b8', fontWeight: 700 }}>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workloads.map((w, idx) => (
              <TableRow key={idx} style={{ backgroundColor: selectedWorkload === w.name ? '#334155' : 'transparent' }}>
                <TableCell style={{ color: '#f8fafc', fontWeight: 600 }}>{w.name}</TableCell>
                <TableCell style={{ color: '#94a3b8' }}>{w.image}</TableCell>
                <TableCell>
                  <Chip
                    label={w.status}
                    size="small"
                    style={{
                      backgroundColor: w.status === 'RUNNING' ? '#166534' : '#991b1b',
                      color: w.status === 'RUNNING' ? '#86efac' : '#fca5a5',
                      fontWeight: 700,
                    }}
                  />
                </TableCell>
                <TableCell style={{ color: '#94a3b8' }}>{w.ports}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSelectedWorkload(w.name)}
                    style={{ color: '#38bdf8', borderColor: '#0284c7' }}
                  >
                    Select Workload
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};
