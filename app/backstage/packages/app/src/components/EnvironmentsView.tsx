import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  CircularProgress,
  Button,
} from '@material-ui/core';
import { Refresh as RefreshIcon } from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

export const EnvironmentsView: React.FC = () => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnvironmentsData = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${BACKEND_URL}/api/platform/deployments`, {}, 5000);
      if (Array.isArray(data)) setDeployments(data);
    } catch {
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironmentsData();
  }, []);

  const envs = [
    {
      name: 'Development',
      key: 'development',
      cluster: 'Local Docker / Minikube Kind Cluster',
      color: '#064E3B',
      textColor: '#34D399',
    },
    {
      name: 'Staging',
      key: 'staging',
      cluster: 'Staging Kubernetes Target / Kind',
      color: '#78350F',
      textColor: '#FBBF24',
    },
    {
      name: 'Production',
      key: 'production',
      cluster: 'AWS EKS / Production Workloads',
      color: '#831843',
      textColor: '#F472B6',
    },
  ];

  return (
    <Box style={{ maxWidth: '1100px' }}>
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <Box>
          <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
            Environments & Workload Matrix
          </Typography>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Environment isolation and live workloads across Development, Staging, and Production targets.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={fetchEnvironmentsData}
          startIcon={<RefreshIcon />}
          style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
        >
          Refresh Workloads
        </Button>
      </Box>

      {loading ? (
        <Box style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <CircularProgress style={{ color: '#38BDF8' }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {envs.map((e) => {
            const envWorkloads = deployments.filter((d) => (d.environment || 'development').toLowerCase() === e.key);
            return (
              <Grid item xs={12} md={4} key={e.name}>
                <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937', height: '100%' }}>
                  <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6' }}>{e.name}</Typography>
                    <Chip label={`${envWorkloads.length} Workloads`} size="small" style={{ backgroundColor: e.color, color: e.textColor, fontWeight: 700 }} />
                  </Box>
                  <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '16px' }}>
                    {e.cluster}
                  </Typography>

                  <Typography style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Deployed Services:
                  </Typography>
                  {envWorkloads.length === 0 ? (
                    <Typography style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                      No active workloads deployed to {e.name}.
                    </Typography>
                  ) : (
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {envWorkloads.map((w) => (
                        <Paper key={w.id} style={{ backgroundColor: '#1F2937', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography style={{ fontSize: '13px', color: '#F3F4F6', fontWeight: 600 }}>{w.serviceName}</Typography>
                          <Chip
                            label={w.status}
                            size="small"
                            style={{
                              backgroundColor: w.status === 'SUCCESS' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: w.status === 'SUCCESS' ? '#34D399' : '#F87171',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                          />
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};
