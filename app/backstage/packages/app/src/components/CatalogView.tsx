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
  Tabs,
  Tab,
  CircularProgress,
  TextField,
  InputAdornment,
  Button,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  OpenInNew as OpenIcon,
} from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';
import { ServiceDeleteModal } from './ServiceDeleteModal';

const KIND_COLORS: Record<string, { bg: string; color: string }> = {
  Component: { bg: '#065F46', color: '#34D399' },
  System: { bg: '#1E3A5F', color: '#60A5FA' },
  API: { bg: '#581C87', color: '#C084FC' },
  Resource: { bg: '#78350F', color: '#FBBF24' },
  Group: { bg: '#1F2937', color: '#9CA3AF' },
  User: { bg: '#1F2937', color: '#9CA3AF' },
  Template: { bg: '#1F2937', color: '#9CA3AF' },
  Location: { bg: '#1F2937', color: '#9CA3AF' },
};

interface CatalogEntity {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description?: string;
    title?: string;
    annotations?: Record<string, string>;
    tags?: string[];
  };
  spec?: {
    owner?: string;
    lifecycle?: string;
    system?: string;
    type?: string;
  };
}

export const CatalogView: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const [entities, setEntities] = useState<CatalogEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeKind, setActiveKind] = useState('All');
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [lifecycleFilter, setLifecycleFilter] = useState('All');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetServiceName, setTargetServiceName] = useState('');

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);

    const allEntities: CatalogEntity[] = [];

    try {
      const data = await fetchJson(`${BACKEND_URL}/api/catalog/entities`);
      if (Array.isArray(data)) {
        allEntities.push(...data);
      } else if (data && Array.isArray(data.entities)) {
        allEntities.push(...data.entities);
      }
    } catch (err: any) {
      setError(err.message || 'Backstage Catalog unavailable');
    }

    try {
      const platformEntities = await fetchJson(`${BACKEND_URL}/api/platform/catalog/entities`);
      if (Array.isArray(platformEntities)) {
        const existingNames = new Set(allEntities.map(e => e.metadata?.name));
        for (const e of platformEntities) {
          if (e && e.metadata && !existingNames.has(e.metadata.name)) {
            allEntities.push(e);
          }
        }
      }
    } catch {}

    if (allEntities.length > 0) {
      setError(null);
    }
    setEntities(allEntities);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 30000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  const kinds = ['All', 'Component', 'System', 'API', 'Resource', 'Group', 'User', 'Template'];
  const displayKinds = kinds.filter(k => {
    if (k === 'All') return true;
    return entities.some(e => e.kind === k);
  });

  const owners = ['All', ...Array.from(new Set(entities.map(e => e.spec?.owner).filter(Boolean) as string[]))];
  const lifecycles = ['All', ...Array.from(new Set(entities.map(e => e.spec?.lifecycle).filter(Boolean) as string[]))];
  const displayableKinds = ['Component', 'System', 'API', 'Resource', 'Group', 'User', 'Template'];

  const filtered = entities.filter(e => {
    if (activeKind === 'All' && !displayableKinds.includes(e.kind)) return false;
    if (activeKind !== 'All' && e.kind !== activeKind) return false;
    if (ownerFilter !== 'All' && e.spec?.owner !== ownerFilter) return false;
    if (lifecycleFilter !== 'All' && e.spec?.lifecycle !== lifecycleFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      return (
        e.metadata.name.toLowerCase().includes(query) ||
        (e.metadata.description || '').toLowerCase().includes(query) ||
        (e.metadata.title || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <Box>
          <Typography style={{ fontSize: '22px', fontWeight: 800, color: '#F3F4F6' }}>
            Software Catalog
          </Typography>
          <Typography style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>
            Unified catalog of all software components, APIs, resources, and services.
            {lastRefresh && (
              <span style={{ marginLeft: '12px', color: '#6B7280', fontSize: '11px' }}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </Typography>
        </Box>
        <Box style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Tooltip title="Refresh Catalog">
            <IconButton onClick={fetchEntities} disabled={loading} style={{ color: '#9CA3AF', backgroundColor: '#1F2937', padding: '8px' }}>
              <RefreshIcon style={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>
          {onNavigate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => onNavigate('templates')}
              style={{ backgroundColor: '#0284C7', color: '#FFF', textTransform: 'none', fontWeight: 700, fontSize: '13px' }}>
              Create Component
            </Button>
          )}
        </Box>
      </Box>

      {/* Filter Toolbar */}
      <Paper style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <Box style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search catalog entities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            variant="outlined"
            size="small"
            style={{ flexGrow: 1, minWidth: '220px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: '#6B7280', fontSize: '18px' }} />
                </InputAdornment>
              ),
              style: { color: '#F3F4F6', backgroundColor: '#1F2937', borderRadius: '6px', fontSize: '13px' },
            }}
          />

          <FormControl size="small" style={{ minWidth: '130px' }}>
            <Select
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value as string)}
              displayEmpty
              style={{ color: '#F3F4F6', backgroundColor: '#1F2937', borderRadius: '6px', fontSize: '13px', padding: '0 8px' }}>
              <MenuItem value="All">All Owners</MenuItem>
              {owners.filter(o => o !== 'All').map(o => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" style={{ minWidth: '130px' }}>
            <Select
              value={lifecycleFilter}
              onChange={e => setLifecycleFilter(e.target.value as string)}
              displayEmpty
              style={{ color: '#F3F4F6', backgroundColor: '#1F2937', borderRadius: '6px', fontSize: '13px', padding: '0 8px' }}>
              <MenuItem value="All">All Lifecycles</MenuItem>
              {lifecycles.filter(l => l !== 'All').map(l => (
                <MenuItem key={l} value={l}>{l}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography style={{ color: '#6B7280', fontSize: '12px', marginLeft: 'auto' }}>
            Showing <strong>{filtered.length}</strong> of <strong>{entities.length}</strong> entities
          </Typography>
        </Box>

        {/* Kind Tabs */}
        <Box style={{ marginTop: '16px', borderTop: '1px solid #1F2937', paddingTop: '8px' }}>
          <Tabs
            value={displayKinds.indexOf(activeKind) >= 0 ? displayKinds.indexOf(activeKind) : 0}
            onChange={(_, val) => setActiveKind(displayKinds[val] || 'All')}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto">
            {displayKinds.map(k => {
              const count = k === 'All'
                ? entities.filter(e => displayableKinds.includes(e.kind)).length
                : entities.filter(e => e.kind === k).length;
              return (
                <Tab
                  key={k}
                  label={`${k} (${count})`}
                  style={{
                    color: activeKind === k ? '#38BDF8' : '#9CA3AF',
                    textTransform: 'none',
                    fontWeight: activeKind === k ? 700 : 400,
                    fontSize: '13px',
                    minWidth: '80px',
                  }}
                />
              );
            })}
          </Tabs>
        </Box>
      </Paper>

      {/* Main Content Area */}
      <Paper style={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <Box style={{ padding: '60px', textAlign: 'center' }}>
            <CircularProgress style={{ color: '#38BDF8', marginBottom: '16px' }} />
            <Typography style={{ color: '#9CA3AF', fontSize: '14px' }}>
              Loading Software Catalog entities...
            </Typography>
          </Box>
        ) : error && entities.length === 0 ? (
          <Box style={{ padding: '40px', textAlign: 'center' }}>
            <Typography style={{ color: '#EF4444', fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>
              Unable to load Software Catalog
            </Typography>
            <Typography style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </Typography>
            <Button
              variant="outlined"
              onClick={fetchEntities}
              style={{ color: '#38BDF8', borderColor: '#38BDF8', textTransform: 'none', fontWeight: 700 }}>
              Retry Catalog Request
            </Button>
          </Box>
        ) : filtered.length === 0 ? (
          <Box style={{ padding: '60px', textAlign: 'center' }}>
            <Typography style={{ color: '#9CA3AF', fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
              {search || ownerFilter !== 'All' || lifecycleFilter !== 'All'
                ? 'No entities match the selected filters'
                : 'No catalog entities found'}
            </Typography>
            <Typography style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
              {search ? 'Try adjusting your search terms.' : 'Create your first service component via Golden Path.'}
            </Typography>
            {onNavigate && (
              <Button
                variant="contained"
                onClick={() => onNavigate('templates')}
                style={{ backgroundColor: '#0284C7', color: '#FFF', textTransform: 'none', fontWeight: 700 }}>
                Create Service Component
              </Button>
            )}
          </Box>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow style={{ backgroundColor: '#0B0F19' }}>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Name</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Kind</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Owner</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Lifecycle</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>System</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Description</TableCell>
                  <TableCell style={{ color: '#6B7280', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #1F2937', padding: '10px 16px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item, idx) => {
                  const style = KIND_COLORS[item.kind] || { bg: '#1F2937', color: '#9CA3AF' };
                  return (
                    <TableRow key={`${item.metadata.name}-${idx}`} style={{ borderBottom: '1px solid #1F2937' }} hover>
                      <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                        <Typography style={{ color: '#60A5FA', fontWeight: 700, fontSize: '13px' }}>
                          {item.metadata.title || item.metadata.name}
                        </Typography>
                        <Typography style={{ color: '#6B7280', fontSize: '11px', fontFamily: 'monospace' }}>
                          {item.metadata.name}
                        </Typography>
                      </TableCell>
                      <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                        <Chip label={item.kind} size="small" style={{ backgroundColor: style.bg, color: style.color, fontSize: '11px', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell style={{ color: '#D1D5DB', fontSize: '12px', padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                        {item.spec?.owner || '—'}
                      </TableCell>
                      <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                        {item.spec?.lifecycle ? (
                          <Chip label={item.spec.lifecycle} size="small" style={{ backgroundColor: '#1F2937', color: '#9CA3AF', fontSize: '10px' }} />
                        ) : <span style={{ color: '#4B5563', fontSize: '12px' }}>—</span>}
                      </TableCell>
                      <TableCell style={{ color: '#9CA3AF', fontSize: '12px', padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                        {item.spec?.system || '—'}
                      </TableCell>
                      <TableCell style={{ color: '#9CA3AF', fontSize: '12px', padding: '10px 16px', borderBottom: '1px solid #1F2937', maxWidth: '300px' }}>
                        {item.metadata.description || '—'}
                      </TableCell>
                      <TableCell style={{ padding: '10px 16px', borderBottom: '1px solid #1F2937' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setTargetServiceName(item.metadata.name);
                            setDeleteModalOpen(true);
                          }}
                          style={{ color: '#EF4444', borderColor: '#7F1D1D', textTransform: 'none', fontSize: '11px', fontWeight: 700 }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Real Cloud Resource Deletion Modal */}
      <ServiceDeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        serviceName={targetServiceName}
        environment="development"
        onDeleted={fetchEntities}
      />
    </Box>
  );
};
