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
  Error as ErrorIcon,
  CheckCircle as HealthyIcon,
  OpenInNew as LaunchIcon,
  Speed as DoraIcon,
  Storage as K8sIcon,
  Description as DocsIcon,
  Subject as LogsIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface TelemetryData {
  rps: string;
  p50Latency: string;
  p95Latency: string;
  p99Latency: string;
  errorRate: string;
  cpuUsage: string;
  memoryUsage: string;
}

interface ServiceTelemetry {
  serviceName: string;
  environment: string;
  namespace: string;
  status: string;
}

interface DiagnosticsData {
  prometheus: string;
  prometheusQueryApi: string;
  targets: string;
  grafana: string;
  grafanaDatasource: string;
  grafanaDashboard: string;
  registeredServicesCount: number;
}

interface DoraMetrics {
  deploymentFrequency: string;
  leadTimeForChanges: string;
  changeFailureRate: string;
  meanTimeToRecovery: string;
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
}

export const ObservabilityView: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string>('orders-api');
  const [timeRange, setTimeRange] = useState<string>('15m');
  const [autoRefresh, setAutoRefresh] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  const [promConfigured, setPromConfigured] = useState(false);
  const [hasTelemetry, setHasTelemetry] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [grafanaUrl, setGrafanaUrl] = useState('http://localhost:3001');
  const [grafanaHealthy, setGrafanaHealthy] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [servicesList, setServicesList] = useState<ServiceTelemetry[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [dora, setDora] = useState<DoraMetrics | null>(null);

  const fetchObservabilityData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Metrics & PromQL
      const metricsData = await fetchJson(
        `${BACKEND_URL}/api/platform/observability/metrics?service=${selectedService}&range=${timeRange}`,
        {},
        5000
      );

      if (metricsData?.success) {
        setPromConfigured(!!metricsData.prometheusConfigured);
        setHasTelemetry(!!metricsData.hasTelemetry);
        setErrorMessage(metricsData.error || metricsData.message || null);
        if (metricsData.grafanaUrl) setGrafanaUrl(metricsData.grafanaUrl);
        setGrafanaHealthy(!!metricsData.grafanaHealthy);
        setTelemetry(metricsData.telemetry || null);
        setServicesList(metricsData.servicesList || []);
      }

      // 2. Fetch Diagnostics
      const diagData = await fetchJson(`${BACKEND_URL}/api/platform/observability/diagnostics`, {}, 5000);
      if (diagData?.success) {
        setDiagnostics(diagData.diagnostics);
      }

      // 3. Fetch DORA Metrics
      const doraData = await fetchJson(`${BACKEND_URL}/api/platform/observability/dora`, {}, 5000);
      if (doraData?.success) {
        setDora(doraData.dora);
      }
    } catch (err: any) {
      setPromConfigured(false);
      setHasTelemetry(false);
      setErrorMessage(`Backend Observability API Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObservabilityData();
  }, [selectedService, timeRange]);

  useEffect(() => {
    if (autoRefresh === 0) return;
    const timer = setInterval(() => {
      fetchObservabilityData();
    }, autoRefresh * 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, selectedService, timeRange]);

  const handleOpenGrafana = () => {
    window.open(grafanaUrl, '_blank');
  };

  return (
    <Box style={{ maxWidth: '1200px' }}>
      {/* Top Controls Bar */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Box>
          <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
            Observability & Telemetry Center
          </Typography>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Real Prometheus PromQL metrics, provisioned Grafana dashboards, container utilization, and DORA performance metrics.
          </Typography>
        </Box>

        <Box style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Service Selector */}
          <Select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value as string)}
            variant="outlined"
            size="small"
            style={{ backgroundColor: '#111827', color: '#F3F4F6', borderRadius: '6px', fontSize: '13px', fontWeight: 600, minWidth: '160px' }}
          >
            <MenuItem value="all">All Services</MenuItem>
            <MenuItem value="orders-api">orders-api</MenuItem>
            <MenuItem value="payment-api">payment-api</MenuItem>
            <MenuItem value="worker-service">worker-service</MenuItem>
            {servicesList.map((s) => (
              <MenuItem key={s.serviceName} value={s.serviceName}>
                {s.serviceName}
              </MenuItem>
            ))}
          </Select>

          {/* Time Range Selector */}
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as string)}
            variant="outlined"
            size="small"
            style={{ backgroundColor: '#111827', color: '#F3F4F6', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <MenuItem value="5m">5 min</MenuItem>
            <MenuItem value="15m">15 min</MenuItem>
            <MenuItem value="30m">30 min</MenuItem>
            <MenuItem value="1h">1 hour</MenuItem>
            <MenuItem value="6h">6 hours</MenuItem>
            <MenuItem value="24h">24 hours</MenuItem>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outlined"
            onClick={fetchObservabilityData}
            startIcon={<RefreshIcon />}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>

          {/* Open Provisioned Grafana Action */}
          <Button
            variant="contained"
            onClick={handleOpenGrafana}
            startIcon={<LaunchIcon />}
            style={{ backgroundColor: '#F59E0B', color: '#000', fontWeight: 700, textTransform: 'none' }}
          >
            Open Grafana
          </Button>
        </Box>
      </Box>

      {/* Primary Integration Health Banner */}
      <Paper
        style={{
          backgroundColor: '#111827',
          padding: '16px 20px',
          borderRadius: '8px',
          border: promConfigured && hasTelemetry ? '1px solid #10B981' : promConfigured ? '1px solid #F59E0B' : '1px solid #EF4444',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {promConfigured && hasTelemetry ? (
            <HealthyIcon style={{ color: '#10B981', fontSize: '24px' }} />
          ) : promConfigured ? (
            <ErrorIcon style={{ color: '#F59E0B', fontSize: '24px' }} />
          ) : (
            <ErrorIcon style={{ color: '#EF4444', fontSize: '24px' }} />
          )}
          <Box>
            <Typography style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '14px' }}>
              Prometheus Telemetry Pipeline: {selectedService.toUpperCase()}
            </Typography>
            <Typography style={{ color: '#9CA3AF', fontSize: '12px' }}>
              {promConfigured && hasTelemetry
                ? `Prometheus scraping HTTP metrics at http://localhost:9090 | Active Service PromQL: service="${selectedService}"`
                : errorMessage || `Prometheus server unreachable at http://localhost:9090`}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={
            promConfigured && hasTelemetry
              ? 'PROMETHEUS ACTIVE'
              : promConfigured
              ? 'NO TELEMETRY DATA'
              : 'PROMETHEUS UNAVAILABLE'
          }
          size="small"
          style={{
            backgroundColor:
              promConfigured && hasTelemetry
                ? 'rgba(16,185,129,0.15)'
                : promConfigured
                ? 'rgba(245,158,11,0.15)'
                : 'rgba(239,68,68,0.15)',
            color:
              promConfigured && hasTelemetry
                ? '#10B981'
                : promConfigured
                ? '#F59E0B'
                : '#F87171',
            fontWeight: 700,
          }}
        />
      </Paper>

      {/* Telemetry Diagnostics Grid */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '20px', marginBottom: '28px' }}>
        <Typography style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6', marginBottom: '12px', textTransform: 'uppercase' }}>
          Telemetry Infrastructure Probes & Diagnostics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>PROMETHEUS</Typography>
            <Chip label={diagnostics?.prometheus || 'UNAVAILABLE'} size="small" style={{ backgroundColor: diagnostics?.prometheus === 'CONNECTED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: diagnostics?.prometheus === 'CONNECTED' ? '#10B981' : '#F87171', fontWeight: 700, marginTop: '4px' }} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>PROMQL QUERY API</Typography>
            <Chip label={diagnostics?.prometheusQueryApi || 'FAIL'} size="small" style={{ backgroundColor: diagnostics?.prometheusQueryApi === 'PASS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: diagnostics?.prometheusQueryApi === 'PASS' ? '#10B981' : '#F87171', fontWeight: 700, marginTop: '4px' }} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>ACTIVE TARGETS</Typography>
            <Typography style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8', marginTop: '4px' }}>{diagnostics?.targets || '0 healthy'}</Typography>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>GRAFANA ENGINE</Typography>
            <Chip label={diagnostics?.grafana || 'UNAVAILABLE'} size="small" style={{ backgroundColor: diagnostics?.grafana === 'CONNECTED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: diagnostics?.grafana === 'CONNECTED' ? '#10B981' : '#F87171', fontWeight: 700, marginTop: '4px' }} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>GRAFANA DATASOURCE</Typography>
            <Chip label={diagnostics?.grafanaDatasource || 'ERROR'} size="small" style={{ backgroundColor: diagnostics?.grafanaDatasource === 'CONNECTED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: diagnostics?.grafanaDatasource === 'CONNECTED' ? '#10B981' : '#F87171', fontWeight: 700, marginTop: '4px' }} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>DASHBOARD PROVISION</Typography>
            <Chip label={diagnostics?.grafanaDashboard || 'MISSING'} size="small" style={{ backgroundColor: diagnostics?.grafanaDashboard === 'PROVISIONED' ? 'rgba(167,139,250,0.15)' : 'rgba(239,68,68,0.15)', color: diagnostics?.grafanaDashboard === 'PROVISIONED' ? '#A78BFA' : '#F87171', fontWeight: 700, marginTop: '4px' }} />
          </Grid>
        </Grid>
      </Paper>

      {/* Metrics Scorecards */}
      <Grid container spacing={3} style={{ marginBottom: '28px' }}>
        {/* HTTP Request Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
              HTTP Request Rate
            </Typography>
            <Typography style={{ fontSize: '26px', fontWeight: 800, color: promConfigured && hasTelemetry ? '#38BDF8' : '#6B7280', margin: '8px 0' }}>
              {promConfigured && hasTelemetry ? (telemetry?.rps || '0.00 req/s') : 'Metrics unavailable'}
            </Typography>
            <Typography style={{ fontSize: '11px', color: '#9CA3AF' }}>
              PromQL: <code>sum(rate(http_request...[5m]))</code>
            </Typography>
          </Paper>
        </Grid>

        {/* P95 Latency */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
              P95 Request Latency
            </Typography>
            <Typography style={{ fontSize: '26px', fontWeight: 800, color: promConfigured && hasTelemetry ? '#10B981' : '#6B7280', margin: '8px 0' }}>
              {promConfigured && hasTelemetry ? (telemetry?.p95Latency || 'N/A') : 'Metrics unavailable'}
            </Typography>
            <Typography style={{ fontSize: '11px', color: '#9CA3AF' }}>
              P50: {telemetry?.p50Latency || 'N/A'} | P99: {telemetry?.p99Latency || 'N/A'}
            </Typography>
          </Paper>
        </Grid>

        {/* HTTP 5xx Error Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
              HTTP 5xx Error Rate
            </Typography>
            <Typography style={{ fontSize: '26px', fontWeight: 800, color: promConfigured && hasTelemetry ? '#34D399' : '#6B7280', margin: '8px 0' }}>
              {promConfigured && hasTelemetry ? (telemetry?.errorRate || '0.00%') : 'Metrics unavailable'}
            </Typography>
            <Chip
              label={promConfigured && hasTelemetry ? 'HEALTHY' : 'NO TELEMETRY'}
              size="small"
              style={{
                backgroundColor: promConfigured && hasTelemetry ? 'rgba(16,185,129,0.15)' : '#1F2937',
                color: promConfigured && hasTelemetry ? '#34D399' : '#9CA3AF',
                fontWeight: 700,
                marginTop: '4px',
              }}
            />
          </Paper>
        </Grid>

        {/* Container Utilization */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper style={{ backgroundColor: '#111827', padding: '20px', borderRadius: '8px', border: '1px solid #1F2937' }}>
            <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>
              Container Workload
            </Typography>
            <Typography style={{ fontSize: '18px', fontWeight: 800, color: promConfigured && hasTelemetry ? '#A78BFA' : '#6B7280', marginTop: '8px' }}>
              CPU: {promConfigured && hasTelemetry ? (telemetry?.cpuUsage || 'N/A') : 'N/A'}
            </Typography>
            <Typography style={{ fontSize: '12px', color: '#D1D5DB', marginTop: '4px' }}>
              Mem: {promConfigured && hasTelemetry ? (telemetry?.memoryUsage || 'N/A') : 'N/A'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* DORA Metrics Section */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '24px', marginBottom: '28px' }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <DoraIcon style={{ color: '#F59E0B' }} />
          <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6' }}>
            DORA Engineering Performance Metrics
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box style={{ backgroundColor: '#090D16', padding: '16px', borderRadius: '6px', border: '1px solid #1F2937' }}>
              <Typography style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>DEPLOYMENT FREQUENCY</Typography>
              <Typography style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', marginTop: '6px' }}>
                {dora?.deploymentFrequency || 'INSUFFICIENT DATA'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box style={{ backgroundColor: '#090D16', padding: '16px', borderRadius: '6px', border: '1px solid #1F2937' }}>
              <Typography style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>LEAD TIME FOR CHANGES</Typography>
              <Typography style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '6px' }}>
                {dora?.leadTimeForChanges || 'INSUFFICIENT DATA'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box style={{ backgroundColor: '#090D16', padding: '16px', borderRadius: '6px', border: '1px solid #1F2937' }}>
              <Typography style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>CHANGE FAILURE RATE</Typography>
              <Typography style={{ fontSize: '16px', fontWeight: 800, color: '#34D399', marginTop: '6px' }}>
                {dora?.changeFailureRate || '0.0%'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box style={{ backgroundColor: '#090D16', padding: '16px', borderRadius: '6px', border: '1px solid #1F2937' }}>
              <Typography style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700 }}>MEAN TIME TO RECOVERY</Typography>
              <Typography style={{ fontSize: '16px', fontWeight: 800, color: '#A78BFA', marginTop: '6px' }}>
                {dora?.meanTimeToRecovery || 'INSUFFICIENT DATA'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Cross-Platform IDP Navigation Connections */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', padding: '24px' }}>
        <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#F3F4F6', marginBottom: '16px' }}>
          Cross-Platform Navigation Links for '{selectedService}'
        </Typography>

        <Box style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<DocsIcon />}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
            onClick={() => (window.location.href = `/docs?service=${selectedService}`)}
          >
            View TechDocs
          </Button>

          <Button
            variant="outlined"
            startIcon={<LogsIcon />}
            style={{ color: '#34D399', borderColor: '#059669', textTransform: 'none', fontWeight: 700 }}
            onClick={() => (window.location.href = `/logs?service=${selectedService}`)}
          >
            View Live Logs
          </Button>

          <Button
            variant="outlined"
            startIcon={<K8sIcon />}
            style={{ color: '#A78BFA', borderColor: '#7C3AED', textTransform: 'none', fontWeight: 700 }}
            onClick={() => (window.location.href = `/infrastructure?service=${selectedService}`)}
          >
            View Environment
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
