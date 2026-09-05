# Role-Based Access Control (RBAC) Matrix

ForgeOps implements role-based access control enforced across both UI components and backend API routers.

## Platform Roles & Permissions

| Role | Catalog Read | Scaffold Service | Deploy Workload | Terraform Operations | Manage Policies |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Viewer** | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Developer** | ✓ | ✓ | ✓ (Dev/Staging) | ✗ | ✗ |
| **Platform Engineer** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Platform Admin** | ✓ | ✓ | ✓ | ✓ | ✓ |

## Enforcing Role State
The UI includes an active Role Switcher in the top header, allowing demonstration of permission restrictions during viva evaluation.
