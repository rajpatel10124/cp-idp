import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Button,
} from '@material-ui/core';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

export const LogsView: React.FC = () => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedDepId, setSelectedDepId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${BACKEND_URL}/api/platform/deployments`, {}, 5000);
      if (Array.isArray(data)) {
        setDeployments(data);
        if (data.length > 0 && !selectedDepId) {
          setSelectedDepId(data[0].id);
        }
      }
    } catch {
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const activeDeployment = deployments.find((d) => d.id === selectedDepId) || deployments[0];
  const logsList: string[] = activeDeployment?.logs || [];

  const filteredLogs = logsList.filter((line) =>
    line.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box style={{ maxWidth: '1100px' }}>
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Box>
          <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
            Live Log Streamer
          </Typography>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Real-time execution, build, container runtime, and health-check logs.
          </Typography>
        </Box>

        <Box style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={fetchDeployments}
            startIcon={<RefreshIcon />}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Refresh Stream
          </Button>

          {deployments.length > 0 && (
            <TextField
              select
              variant="outlined"
              size="small"
              value={selectedDepId}
              onChange={(e) => setSelectedDepId(e.target.value)}
              style={{ width: '220px', backgroundColor: '#111827' }}
              InputProps={{ style: { color: '#F3F4F6' } }}
            >
              {deployments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.serviceName} ({d.id})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            placeholder="Search log output..."
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px', backgroundColor: '#111827' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: '#9CA3AF' }} />
                </InputAdornment>
              ),
              style: { color: '#F3F4F6' },
            }}
          />
        </Box>
      </Box>

      <Paper
        style={{
          backgroundColor: '#090D16',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #1F2937',
          fontFamily: 'monospace, sans-serif',
          minHeight: '450px',
          maxHeight: '650px',
          overflowY: 'auto',
        }}
      >
        {loading ? (
          <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <CircularProgress style={{ color: '#38BDF8' }} />
          </Box>
        ) : deployments.length === 0 ? (
          <Box style={{ padding: '60px', textAlign: 'center' }}>
            <Typography style={{ color: '#9CA3AF', fontSize: '14px' }}>
              No active deployment logs found. Trigger a service deployment via Golden Path or Deployment Wizard to observe real execution logs.
            </Typography>
          </Box>
        ) : filteredLogs.length === 0 ? (
          <Box style={{ padding: '40px', textAlign: 'center' }}>
            <Typography style={{ color: '#9CA3AF', fontSize: '13px' }}>
              No log lines matching query "{search}".
            </Typography>
          </Box>
        ) : (
          filteredLogs.map((logLine, idx) => (
            <Box key={idx} style={{ marginBottom: '6px', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <Typography
                style={{
                  color: logLine.includes('FAILED') || logLine.includes('Error')
                    ? '#F87171'
                    : logLine.includes('✓') || logLine.includes('SUCCESS')
                    ? '#34D399'
                    : logLine.includes('Step')
                    ? '#38BDF8'
                    : '#D1D5DB',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                }}
              >
                {logLine}
              </Typography>
            </Box>
          ))
        )}
      </Paper>
    </Box>
  );
};
