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

export const ProjectsView: React.FC = () => {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalogProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${BACKEND_URL}/api/platform/catalog/entities`, {}, 5000);
      if (Array.isArray(data)) setEntities(data);
    } catch {
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogProjects();
  }, []);

  // Group entities by system or owner
  const systems = Array.from(new Set(entities.map((e) => e.spec?.system || 'default')));

  return (
    <Box style={{ maxWidth: '1100px' }}>
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <Box>
          <Typography style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6' }}>
            Project Workspaces & Systems
          </Typography>
          <Typography style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>
            Logical isolation, ownership grouping, and resource hierarchy based on Backstage Catalog.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={fetchCatalogProjects}
          startIcon={<RefreshIcon />}
          style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
        >
          Refresh Workspaces
        </Button>
      </Box>

      {loading ? (
        <Box style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <CircularProgress style={{ color: '#38BDF8' }} />
        </Box>
      ) : systems.length === 0 ? (
        <Paper style={{ backgroundColor: '#111827', padding: '40px', borderRadius: '8px', border: '1px solid #1F2937', textAlign: 'center' }}>
          <Typography style={{ color: '#9CA3AF', fontSize: '14px' }}>
            No project workspaces found. Register a service via Golden Path or Backstage Catalog.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {systems.map((sysName) => {
            const sysEntities = entities.filter((e) => (e.spec?.system || 'default') === sysName);
            const components = sysEntities.filter((e) => e.kind === 'Component');
            const apis = sysEntities.filter((e) => e.kind === 'API');
            const resources = sysEntities.filter((e) => e.kind === 'Resource');

            return (
              <Grid item xs={12} md={4} key={sysName}>
                <Paper style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '8px', border: '1px solid #1F2937' }}>
                  <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#38BDF8', textTransform: 'capitalize' }}>
                      {sysName} Workspace
                    </Typography>
                    <Chip label="Catalog System" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#34D399', fontWeight: 700 }} />
                  </Box>
                  <Typography style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '16px' }}>
                    Registered Services: {sysEntities.length} Total
                  </Typography>

                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Paper style={{ backgroundColor: '#1F2937', padding: '8px', textAlign: 'center' }}>
                        <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#F3F4F6' }}>{components.length}</Typography>
                        <Typography style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Services</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper style={{ backgroundColor: '#1F2937', padding: '8px', textAlign: 'center' }}>
                        <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#A78BFA' }}>{apis.length}</Typography>
                        <Typography style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>APIs</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper style={{ backgroundColor: '#1F2937', padding: '8px', textAlign: 'center' }}>
                        <Typography style={{ fontSize: '18px', fontWeight: 800, color: '#FBBF24' }}>{resources.length}</Typography>
                        <Typography style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase' }}>Infra</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};
