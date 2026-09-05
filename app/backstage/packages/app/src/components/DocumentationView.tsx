import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, ListItem, Chip, CircularProgress, Button } from '@material-ui/core';
import { MenuBook as DocsIcon, Refresh as RefreshIcon, Code as CodeIcon, OpenInNew as LinkIcon } from '@material-ui/icons';
import { fetchJson, BACKEND_URL } from '../apiClient';

interface DocItem {
  key: string;
  title: string;
  sub: string;
  category: string;
  badge?: string;
  badgeColor?: string;
  icon?: string;
}

const DOC_ITEMS: DocItem[] = [
  { key: 'platform-overview', title: 'Platform Overview', sub: 'docs/index.md', category: 'Overview', badge: 'START HERE', badgeColor: '#10B981', icon: '🏠' },
  { key: 'runbook', title: 'Operations Runbook', sub: 'docs/operations/RUNBOOK.md', category: 'Operations', badge: 'RUNBOOK', badgeColor: '#F59E0B', icon: '📋' },
  { key: 'terraform-docs', title: 'Architecture & Design', sub: 'docs/architecture/multi-team-scalability.md', category: 'Architecture', icon: '🏗️' },
  { key: 'rest-api-docs', title: 'Golden Path: REST API', sub: 'templates/rest-api/skeleton/docs/index.md', category: 'Golden Path', icon: '⚡' },
  { key: 'worker-docs', title: 'Golden Path: Worker Service', sub: 'templates/worker-service/skeleton/README.md', category: 'Golden Path', icon: '⚙️' },
];

// ── Inline markdown → HTML renderer ─────────────────────────────────────────
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Fenced code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre class="code-block" data-lang="${lang}"><code>${code.trimEnd()}</code></pre>`)
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
    // H1
    .replace(/^# (.+)$/gm, '<h1 class="doc-h1">$1</h1>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="doc-h2">$2</h2>'.replace('$2','$1'))
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="doc-h3">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote class="doc-quote">$1</blockquote>')
    // HR
    .replace(/^---$/gm, '<hr class="doc-hr" />')
    // Tables
    .replace(/(\|.+\|\n)(\|[-| :]+\|\n)((?:\|.+\|\n?)*)/g, (_m, head, _sep, body) => {
      const headCells = head.trim().split('|').filter(Boolean).map((c: string) => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((r: string) =>
        '<tr>' + r.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('') + '</tr>'
      ).join('');
      return `<table class="doc-table"><thead><tr>${headCells}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    // Unordered list items
    .replace(/^[ \t]*[-*•] (.+)$/gm, '<li class="doc-li">$1</li>')
    // Ordered list items
    .replace(/^[ \t]*(\d+)\. (.+)$/gm, '<li class="doc-oli">$2</li>')
    // Wrap consecutive <li> in <ul>, <li class="doc-oli"> in <ol>
    .replace(/(<li class="doc-li">[\s\S]*?<\/li>)(\n(?!<li))/g, '$1</ul-end>\n')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="doc-link" href="$2" target="_blank">$1</a>')
    // Paragraphs (lines not already wrapped in block tags)
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="doc-spacer"></div>';
      if (trimmed.match(/^<(h[1-6]|pre|blockquote|hr|table|ul|ol|li|div)/)) return line;
      return `<p class="doc-p">${line}</p>`;
    })
    .join('\n');
  return html;
}

