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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  Search as SearchIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Assessment as MetricsIcon,
  Receipt as LogsIcon,
} from '@material-ui/icons';

import { ServiceDeleteModal } from './ServiceDeleteModal';

const BACKEND_URL = 'http://localhost:7007';

export const ServicesView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetServiceName, setTargetServiceName] = useState('');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState(0);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const allComponents: any[] = [];

    // 1. Real Backstage Catalog API
    try {
      const res = await fetch(`${BACKEND_URL}/api/catalog/entities?filter=kind=Component`);
      if (!res.ok) throw new Error(`Catalog API returned HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        allComponents.push(...data.filter((e: any) => e.kind === 'Component'));
      }
    } catch (err: any) {
      setError(err.message);
    }

    // 2. Platform-registered entities (from Golden Path)
    try {
      const res2 = await fetch(`${BACKEND_URL}/api/platform/catalog/entities`);
      if (res2.ok) {
        const platform = await res2.json();
        if (Array.isArray(platform)) {
          const existing = new Set(allComponents.map((e: any) => e.metadata.name));
          allComponents.push(...platform.filter((e: any) => e.kind === 'Component' && !existing.has(e.metadata.name)));
        }
      }
    } catch {}

    setServices(allComponents);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 20000);
    return () => clearInterval(interval);
  }, [fetchServices]);

  const filtered = services.filter(e =>
    e.metadata.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.metadata.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.spec?.owner || '').toLowerCase().includes(search.toLowerCase())
  );

  const isForgeOps = (e: any) => !!e.metadata?.annotations?.['forgeops.io/created-via'];

  return (
    <Box>
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <Box>
          <Typography style={{ fontSize: '22px', fontWeight: 800, color: '#F3F4F6' }}>
            Services & Workloads
          </Typography>
          <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
            All registered Component-kind entities from Backstage Catalog.
          </Typography>
        </Box>
        <Box style={{ display: 'flex', gap: '8px' }}>
          <TextField
            placeholder="Filter services..."
            variant="outlined"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '240px', backgroundColor: '#111827', borderRadius: '6px' }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon style={{ color: '#9CA3AF', fontSize: '18px' }} /></InputAdornment>,
              style: { color: '#F3F4F6', fontSize: '13px' },
            }}
          />
          <Tooltip title="Refresh from catalog API">
            <IconButton size="small" onClick={fetchServices} disabled={loading}
              style={{ color: '#9CA3AF', border: '1px solid #374151', borderRadius: '6px' }}>
              {loading ? <CircularProgress size={16} style={{ color: '#38BDF8' }} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => onNavigate('templates')}
            style={{ backgroundColor: '#0284C7', color: '#FFF', textTransform: 'none', fontWeight: 700 }}
          >
            Create Service
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1F2937', overflow: 'hidden' }}>
        {loading ? (
          <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px' }}>
            <CircularProgress style={{ color: '#38BDF8', marginBottom: '12px' }} />
            <Typography style={{ color: '#9CA3AF', fontSize: '13px' }}>Fetching services from Backstage Catalog...</Typography>
          </Box>
        ) : error && services.length === 0 ? (
          <Box style={{ padding: '40px', textAlign: 'center' }}>
            <ErrorIcon style={{ color: '#EF4444', fontSize: '36px', marginBottom: '8px' }} />
            <Typography style={{ color: '#EF4444', fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
              Unable to load services
            </Typography>
            <Typography style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '16px' }}>{error}</Typography>
            <Button variant="outlined" onClick={fetchServices}
              style={{ color: '#38BDF8', borderColor: '#38BDF8', textTransform: 'none', marginRight: '8px' }}>
              Retry
            </Button>
            <Button variant="text" onClick={() => onNavigate('settings')}
              style={{ color: '#9CA3AF', textTransform: 'none' }}>
              Check Settings
            </Button>
          </Box>
        ) : filtered.length === 0 ? (
          <Box style={{ padding: '60px', textAlign: 'center' }}>
            <Typography style={{ color: '#6B7280', fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
              {search ? 'No services match your filter' : 'No services registered yet'}
            </Typography>
            <Typography style={{ color: '#4B5563', fontSize: '13px', marginBottom: '20px' }}>
              {search ? 'Try a different search term.' : 'Create your first service via a Golden Path template.'}
            </Typography>
            {!search && (
              <Button variant="contained" onClick={() => onNavigate('templates')}
                style={{ backgroundColor: '#0284C7', color: '#FFF', textTransform: 'none', fontWeight: 700 }}>
                Create Service via Golden Path
              </Button>
            )}
          </Box>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow style={{ backgroundColor: '#0B0F19' }}>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Service</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Owner</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Lifecycle</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>System</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Source</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item, idx) => (
                  <TableRow key={`${item.metadata.name}-${idx}`}
                    style={{ borderBottom: '1px solid #1F2937', cursor: 'pointer' }}
                    hover
                    onClick={() => setSelectedService(item)}>
                    <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                      <Typography style={{ color: '#60A5FA', fontWeight: 700, fontSize: '13px' }}>
                        {item.metadata.name}
                      </Typography>
                      {item.metadata.title && (
                        <Typography style={{ color: '#6B7280', fontSize: '11px' }}>{item.metadata.title}</Typography>
                      )}
                    </TableCell>
                    <TableCell style={{ color: '#D1D5DB', fontSize: '12px', padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                      {item.spec?.owner || '—'}
                    </TableCell>
                    <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                      {item.spec?.lifecycle ? (
                        <Chip label={item.spec.lifecycle} size="small"
                          style={{
                            backgroundColor: item.spec.lifecycle === 'production' ? '#831843' : item.spec.lifecycle === 'development' ? '#064E3B' : '#1F2937',
                            color: item.spec.lifecycle === 'production' ? '#F472B6' : item.spec.lifecycle === 'development' ? '#34D399' : '#9CA3AF',
                            fontSize: '10px',
                          }} />
                      ) : <span style={{ color: '#4B5563', fontSize: '12px' }}>—</span>}
                    </TableCell>
                    <TableCell style={{ color: '#9CA3AF', fontSize: '12px', padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                      {item.spec?.system || '—'}
                    </TableCell>
                    <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                      {isForgeOps(item) ? (
                        <Chip label="ForgeOps" size="small"
                          style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', fontSize: '10px' }} />
                      ) : (
                        <Chip label="Catalog" size="small"
                          style={{ backgroundColor: '#1F2937', color: '#9CA3AF', fontSize: '10px' }} />
                      )}
                    </TableCell>
                    <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }} onClick={e => e.stopPropagation()}>
                      <Box style={{ display: 'flex', gap: '6px' }}>
                        <Tooltip title="View Logs">
                          <Button size="small" variant="outlined" onClick={() => onNavigate('logs')}
                            style={{ color: '#38BDF8', borderColor: '#374151', textTransform: 'none', fontSize: '11px', padding: '2px 8px' }}>
                            Logs
                          </Button>
                        </Tooltip>
                        <Tooltip title="View Metrics">
                          <Button size="small" variant="outlined" onClick={() => onNavigate('observability')}
                            style={{ color: '#A78BFA', borderColor: '#374151', textTransform: 'none', fontSize: '11px', padding: '2px 8px' }}>
                            Metrics
                          </Button>
                        </Tooltip>
                        <Tooltip title="Delete Service & Clean Resources">
                          <Button size="small" variant="outlined" onClick={() => {
                            setTargetServiceName(item.metadata.name);
                            setDeleteModalOpen(true);
                          }}
                            style={{ color: '#EF4444', borderColor: '#7F1D1D', textTransform: 'none', fontSize: '11px', padding: '2px 8px' }}>
                            Delete
                          </Button>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box style={{ padding: '10px 16px', borderTop: '1px solid #1F2937' }}>
              <Typography style={{ color: '#4B5563', fontSize: '11px' }}>
                {filtered.length} service{filtered.length !== 1 ? 's' : ''} • Source: /api/catalog/entities • Auto-refreshes every 20s
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Service Detail Dialog */}
      {selectedService && (
        <Dialog open onClose={() => setSelectedService(null)} maxWidth="md" fullWidth
          PaperProps={{ style: { backgroundColor: '#111827', color: '#F3F4F6', border: '1px solid #1F2937' } }}>
          <DialogTitle style={{ borderBottom: '1px solid #1F2937', padding: '16px 20px' }}>
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#60A5FA' }}>
                  {selectedService.metadata.name}
                </Typography>
                <Typography style={{ fontSize: '12px', color: '#6B7280' }}>
                  {selectedService.spec?.type} · {selectedService.spec?.owner}
                </Typography>
              </Box>
              <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedService.spec?.lifecycle && (
                  <Chip label={selectedService.spec.lifecycle} size="small"
                    style={{
                      backgroundColor: selectedService.spec.lifecycle === 'production' ? '#831843' : '#064E3B',
                      color: selectedService.spec.lifecycle === 'production' ? '#F472B6' : '#34D399',
                    }} />
                )}
                <IconButton size="small" onClick={() => setSelectedService(null)} style={{ color: '#6B7280' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent style={{ padding: 0 }}>
            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)}
              style={{ borderBottom: '1px solid #1F2937', paddingLeft: '16px' }}>
              <Tab label="Overview" style={{ color: detailTab === 0 ? '#38BDF8' : '#9CA3AF', fontSize: '12px', textTransform: 'none' }} />
              <Tab label="Catalog Entity" style={{ color: detailTab === 1 ? '#38BDF8' : '#9CA3AF', fontSize: '12px', textTransform: 'none' }} />
              <Tab label="Kubernetes" style={{ color: detailTab === 2 ? '#38BDF8' : '#9CA3AF', fontSize: '12px', textTransform: 'none' }} />
            </Tabs>

            <Box style={{ padding: '20px' }}>
              {detailTab === 0 && (
                <Box>
                  <Typography style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '12px' }}>
                    {selectedService.metadata.description || 'No description provided.'}
                  </Typography>
                  <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Kind', value: selectedService.kind },
                      { label: 'Type', value: selectedService.spec?.type || '—' },
                      { label: 'Owner', value: selectedService.spec?.owner || '—' },
                      { label: 'System', value: selectedService.spec?.system || '—' },
                      { label: 'Lifecycle', value: selectedService.spec?.lifecycle || '—' },
                    ].map(({ label, value }) => (
                      <Box key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#1F2937', borderRadius: '6px' }}>
                        <Typography style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{label}</Typography>
                        <Typography style={{ fontSize: '12px', color: '#F3F4F6' }}>{value}</Typography>
                      </Box>
                    ))}
                  </Box>

                  <Box style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1F2937', borderRadius: '6px', border: '1px solid #374151' }}>
                    <Typography style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>DEPLOYMENT ENGINE STATUS</Typography>
                    <Typography style={{ fontSize: '13px', color: selectedService.spec?.lifecycle === 'production' ? '#F472B6' : '#34D399', fontWeight: 700, marginTop: '4px' }}>
                      ✓ Target: {selectedService.metadata?.annotations?.['forgeops.io/target'] || 'kubernetes-k8s'} | Namespace: {selectedService.spec?.lifecycle || 'development'}
                    </Typography>
                    <Typography style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                      Replicas: 2 | Health Probe: /healthz | CPU: 100m - 300m | Memory: 128Mi - 512Mi
                    </Typography>
                  </Box>
                </Box>
              )}

              {detailTab === 1 && (
                <Box style={{ backgroundColor: '#0B0F19', padding: '16px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#A78BFA', overflowX: 'auto' }}>
                  <pre style={{ margin: 0 }}>{JSON.stringify(selectedService, null, 2)}</pre>
                </Box>
              )}

              {detailTab === 2 && (
                <Box style={{ backgroundColor: '#0B0F19', padding: '16px', borderRadius: '6px' }}>
                  <Typography style={{ color: '#6B7280', fontSize: '12px', marginBottom: '8px' }}>
                    Example Kubernetes deployment spec for this service:
                  </Typography>
                  <pre style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38BDF8', margin: 0, whiteSpace: 'pre-wrap' }}>
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${selectedService.metadata.name}
  namespace: ${selectedService.spec?.lifecycle === 'production' ? 'production' : 'development'}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${selectedService.metadata.name}
  template:
    spec:
      containers:
        - name: ${selectedService.metadata.name}
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080`}
                  </pre>
                  <Typography style={{ color: '#FBBF24', fontSize: '11px', marginTop: '12px' }}>
                    ⚠ Live cluster state requires kubectl/Kubernetes integration to be configured.
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* Real Cloud Resource Deletion Lifecycle Modal */}
      <ServiceDeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        serviceName={targetServiceName}
        environment="development"
        onDeleted={fetchServices}
      />
    </Box>
  );
};
