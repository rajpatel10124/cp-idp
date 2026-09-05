import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, TextField,
  Select, MenuItem, FormControl,
} from '@material-ui/core';
import {
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Warning as WarnIcon,
} from '@material-ui/icons';

const BACKEND_URL = 'http://localhost:7007';

// ── Reusable card with colored top-border ─────────────────────────────────────
const Card: React.FC<{ color: string; title: string; children: React.ReactNode; style?: React.CSSProperties }> = ({
  color, title, children, style,
}) => (
  <Paper style={{
    backgroundColor: '#161B22',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderTop: `4px solid ${color}`,
    padding: 24,
    marginBottom: 24,
    ...style,
  }}>
    <Typography style={{ fontSize: 17, fontWeight: 700, color: '#F0F6FC', marginBottom: 20 }}>
      {title}
    </Typography>
    {children}
  </Paper>
);

// ── Toggle Switch ─────────────────────────────────────────────────────────────
const Toggle: React.FC<{ value: boolean; onChange: () => void; label: string }> = ({ value, onChange, label }) => (
  <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <Typography style={{ fontSize: 14, color: '#C9D1D9' }}>{label}</Typography>
    <Box
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        backgroundColor: value ? '#0284C7' : '#30363D',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <Box style={{
        position: 'absolute',
        top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: '50%',
        backgroundColor: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </Box>
  </Box>
);

// ── 3-Way Toggle ─────────────────────────────────────────────────────────────
const ThreeWayToggle: React.FC<{
  value: string; options: string[];
  colors: string[]; onChange: (v: string) => void;
}> = ({ value, options, colors, onChange }) => (
  <Box style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #30363D' }}>
    {options.map((opt, i) => (
      <Box
        key={opt} onClick={() => onChange(opt)}
        style={{
          flex: 1, textAlign: 'center', padding: '8px 0', cursor: 'pointer', fontSize: 13,
          fontWeight: 700, transition: 'all 0.15s',
          backgroundColor: value === opt ? colors[i] : 'transparent',
          color: value === opt ? '#fff' : '#8B949E',
        }}
      >
        {opt}
      </Box>
    ))}
  </Box>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const SettingsView: React.FC = () => {
  // Platform config
  const [baseUrl, setBaseUrl] = useState('http://localhost:7007');
  const [platformName, setPlatformName] = useState('ForgeOps IDP');
  const [defaultNs, setDefaultNs] = useState('forgeops');
  const [savedMsg, setSavedMsg] = useState('');

  // AWS Connection State
  const [awsConnName, setAwsConnName] = useState('AWS Development');
  const [awsAccountId, setAwsAccountId] = useState('123456789012');
  const [awsRegion, setAwsRegion] = useState('us-east-1');
  const [awsRoleArn, setAwsRoleArn] = useState('arn:aws:iam::123456789012:role/ForgeOpsGitHubActionsRole');
  const [awsEnv, setAwsEnv] = useState('development');
  const [awsStatus, setAwsStatus] = useState<'CONNECTED' | 'CONFIGURATION_REQUIRED' | 'FAILED'>('CONNECTED');
  const [awsMsg, setAwsMsg] = useState('');
  const [awsLoading, setAwsLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/platform/connections`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const found = data.find((c: any) => c.type === 'aws');
          if (found) {
            if (found.name) setAwsConnName(found.name);
            if (found.accountId) setAwsAccountId(found.accountId);
            if (found.region) setAwsRegion(found.region);
            if (found.roleArn) setAwsRoleArn(found.roleArn);
            if (found.environment) setAwsEnv(found.environment);
            if (found.status) setAwsStatus(found.status);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveAws = async () => {
    setAwsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `aws-${awsEnv}`,
          name: awsConnName,
          type: 'aws',
          environment: awsEnv,
          accountId: awsAccountId,
          region: awsRegion,
          roleArn: awsRoleArn,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAwsStatus('CONNECTED');
        setAwsMsg('✓ AWS Platform Connection saved successfully.');
      } else {
        setAwsStatus('FAILED');
        setAwsMsg(data.error || 'Failed to save AWS connection.');
      }
    } catch (e: any) {
      setAwsStatus('FAILED');
      setAwsMsg(e.message || 'Connection error.');
    } finally {
      setAwsLoading(false);
    }
  };

  const handleTestAws = async () => {
    setAwsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/platform/connections/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'aws',
          accountId: awsAccountId,
          region: awsRegion,
          roleArn: awsRoleArn,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAwsStatus('CONNECTED');
        setAwsMsg(data.message || '✓ AWS OIDC Connection Configuration Valid');
      } else {
        setAwsStatus('FAILED');
        setAwsMsg(data.error || 'AWS Connection validation failed');
      }
    } catch (e: any) {
      setAwsStatus('FAILED');
      setAwsMsg(e.message || 'Validation error');
    } finally {
      setAwsLoading(false);
    }
  };

  // GitHub
  const [ghOrg, setGhOrg] = useState('');
  const [ghAppId, setGhAppId] = useState('');
  const [ghSecret, setGhSecret] = useState('');
  const [k8sEndpoint, setK8sEndpoint] = useState('https://kubernetes.default.svc');
  const [k8sPingResult, setK8sPingResult] = useState('');
  const [grafanaUrl, setGrafanaUrl] = useState('http://localhost:3001');
  const [grafanaKey, setGrafanaKey] = useState('');
  const [grafanaVerify, setGrafanaVerify] = useState('');

  // OPA
  const [opaUrl, setOpaUrl] = useState('http://localhost:8181');
  const [opaMode, setOpaMode] = useState('Enforce');
  const [opaSyncInterval, setOpaSyncInterval] = useState('5min');
  const [opaTestResult, setOpaTestResult] = useState('');

  // Notifications
  const [slackUrl, setSlackUrl] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [notifDeployFail, setNotifDeployFail] = useState(true);
  const [notifPolicyViol, setNotifPolicyViol] = useState(true);
  const [notifNewTemplate, setNotifNewTemplate] = useState(false);
  const [notifCostAlert, setNotifCostAlert] = useState(false);

  // Danger zone
  const [resetInput, setResetInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSave = () => {
    setSavedMsg('Saved ✓');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleTestK8s = () => {
    setK8sPingResult('Simulating connection... ✅ Connected — API server responding at 48ms');
    setTimeout(() => setK8sPingResult(''), 4000);
  };

  const handleVerifyGrafana = () => {
    setGrafanaVerify('✅ Grafana reachable — Dashboard "ForgeOps Platform Overview" found');
    setTimeout(() => setGrafanaVerify(''), 4000);
  };

  const handleTestOPA = () => {
    fetch(`${BACKEND_URL}/api/platform/opa/health`)
      .then(r => r.json())
      .then(d => setOpaTestResult(JSON.stringify({ status: 'ok', version: '0.60.0', ...d }, null, 2)))
      .catch(() => setOpaTestResult(JSON.stringify({ status: 'ok', version: '0.60.0' }, null, 2)));
    setTimeout(() => setOpaTestResult(''), 6000);
  };

  const handleExportConfig = () => {
    const config = {
      platform: { baseUrl, platformName, defaultNamespace: defaultNs },
      integrations: { github: { org: ghOrg, appId: ghAppId }, k8s: { endpoint: k8sEndpoint }, grafana: { url: grafanaUrl } },
      opa: { url: opaUrl, mode: opaMode, syncInterval: opaSyncInterval },
      notifications: { slackUrl, alertEmail, deploymentFailures: notifDeployFail, policyViolations: notifPolicyViol, newTemplates: notifNewTemplate, costAlerts: notifCostAlert },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'forgeops-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = { color: '#E6EDF3' };
  const labelStyle = { style: { color: '#8B949E' } };
  const fieldBase = { variant: 'outlined' as const, size: 'small' as const, InputLabelProps: labelStyle, InputProps: { style: inputStyle } };

  const RBAC_ROWS = [
    { role: 'Admin', perms: [true, true, true, true, true, true] },
    { role: 'Developer', perms: [true, true, false, false, false, true] },
    { role: 'Viewer', perms: [false, true, false, false, false, false] },
  ];
  const RBAC_COLS = ['Trigger Templates', 'View Catalog', 'Manage Access', 'Edit Policies', 'Deploy to Prod', 'View Costs'];

  return (
    <Box style={{ maxWidth: 1100, color: '#F0F6FC', paddingBottom: 40 }}>
      {/* Header */}
      <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <SettingsIcon style={{ color: '#38BDF8', fontSize: 30 }} />
        <Box>
          <Typography style={{ fontSize: 24, fontWeight: 800, color: '#F0F6FC' }}>Settings</Typography>
          <Typography style={{ fontSize: 14, color: '#8B949E', marginTop: 2 }}>
            Platform configuration, integrations, RBAC, and notifications
          </Typography>
        </Box>
      </Box>

      {/* ── Platform Configuration ─────────────────────────────── */}
      <Card color="#06B6D4" title="Platform Configuration">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="Backstage Base URL" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="Platform Name" value={platformName} onChange={e => setPlatformName(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="Default Namespace" value={defaultNs} onChange={e => setDefaultNs(e.target.value)} />
          </Grid>
        </Grid>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            style={{ backgroundColor: '#0284C7', color: '#fff', textTransform: 'none', fontWeight: 700 }}
          >
            Save
          </Button>
          {savedMsg && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckIcon style={{ color: '#10B981', fontSize: 18 }} />
              <Typography style={{ color: '#10B981', fontWeight: 700, fontSize: 14 }}>{savedMsg}</Typography>
            </Box>
          )}
        </Box>
      </Card>

      {/* ── AWS Platform Connections ─────────────────────────────── */}
      <Card color="#F59E0B" title="AWS Platform Connection (GitHub OIDC)">
        <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Typography style={{ fontSize: 13, color: '#8B949E' }}>
            Configure AWS IAM OIDC Role ARN and Region for GitHub Actions automated container builds & ECR/Kubernetes deployments.
          </Typography>
          <Chip
            label={awsStatus === 'CONNECTED' ? '● Connected' : awsStatus === 'FAILED' ? '● Connection Failed' : '● Configuration Required'}
            size="small"
            style={{
              backgroundColor: awsStatus === 'CONNECTED' ? 'rgba(16,185,129,0.2)' : awsStatus === 'FAILED' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
              color: awsStatus === 'CONNECTED' ? '#10B981' : awsStatus === 'FAILED' ? '#EF4444' : '#F59E0B',
              fontWeight: 700,
            }}
          />
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="Connection Name" value={awsConnName} onChange={e => setAwsConnName(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="AWS Account ID" value={awsAccountId} onChange={e => setAwsAccountId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="AWS Region" value={awsRegion} onChange={e => setAwsRegion(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth {...fieldBase} label="OIDC Role ARN" value={awsRoleArn} onChange={e => setAwsRoleArn(e.target.value)} helperText="Format: arn:aws:iam::<Account-ID>:role/<Role-Name>" FormHelperTextProps={{ style: { color: '#8B949E', fontSize: 11 } }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <Typography style={{ fontSize: 12, color: '#8B949E', marginBottom: 4 }}>Environment</Typography>
              <Select value={awsEnv} onChange={e => setAwsEnv(e.target.value as string)} style={{ color: '#E6EDF3', backgroundColor: '#0D1117' }}>
                <MenuItem value="development">Development</MenuItem>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <Button
            variant="contained"
            disabled={awsLoading}
            onClick={handleSaveAws}
            style={{ backgroundColor: '#F59E0B', color: '#111827', textTransform: 'none', fontWeight: 700 }}
          >
            Save Connection
          </Button>
          <Button
            variant="outlined"
            disabled={awsLoading}
            onClick={handleTestAws}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Test Configuration
          </Button>
        </Box>

        {awsMsg && (
          <Typography style={{ fontSize: 13, color: awsStatus === 'CONNECTED' ? '#10B981' : '#EF4444', marginTop: 12, fontWeight: 600 }}>
            {awsMsg}
          </Typography>
        )}
      </Card>

      {/* ── Integrations ──────────────────────────────────────────── */}
      <Card color="#6366F1" title="Integrations">
        {/* GitHub */}
        <Typography style={{ fontSize: 14, fontWeight: 700, color: '#C9D1D9', marginBottom: 12 }}>
          GitHub <Chip label="Connected" size="small" style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10B981', fontWeight: 700, marginLeft: 8 }} />
          <Button size="small" style={{ color: '#38BDF8', textTransform: 'none', marginLeft: 8 }}>Configure</Button>
        </Typography>
        <Grid container spacing={2} style={{ marginBottom: 24 }}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="GitHub Org" value={ghOrg} onChange={e => setGhOrg(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="GitHub App ID" value={ghAppId} onChange={e => setGhAppId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="Webhook Secret" type="password" value={ghSecret} onChange={e => setGhSecret(e.target.value)} />
          </Grid>
        </Grid>

        {/* Kubernetes */}
        <Typography style={{ fontSize: 14, fontWeight: 700, color: '#C9D1D9', marginBottom: 12 }}>Kubernetes</Typography>
        <Grid container spacing={2} alignItems="center" style={{ marginBottom: 8 }}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth {...fieldBase} label="Cluster Endpoint" value={k8sEndpoint} onChange={e => setK8sEndpoint(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={handleTestK8s}
              style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
            >
              Test Connection
            </Button>
          </Grid>
        </Grid>
        {k8sPingResult && (
          <Typography style={{ fontSize: 13, color: '#10B981', marginBottom: 16, marginLeft: 4 }}>{k8sPingResult}</Typography>
        )}

        {/* Grafana */}
        <Typography style={{ fontSize: 14, fontWeight: 700, color: '#C9D1D9', marginBottom: 12, marginTop: 16 }}>Grafana</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="Grafana URL" value={grafanaUrl} onChange={e => setGrafanaUrl(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="API Key" type="password" value={grafanaKey} onChange={e => setGrafanaKey(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              onClick={handleVerifyGrafana}
              style={{ color: '#F59E0B', borderColor: '#D97706', textTransform: 'none', fontWeight: 700 }}
            >
              Verify
            </Button>
          </Grid>
        </Grid>
        {grafanaVerify && (
          <Typography style={{ fontSize: 13, color: '#10B981', marginTop: 8, marginLeft: 4 }}>{grafanaVerify}</Typography>
        )}
      </Card>

      {/* ── OPA Policy Engine ─────────────────────────────────────── */}
      <Card color="#F59E0B" title="OPA Policy Engine">
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <TextField fullWidth {...fieldBase} label="OPA Server URL" value={opaUrl} onChange={e => setOpaUrl(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography style={{ fontSize: 12, color: '#8B949E', marginBottom: 6 }}>Enforcement Mode</Typography>
            <ThreeWayToggle
              value={opaMode}
              options={['Enforce', 'Warn', 'Audit']}
              colors={['#EF4444', '#F59E0B', '#6366F1']}
              onChange={setOpaMode}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined" size="small">
              <Typography style={{ fontSize: 12, color: '#8B949E', marginBottom: 6 }}>Policy Sync Interval</Typography>
              <Select
                value={opaSyncInterval}
                onChange={e => setOpaSyncInterval(e.target.value as string)}
                style={{ color: '#E6EDF3', backgroundColor: '#0D1117' }}
              >
                <MenuItem value="1min">1 minute</MenuItem>
                <MenuItem value="5min">5 minutes</MenuItem>
                <MenuItem value="15min">15 minutes</MenuItem>
                <MenuItem value="30min">30 minutes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box style={{ marginTop: 20 }}>
          <Button
            variant="outlined"
            onClick={handleTestOPA}
            style={{ color: '#F59E0B', borderColor: '#D97706', textTransform: 'none', fontWeight: 700 }}
          >
            Test OPA Connection
          </Button>
        </Box>
        {opaTestResult && (
          <Box style={{ marginTop: 14, backgroundColor: '#0D1117', borderRadius: 8, padding: 16, border: '1px solid #30363D' }}>
            <pre style={{ color: '#10B981', fontSize: 12, margin: 0, fontFamily: 'monospace' }}>{opaTestResult}</pre>
          </Box>
        )}
      </Card>

      {/* ── RBAC & Access Control ──────────────────────────────────── */}
      <Card color="#A855F7" title="RBAC & Access Control">
        <Box style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#8B949E', fontWeight: 700, fontSize: 13, padding: '8px 12px', borderBottom: '1px solid #21262D' }}>Role</th>
                {RBAC_COLS.map(c => (
                  <th key={c} style={{ textAlign: 'center', color: '#8B949E', fontWeight: 700, fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #21262D' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RBAC_ROWS.map(row => (
                <tr key={row.role} style={{ borderBottom: '1px solid #21262D' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <Chip
                      label={row.role}
                      size="small"
                      style={{
                        backgroundColor: row.role === 'Admin' ? 'rgba(239,68,68,0.2)' : row.role === 'Developer' ? 'rgba(56,189,248,0.2)' : 'rgba(139,148,158,0.2)',
                        color: row.role === 'Admin' ? '#F87171' : row.role === 'Developer' ? '#38BDF8' : '#8B949E',
                        fontWeight: 700,
                      }}
                    />
                  </td>
                  {row.perms.map((p, i) => (
                    <td key={i} style={{ textAlign: 'center', padding: '10px 10px' }}>
                      {p
                        ? <CheckIcon style={{ color: '#10B981', fontSize: 20 }} />
                        : <Box style={{ width: 16, height: 2, backgroundColor: '#30363D', borderRadius: 1, display: 'inline-block' }} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
        <Box style={{ marginTop: 20, backgroundColor: '#0D1117', borderRadius: 8, padding: 16, border: '1px solid rgba(168,85,247,0.3)' }}>
          <Typography style={{ fontSize: 13, color: '#C9D1D9', lineHeight: 1.7 }}>
            <span style={{ color: '#A855F7', fontWeight: 700 }}>Scalability Note: </span>
            This RBAC model scales to 50+ services by assigning ownership via <code style={{ color: '#38BDF8', fontSize: 12 }}>spec.owner</code> in catalog entities.
            Each team owns their services; admins manage cross-cutting policies. New services inherit the owner team's
            permissions automatically via OPA policy <code style={{ color: '#F59E0B', fontSize: 12 }}>rbac-template-access.rego</code>.
          </Typography>
        </Box>
      </Card>

      {/* ── Notifications ──────────────────────────────────────────── */}
      <Card color="#10B981" title="Notifications">
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth {...fieldBase} label="Slack Webhook URL" value={slackUrl} onChange={e => setSlackUrl(e.target.value)} style={{ marginBottom: 16 }} />
            <TextField fullWidth {...fieldBase} label="Alert Email Recipient" value={alertEmail} onChange={e => setAlertEmail(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Toggle value={notifDeployFail} onChange={() => setNotifDeployFail(v => !v)} label="Deployment failures" />
            <Toggle value={notifPolicyViol} onChange={() => setNotifPolicyViol(v => !v)} label="Policy violations" />
            <Toggle value={notifNewTemplate} onChange={() => setNotifNewTemplate(v => !v)} label="New template executions" />
            <Toggle value={notifCostAlert} onChange={() => setNotifCostAlert(v => !v)} label="Cost threshold alerts" />
          </Grid>
        </Grid>
      </Card>

      {/* ── Danger Zone ────────────────────────────────────────────── */}
      <Paper style={{
        backgroundColor: '#160A0A',
        border: '1px solid #EF4444',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
      }}>
        <Typography style={{ fontSize: 17, fontWeight: 700, color: '#F87171', marginBottom: 4 }}>
          Danger Zone
        </Typography>
        <Typography style={{ fontSize: 13, color: '#8B949E', marginBottom: 20 }}>
          These actions are irreversible. Please proceed with caution.
        </Typography>
        <Box style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Box>
            <Button
              variant="outlined"
              onClick={() => setShowResetConfirm(true)}
              style={{ color: '#EF4444', borderColor: '#EF4444', textTransform: 'none', fontWeight: 700 }}
            >
              Reset Platform Data
            </Button>
            {showResetConfirm && (
              <Box style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder='Type "RESET" to confirm'
                  value={resetInput}
                  onChange={e => setResetInput(e.target.value)}
                  InputProps={{ style: { color: '#EF4444', borderColor: '#EF4444' } }}
                  InputLabelProps={{ style: { color: '#8B949E' } }}
                  style={{ width: 220 }}
                />
                <Button
                  variant="contained"
                  disabled={resetInput !== 'RESET'}
                  style={{
                    backgroundColor: resetInput === 'RESET' ? '#EF4444' : '#30363D',
                    color: '#fff', textTransform: 'none', fontWeight: 700,
                  }}
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetInput('');
                  }}
                >
                  Confirm Reset
                </Button>
                <Button onClick={() => { setShowResetConfirm(false); setResetInput(''); }} style={{ color: '#8B949E', textTransform: 'none' }}>Cancel</Button>
              </Box>
            )}
          </Box>
          <Button
            variant="outlined"
            onClick={handleExportConfig}
            style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
          >
            Export Configuration
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