// ── Styles injected once ─────────────────────────────────────────────────────
const STYLES = `
.doc-h1 { font-size:26px; font-weight:800; color:#F0F6FC; margin:0 0 8px; padding-bottom:10px; border-bottom:2px solid rgba(56,189,248,0.3); }
.doc-h2 { font-size:19px; font-weight:700; color:#E6EDF3; margin:28px 0 12px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:8px; }
.doc-h2::before { content:''; display:inline-block; width:3px; height:18px; background:#38BDF8; border-radius:2px; }
.doc-h3 { font-size:15px; font-weight:700; color:#C9D1D9; margin:20px 0 10px; }
.doc-p { font-size:14px; color:#C9D1D9; line-height:1.8; margin:6px 0; }
.doc-spacer { height:6px; }
.doc-hr { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:24px 0; }
.doc-quote { border-left:3px solid #38BDF8; margin:12px 0; padding:10px 16px; background:rgba(56,189,248,0.06); border-radius:0 8px 8px 0; color:#94A3B8; font-size:13px; font-style:italic; }
.code-block { background:#010409; border:1px solid #30363D; border-radius:8px; padding:16px 20px; margin:14px 0; overflow-x:auto; font-family:'JetBrains Mono','Fira Code',monospace; font-size:12.5px; line-height:1.7; color:#79C0FF; position:relative; }
.code-block[data-lang]::before { content:attr(data-lang); position:absolute; top:8px; right:12px; font-size:10px; color:#484F58; text-transform:uppercase; letter-spacing:0.08em; font-family:sans-serif; }
.code-block code { color:#C9D1D9; }
.code-block code strong { color:#F0F6FC; }
.inline-code { background:#161B22; border:1px solid #30363D; border-radius:4px; padding:1px 6px; font-family:'JetBrains Mono','Fira Code',monospace; font-size:12px; color:#FF7B72; }
.doc-table { width:100%; border-collapse:collapse; margin:14px 0; font-size:13px; }
.doc-table thead tr { background:#161B22; }
.doc-table th { text-align:left; padding:10px 14px; color:#8B949E; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; border-bottom:2px solid #21262D; }
.doc-table td { padding:10px 14px; color:#C9D1D9; border-bottom:1px solid #21262D; vertical-align:top; }
.doc-table tr:hover td { background:rgba(255,255,255,0.02); }
.doc-li,.doc-oli { font-size:14px; color:#C9D1D9; line-height:1.8; margin:3px 0; padding-left:4px; list-style:none; display:flex; align-items:flex-start; gap:8px; }
.doc-li::before { content:'▸'; color:#38BDF8; font-size:11px; margin-top:4px; flex-shrink:0; }
.doc-oli::before { content:''; flex-shrink:0; }
.doc-link { color:#58A6FF; text-decoration:none; }
.doc-link:hover { text-decoration:underline; }
strong { color:#F0F6FC; font-weight:700; }
em { color:#A78BFA; font-style:italic; }
`;

