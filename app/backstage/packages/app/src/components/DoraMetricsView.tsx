import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Paper, Select, MenuItem, Chip,
} from '@material-ui/core';
import { TrendingUp as TrendingUpIcon } from '@material-ui/icons';

const BACKEND_URL = 'http://localhost:7007';

// ── Simulated realistic DORA data generators ──────────────────────────────────
function generateDeployFreq(days: number, service: string) {
  const base: Record<string, number> = {
    'all': 4.5, 'payment-service': 5.1, 'cart-api': 3.8,
    'inventory-worker': 2.9, 'auth-gateway': 6.2, 'notification-service': 3.4,
  };
  const b = base[service] ?? 4.5;
  return Array.from({ length: days }, (_, i) => ({
    day: `Day ${i + 1}`,
    value: Math.max(0, +(b + (Math.random() - 0.5) * 2.5).toFixed(1)),
  }));
}

function generateLeadTime(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    day: `Day ${i + 1}`,
    value: Math.max(1, +(3.2 + Math.sin(i / 4) * 2 + (Math.random() - 0.5) * 1.5).toFixed(1)),
  }));
}

function generateChangeFailure(weeks: number) {
  return Array.from({ length: weeks }, (_, i) => ({
    week: `W${i + 1}`,
    value: Math.max(0, +(Math.random() * 3.5).toFixed(1)),
  }));
}

function generateMTTR() {
  return Array.from({ length: 20 }, (_, i) => ({
    incident: `#${i + 1}`,
    value: Math.max(2, +(4.5 + (Math.random() - 0.5) * 8).toFixed(1)),
  }));
}

const TEAM_SCORES = [
  { team: 'Platform Team', score: 92 },
  { team: 'Auth Squad', score: 85 },
  { team: 'Commerce Team', score: 74 },
  { team: 'Data Team', score: 68 },
  { team: 'Infrastructure Team', score: 81 },
];

// ── Minimal SVG chart components (no recharts dep) ────────────────────────────
interface BarChartProps {
  data: { day?: string; week?: string; incident?: string; value: number }[];
  color: string;
  targetLine?: number;
  maxY?: number;
  height?: number;
}

const MiniBarChart: React.FC<BarChartProps> = ({ data, color, targetLine, height = 140 }) => {
  const max = Math.max(...data.map(d => d.value), targetLine ?? 0, 1);
  const w = 100 / data.length;
  return (
    <svg width="100%" height={height} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 20);
        const x = i * w + w * 0.15;
        const bw = w * 0.7;
        return (
          <g key={i}>
            <rect
              x={`${x}%`} y={height - 20 - barH} width={`${bw}%`} height={barH}
              fill={color} rx={2} opacity={0.85}
            />
          </g>
        );
      })}
      {targetLine !== undefined && (
        <line
          x1="0" y1={height - 20 - (targetLine / max) * (height - 20)}
          x2="100%" y2={height - 20 - (targetLine / max) * (height - 20)}
          stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 3"
        />
      )}
      <line x1="0" y1={height - 20} x2="100%" y2={height - 20} stroke="#334155" strokeWidth={1} />
    </svg>
  );
};

const MiniAreaChart: React.FC<BarChartProps> = ({ data, color, targetLine, height = 140 }) => {
  const max = Math.max(...data.map(d => d.value), targetLine ?? 0, 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - 20 - (d.value / max) * (height - 20);
    return `${x},${y}`;
  });
  const areaPath = `M${pts.join(' L')} L100,${height - 20} L0,${height - 20} Z`;
  const linePath = `M${pts.join(' L')}`;
  return (
    <svg width="100%" height={height} style={{ overflow: 'visible' }} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#','')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
      {targetLine !== undefined && (
        <line
          x1="0" y1={height - 20 - (targetLine / max) * (height - 20)}
          x2="100" y2={height - 20 - (targetLine / max) * (height - 20)}
          stroke="#F59E0B" strokeWidth={1} strokeDasharray="2 2"
        />
      )}
      <line x1="0" y1={height - 20} x2="100" y2={height - 20} stroke="#334155" strokeWidth={0.5} />
    </svg>
  );
};

