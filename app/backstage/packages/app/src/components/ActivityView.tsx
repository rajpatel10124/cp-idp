import React, { useEffect, useState } from 'react';
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
  TextField,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import { Refresh as RefreshIcon, History as HistoryIcon } from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface AuditEvent {
  id?: string;
  timestamp?: string;
  time?: string;
  actor?: string;
  action?: string;
  target?: string;
  resource?: string;
  result?: string;
  status?: string;
  details?: any;
}

export const ActivityView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actorFilter) params.append('actor', actorFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const data = await fetchJson(`${BACKEND_URL}/api/platform/audit/events?${params.toString()}`, {}, 5000);
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [actorFilter, actionFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditEvents();
  };

  return (
    <Box style={{ maxWidth: '1200px', paddingBottom: '40px' }}>
      {/* Top Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HistoryIcon style={{ color: '#38BDF8', fontSize: '28px' }} />
            <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
              Platform Audit Trail & Event Stream
            </Typography>
          </Box>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Immutable, event-driven log of all platform actions, security evaluations, and deployment operations.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={fetchAuditEvents}
          startIcon={<RefreshIcon />}
          style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
        >
          Refresh Trail
        </Button>
      </Box>

      {/* Filter Bar */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1F2937', padding: '20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Search Keyword (Actor, Action, Resource)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="outlined"
                InputLabelProps={{ style: { color: '#9CA3AF' } }}
                InputProps={{ style: { color: '#F3F4F6' } }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel style={{ color: '#9CA3AF' }}>Filter by Action</InputLabel>
                <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value as string)} label="Filter by Action" style={{ color: '#F3F4F6' }}>
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="DEPLOY_WORKLOAD">DEPLOY_WORKLOAD</MenuItem>
                  <MenuItem value="DELETE_DEPLOYMENT">DELETE_DEPLOYMENT</MenuItem>
                  <MenuItem value="PROVISION_GOLDEN_PATH">PROVISION_GOLDEN_PATH</MenuItem>
                  <MenuItem value="CREATE_ROLE">CREATE_ROLE</MenuItem>
                  <MenuItem value="ASSIGN_ROLE">ASSIGN_ROLE</MenuItem>
                  <MenuItem value="CREATE_POLICY">CREATE_POLICY</MenuItem>
                  <MenuItem value="ENABLE_POLICY">ENABLE_POLICY</MenuItem>
                  <MenuItem value="DISABLE_POLICY">DISABLE_POLICY</MenuItem>
                  <MenuItem value="TERRAFORM_PLAN">TERRAFORM_PLAN</MenuItem>
                  <MenuItem value="TERRAFORM_APPLY">TERRAFORM_APPLY</MenuItem>
                  <MenuItem value="POLICY_DENIED">POLICY_DENIED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel style={{ color: '#9CA3AF' }}>Filter by Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as string)} label="Filter by Status" style={{ color: '#F3F4F6' }}>
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="SUCCESS">SUCCESS</MenuItem>
                  <MenuItem value="FAILED">FAILED</MenuItem>
                  <MenuItem value="PASSED">PASSED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button type="submit" fullWidth variant="contained" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700 }}>
                Apply Filter
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Events Table */}
      <Paper style={{ backgroundColor: '#111827', borderRadius: '10px', border: '1px solid #1F2937', padding: '24px' }}>
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <CircularProgress style={{ color: '#38BDF8' }} />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow style={{ borderBottom: '1px solid #1F2937' }}>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Actor</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Action Event</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Target Resource</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700 }}>Status</TableCell>
                <TableCell style={{ color: '#9CA3AF', fontWeight: 700, textAlign: 'right' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((ev, i) => {
                const eventTime = ev.timestamp || ev.time || '';
                const displayTime = eventTime ? new Date(eventTime).toLocaleString() : 'N/A';
                const statusVal = ev.result || ev.status || 'SUCCESS';
                const isSuccess = statusVal === 'SUCCESS' || statusVal === 'PASSED';

                return (
                  <TableRow key={ev.id || i} style={{ borderBottom: '1px solid #1F2937' }}>
                    <TableCell style={{ color: '#9CA3AF', fontSize: '12px', fontFamily: 'monospace' }}>
                      {displayTime}
                    </TableCell>
                    <TableCell style={{ color: '#38BDF8', fontWeight: 700, fontSize: '14px' }}>
                      {ev.actor || 'system'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ev.action || 'UNKNOWN'}
                        size="small"
                        style={{ backgroundColor: '#1E293B', color: '#E2E8F0', fontWeight: 600, fontSize: '11px' }}
                      />
                    </TableCell>
                    <TableCell style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>
                      {ev.target || ev.resource || '-'}
                    </TableCell>
                    <TableCell>
                      {isSuccess ? (
                        <Chip label={statusVal} size="small" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#34D399', fontWeight: 700 }} />
                      ) : (
                        <Chip label={statusVal} size="small" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#F87171', fontWeight: 700 }} />
                      )}
                    </TableCell>
                    <TableCell style={{ textAlign: 'right' }}>
                      <Button
                        size="small"
                        onClick={() => setSelectedEvent(ev)}
                        style={{ color: '#38BDF8', textTransform: 'none', fontWeight: 600 }}
                      >
                        Inspect Payload
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Audit Event JSON Inspection Modal */}
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="md" fullWidth>
        <DialogTitle style={{ backgroundColor: '#1E293B', color: '#F8FAFC', fontWeight: 800 }}>
          Audit Event Inspection: {selectedEvent?.action}
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '20px' }}>
          <pre
            style={{
              backgroundColor: '#020617',
              padding: '16px',
              borderRadius: '8px',
              color: '#38BDF8',
              fontFamily: 'monospace',
              fontSize: '13px',
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(selectedEvent, null, 2)}
          </pre>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#1E293B', padding: '16px' }}>
          <Button onClick={() => setSelectedEvent(null)} variant="contained" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
