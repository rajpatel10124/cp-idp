## BUTTON AUDIT — ForgeOps Internal Developer Platform

| Button | Page | Action | Backend/API | Status |
| :--- | :--- | :--- | :--- | :--- |
| **New Service** | Overview | Navigate to Golden Paths wizard | Frontend routing | WORKING |
| **View All** | Overview → Recent Deployments | Navigate to Deployments page | Frontend routing | WORKING |
| **Active Services card** | Overview | Navigate to Software Catalog | Frontend routing | WORKING |
| **APIs & Contracts card** | Overview | Navigate to Software Catalog | Frontend routing | WORKING |
| **Cloud Resources card** | Overview | Navigate to Infrastructure | Frontend routing | WORKING |
| **Catalog Entities card** | Overview | Navigate to Software Catalog | Frontend routing | WORKING |
| **Retry** | Overview Backend Health | Re-fetch `/api/health` + `/api/catalog/entities` | `/api/health`, `/api/catalog/entities` | WORKING |
| **Quick Action: Create Service** | Overview | Navigate to Golden Paths | Frontend routing | WORKING |
| **Quick Action: View Deployments** | Overview | Navigate to Deployments page | Frontend routing | WORKING |
| **Quick Action: Software Catalog** | Overview | Navigate to Catalog | Frontend routing | WORKING |
| **Quick Action: Infrastructure** | Overview | Navigate to Infrastructure | Frontend routing | WORKING |
| **Create Service** | Services & Workloads | Navigate to Golden Paths | Frontend routing | WORKING |
| **Refresh (icon)** | Services & Workloads | Re-fetch catalog entities | `/api/catalog/entities`, `/api/platform/catalog/entities` | WORKING |
| **Logs** | Services & Workloads | Navigate to Live Logs | Frontend routing | WORKING |
| **Metrics** | Services & Workloads | Navigate to Observability | Frontend routing | WORKING |
| **Continue** | Golden Paths wizard | Advance wizard step | Form validation | WORKING |
| **Back** | Golden Paths wizard | Return to previous step | Frontend state | WORKING |
| **Create Service** | Golden Paths → Review step | Call `/api/platform/catalog/register` then poll `/api/platform/catalog/entity/{name}` | `POST /api/platform/catalog/register` | WORKING |
| **Create Service** | Catalog page | Navigate to Golden Paths | Frontend routing | WORKING |
| **Refresh (icon)** | Software Catalog | Re-fetch catalog entities | `/api/catalog/entities`, `/api/platform/catalog/entities` | WORKING |
| **Retry** | Software Catalog error state | Re-fetch catalog entities | `/api/catalog/entities` | WORKING |
| **Create Service via Golden Path** | Software Catalog empty state | Navigate to Golden Paths | Frontend routing | WORKING |
| **Health Indicator chip** | Header | Open Platform Diagnostics drawer | `GET /api/platform/diagnostics` | WORKING |
| **Refresh (icon)** | Header | Re-poll `/api/health` | `GET /api/health` | WORKING |
| **Notifications icon** | Header | (No action — future feature) | — | DISABLED (no-op, awaiting Backstage notifications plugin) |
| **User avatar** | Header | Open user menu | Frontend state | WORKING |
| **User menu: Settings** | Header | Navigate to Settings | Frontend routing | WORKING |
| **Project selector chip** | Header | Switch project context | Frontend state | WORKING |
| **Environment chip** | Header | Switch environment context | Frontend state | WORKING |
| **Rollback** | Deployments table | (Disabled — requires Kubernetes credentials) | — | DISABLED WITH REASON |
| **View All (Environments)** | Environments | Frontend only | — | WORKING |