function classifyDORA(freq: number, leadMin: number, cfr: number, mttr: number) {
  const scores = [
    freq >= 4 ? 3 : freq >= 1 ? 2 : freq >= 0.5 ? 1 : 0,
    leadMin <= 60 ? 3 : leadMin <= 1440 ? 2 : leadMin <= 10080 ? 1 : 0,
    cfr <= 5 ? 3 : cfr <= 10 ? 2 : cfr <= 15 ? 1 : 0,
    mttr <= 60 ? 3 : mttr <= 1440 ? 2 : mttr <= 10080 ? 1 : 0,
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / 4;
  if (avg >= 2.5) return { label: 'Elite', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
  if (avg >= 2) return { label: 'High', color: '#38BDF8', bg: 'rgba(56,189,248,0.15)' };
  if (avg >= 1) return { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
  return { label: 'Low', color: '#F87171', bg: 'rgba(248,113,113,0.15)' };
}

// ── Main Component ────────────────────────────────────────────────────────────
export const DoraMetricsView: React.FC = () => {
  const [service, setService] = useState('all');
  const [timeRange, setTimeRange] = useState('30');

  const days = parseInt(timeRange, 10);
  const weeks = timeRange === '7' ? 4 : timeRange === '30' ? 12 : 26;

  const deployFreq = useMemo(() => generateDeployFreq(days, service), [days, service]);
  const leadTime = useMemo(() => generateLeadTime(days), [days]);
  const cfr = useMemo(() => generateChangeFailure(weeks), [weeks]);
  const mttr = useMemo(() => generateMTTR(), []);

  const avgFreq = +(deployFreq.reduce((s, d) => s + d.value, 0) / deployFreq.length).toFixed(1);
  const avgLead = +(leadTime.reduce((s, d) => s + d.value, 0) / leadTime.length).toFixed(1);
  const avgCfr = +(cfr.reduce((s, d) => s + d.value, 0) / cfr.length).toFixed(1);
  const avgMttr = +(mttr.reduce((s, d) => s + d.value, 0) / mttr.length).toFixed(1);
  const perf = classifyDORA(avgFreq, avgLead, avgCfr, avgMttr);

  const cardStyle = (color: string) => ({
    backgroundColor: '#161B22',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderTop: `4px solid ${color}`,
    padding: 20,
  });

  const sectionCard = {
    backgroundColor: '#161B22',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  };

  return (
    <Box style={{ maxWidth: 1300, color: '#F0F6FC', paddingBottom: 40 }}>
      {/* Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUpIcon style={{ color: '#38BDF8', fontSize: 32 }} />
          <Box>
            <Typography style={{ fontSize: 24, fontWeight: 800, color: '#F0F6FC' }}>
              DORA Metrics Dashboard
            </Typography>
            <Typography style={{ fontSize: 14, color: '#8B949E', marginTop: 2 }}>
              Engineering productivity benchmarks · Four Key Metrics · {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Chip
            label={perf.label + ' Performer'}
            style={{ backgroundColor: perf.bg, color: perf.color, fontWeight: 800, fontSize: 13, border: `1px solid ${perf.color}` }}
          />
          <Select
            value={service}
            onChange={e => setService(e.target.value as string)}
            variant="outlined"
            style={{ backgroundColor: '#21262D', color: '#F0F6FC', height: 38, fontSize: 13 }}
          >
            <MenuItem value="all">All Services</MenuItem>
            <MenuItem value="payment-service">payment-service</MenuItem>
            <MenuItem value="cart-api">cart-api</MenuItem>
            <MenuItem value="inventory-worker">inventory-worker</MenuItem>
            <MenuItem value="auth-gateway">auth-gateway</MenuItem>
            <MenuItem value="notification-service">notification-service</MenuItem>
          </Select>
          <Select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as string)}
            variant="outlined"
            style={{ backgroundColor: '#21262D', color: '#F0F6FC', height: 38, fontSize: 13 }}
          >
            <MenuItem value="7">7 Days</MenuItem>
            <MenuItem value="30">30 Days</MenuItem>
            <MenuItem value="90">90 Days</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} style={{ marginBottom: 28 }}>
        {[
          { label: 'Deployment Frequency', value: `${avgFreq}/day`, color: '#38BDF8', sub: 'Target: 4.5/day' },
          { label: 'Lead Time for Changes', value: `${avgLead}m avg`, color: '#A855F7', sub: 'Target: <5 min (Elite)' },
          { label: 'Change Failure Rate', value: `${avgCfr}%`, color: '#10B981', sub: 'Target: <5% threshold' },
          { label: 'Mean Time to Recovery', value: `${avgMttr}m avg`, color: '#F59E0B', sub: 'Target: <60 min' },
        ].map(c => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Paper style={cardStyle(c.color)}>
              <Typography style={{ fontSize: 11, color: '#8B949E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {c.label}
              </Typography>
              <Typography style={{ fontSize: 28, fontWeight: 800, color: c.color, marginTop: 6 }}>{c.value}</Typography>
              <Typography style={{ fontSize: 11, color: '#8B949E', marginTop: 4 }}>{c.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} md={6}>
          <Paper style={sectionCard}>
            <Typography style={{ fontWeight: 700, color: '#F0F6FC', marginBottom: 4 }}>
              Deployment Frequency <span style={{ color: '#8B949E', fontSize: 12, fontWeight: 400 }}>— deployments/day last {days} days</span>
            </Typography>
            <Typography style={{ fontSize: 11, color: '#F59E0B', marginBottom: 12 }}>
              — — Target: 4.5/day (DORA Elite)
            </Typography>
            <MiniBarChart data={deployFreq} color="#38BDF8" targetLine={4.5} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper style={sectionCard}>
            <Typography style={{ fontWeight: 700, color: '#F0F6FC', marginBottom: 4 }}>
              Lead Time for Changes <span style={{ color: '#8B949E', fontSize: 12, fontWeight: 400 }}>— minutes commit→deploy</span>
            </Typography>
            <Typography style={{ fontSize: 11, color: '#F59E0B', marginBottom: 12 }}>
              — — Target: 5 min (Elite threshold)
            </Typography>
            <MiniAreaChart data={leadTime} color="#A855F7" targetLine={5} />
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} style={{ marginBottom: 24 }}>
        <Grid item xs={12} md={6}>
          <Paper style={sectionCard}>
            <Typography style={{ fontWeight: 700, color: '#F0F6FC', marginBottom: 4 }}>
              Change Failure Rate <span style={{ color: '#8B949E', fontSize: 12, fontWeight: 400 }}>— % failed deployments per week</span>
            </Typography>
            <Typography style={{ fontSize: 11, color: '#F59E0B', marginBottom: 12 }}>
              — — Threshold: 5% (Elite ≤5%)
            </Typography>
            <MiniAreaChart data={cfr} color="#10B981" targetLine={5} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper style={sectionCard}>
            <Typography style={{ fontWeight: 700, color: '#F0F6FC', marginBottom: 4 }}>
              Mean Time to Recovery <span style={{ color: '#8B949E', fontSize: 12, fontWeight: 400 }}>— minutes per incident</span>
            </Typography>
            <Typography style={{ fontSize: 11, color: '#F59E0B', marginBottom: 12 }}>
              — — Target: 60 min (High performer)
            </Typography>
            <MiniBarChart data={mttr} color="#F59E0B" targetLine={60} height={120} />
          </Paper>
        </Grid>
      </Grid>

      {/* Team Performance Comparison */}
      <Paper style={sectionCard}>
        <Typography style={{ fontSize: 18, fontWeight: 700, color: '#F0F6FC', marginBottom: 20 }}>
          Team Performance Comparison — DORA Score
        </Typography>
        {TEAM_SCORES.map(t => {
          const barColor = t.score >= 90 ? '#10B981' : t.score >= 80 ? '#38BDF8' : t.score >= 70 ? '#A855F7' : '#F59E0B';
          const badge = t.score >= 90 ? 'Elite' : t.score >= 80 ? 'High' : t.score >= 70 ? 'Medium' : 'Low';
          return (
            <Box key={t.team} style={{ marginBottom: 16 }}>
              <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <Typography style={{ fontSize: 13, fontWeight: 600, color: '#E6EDF3' }}>{t.team}</Typography>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Chip label={badge} size="small" style={{ backgroundColor: `${barColor}22`, color: barColor, fontWeight: 700, fontSize: 10 }} />
                  <Typography style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{t.score}/100</Typography>
                </Box>
              </Box>
              <Box style={{ height: 8, backgroundColor: '#21262D', borderRadius: 4, overflow: 'hidden' }}>
                <Box style={{ width: `${t.score}%`, height: '100%', backgroundColor: barColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </Box>
            </Box>
          );
        })}
      </Paper>
    </Box>
  );
};
