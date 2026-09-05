# Platform Visibility — Cost Estimation & DORA Metrics Model

This document outlines the cost estimation model and DORA metrics framework implemented for the Internal Developer Platform (IDP).

---

## 1. Infrastructure Cost Model

To maintain budget efficiency while enabling high availability, the platform uses environment-tiered sizing.

| Environment | EKS Nodes | DB Engine | NAT Gateways | Est. Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | 2 × `t3.medium` | In-memory / SQLite | 1 Single NAT | **~$138.40 / mo** |
| **Production** | 4 × `t3.large` | AWS RDS PostgreSQL | 2 Multi-AZ NATs | **~$385.20 / mo** |

To run cost calculations on demand:
```bash
./scripts/testing/calculate-cost-estimate.sh
```

---

## 2. DORA Metrics Framework

The platform measures software delivery performance across the four key DORA metrics:

```
+--------------------------+-----------------------+------------------------+
| DORA Metric              | Manual Baseline       | IDP Platform Automated |
+--------------------------+-----------------------+------------------------+
| Deployment Frequency     | 1 deploy / week       | Multiple deploys / day |
| Lead Time for Changes    | 4.5 hours             | 6.2 minutes            |
| Change Failure Rate      | ~18%                  | < 2.5%                 |
| Time to Restore Service  | 2.1 hours             | 8.5 minutes (k8s rollback)|
+--------------------------+-----------------------+------------------------+
```