// ── Main Component ───────────────────────────────────────────────────────────
export const DocumentationView: React.FC = () => {
  const [activeKey, setActiveKey] = useState('platform-overview');
  const [docContent, setDocContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDoc = async (key: string) => {
    setActiveKey(key);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${BACKEND_URL}/api/platform/docs/content?doc=${key}`, {}, 5000);
      if (data?.content) setDocContent(data.content);
      else setError('Document not found');
    } catch (err: any) {
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDoc('platform-overview'); }, []);

  const activeDoc = DOC_ITEMS.find(d => d.key === activeKey) || DOC_ITEMS[0];
  const renderedHtml = docContent ? renderMarkdown(docContent) : '';

  // Group nav items by category
  const categories = Array.from(new Set(DOC_ITEMS.map(d => d.category)));

  return (
    <Box style={{ maxWidth: 1300, color: '#F0F6FC' }}>
      {/* Inject styles once */}
      <style>{STYLES}</style>

      {/* Page Header */}
      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DocsIcon style={{ color: '#38BDF8', fontSize: 30 }} />
          <Box>
            <Typography style={{ fontSize: 24, fontWeight: 800, color: '#F0F6FC' }}>
              TechDocs
            </Typography>
            <Typography style={{ fontSize: 13, color: '#8B949E', marginTop: 2 }}>
              Engineering documentation · Served live from filesystem · ForgeOps IDP v1.0
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => loadDoc(activeKey)}
          startIcon={<RefreshIcon />}
          style={{ color: '#38BDF8', borderColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
        >
          Refresh
        </Button>
      </Box>

      <Box style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* ── Left Nav Sidebar ── */}
        <Box style={{ width: 260, flexShrink: 0 }}>
          <Paper style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 0', position: 'sticky', top: 24 }}>
            {/* Backstage TechDocs header */}
            <Box style={{ padding: '4px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography style={{ fontSize: 10, fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                📚 ForgeOps TechDocs
              </Typography>
            </Box>

            {/* Grouped nav */}
            {categories.map(cat => (
              <Box key={cat} style={{ marginTop: 12 }}>
                <Typography style={{ fontSize: 10, fontWeight: 700, color: '#484F58', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 16px 6px' }}>
                  {cat}
                </Typography>
                {DOC_ITEMS.filter(d => d.category === cat).map(item => {
                  const active = activeKey === item.key;
                  return (
                    <ListItem
                      key={item.key}
                      button
                      onClick={() => loadDoc(item.key)}
                      style={{
                        padding: '7px 16px',
                        backgroundColor: active ? 'rgba(56,189,248,0.08)' : 'transparent',
                        borderLeft: active ? '3px solid #38BDF8' : '3px solid transparent',
                        borderRadius: 0,
                      }}
                    >
                      <Box style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Typography style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#F0F6FC' : '#8B949E', lineHeight: 1.3 }}>
                            {item.title}
                          </Typography>
                          {item.badge && (
                            <Chip
                              label={item.badge}
                              size="small"
                              style={{ height: 14, fontSize: 9, marginTop: 3, backgroundColor: `${item.badgeColor}22`, color: item.badgeColor, fontWeight: 800 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </ListItem>
                  );
                })}
              </Box>
            ))}

            {/* Footer */}
            <Box style={{ padding: '12px 16px 4px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 16 }}>
              <Typography style={{ fontSize: 10, color: '#484F58' }}>
                Powered by Backstage TechDocs<br />
                ForgeOps IDP · v1.0.0
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* ── Main Content Area ── */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Breadcrumb */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Typography style={{ fontSize: 12, color: '#484F58' }}>TechDocs</Typography>
            <Typography style={{ fontSize: 12, color: '#484F58' }}>/</Typography>
            <Typography style={{ fontSize: 12, color: '#8B949E' }}>{activeDoc.category}</Typography>
            <Typography style={{ fontSize: 12, color: '#484F58' }}>/</Typography>
            <Typography style={{ fontSize: 12, color: '#38BDF8', fontWeight: 600 }}>{activeDoc.title}</Typography>
            <Box style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Chip label={activeDoc.category} size="small" style={{ backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8', fontWeight: 700, fontSize: 11 }} />
              <Box style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', backgroundColor: '#21262D', borderRadius: 4 }}>
                <CodeIcon style={{ color: '#8B949E', fontSize: 12 }} />
                <Typography style={{ fontSize: 10, color: '#8B949E', fontFamily: 'monospace' }}>{activeDoc.sub}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Document Card */}
          <Paper style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, minHeight: 600, overflow: 'hidden' }}>
            {/* Doc toolbar */}
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#161B22' }}>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{activeDoc.icon}</span>
                <Typography style={{ fontSize: 14, fontWeight: 700, color: '#F0F6FC' }}>{activeDoc.title}</Typography>
              </Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeDoc.badge && (
                  <Chip label={activeDoc.badge} size="small"
                    style={{ backgroundColor: `${activeDoc.badgeColor}22`, color: activeDoc.badgeColor, fontWeight: 800, fontSize: 10 }} />
                )}
                <Button
                  size="small"
                  startIcon={<LinkIcon style={{ fontSize: 12 }} />}
                  style={{ color: '#8B949E', textTransform: 'none', fontSize: 11 }}
                  onClick={() => window.open(`${BACKEND_URL}/api/platform/docs/content?doc=${activeKey}`, '_blank')}
                >
                  Raw
                </Button>
              </Box>
            </Box>

            {/* Content */}
            <Box style={{ padding: '32px 40px' }}>
              {loading ? (
                <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
                  <CircularProgress style={{ color: '#38BDF8' }} />
                  <Typography style={{ color: '#8B949E', fontSize: 13 }}>Loading documentation…</Typography>
                </Box>
              ) : error ? (
                <Box style={{ padding: 24, backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8 }}>
                  <Typography style={{ color: '#F87171', fontWeight: 700, marginBottom: 8 }}>Failed to load document</Typography>
                  <Typography style={{ color: '#8B949E', fontSize: 13 }}>{error}</Typography>
                  <Button onClick={() => loadDoc(activeKey)} style={{ color: '#38BDF8', marginTop: 12, textTransform: 'none' }}>Retry</Button>
                </Box>
              ) : (
                <Box dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              )}
            </Box>
          </Paper>

          {/* Footer nav */}
          <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            {(() => {
              const idx = DOC_ITEMS.findIndex(d => d.key === activeKey);
              const prev = idx > 0 ? DOC_ITEMS[idx - 1] : null;
              const next = idx < DOC_ITEMS.length - 1 ? DOC_ITEMS[idx + 1] : null;
              return (
                <>
                  {prev ? (
                    <Button onClick={() => loadDoc(prev.key)} style={{ color: '#38BDF8', textTransform: 'none', fontWeight: 600 }}>
                      ← {prev.title}
                    </Button>
                  ) : <Box />}
                  {next ? (
                    <Button onClick={() => loadDoc(next.key)} style={{ color: '#38BDF8', textTransform: 'none', fontWeight: 600 }}>
                      {next.title} →
                    </Button>
                  ) : <Box />}
                </>
              );
            })()}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
