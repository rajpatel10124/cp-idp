# IDP Platform Security Architecture & Threat Model

This document documents the security design, credential isolation rules, RBAC enforcement, and compliance controls built into the Internal Developer Platform (IDP).

---

## 1. Security Architecture Diagram

```
[ Developer / CI ] ──> (OIDC JWT) ──> [ AWS IAM Role ] ──> [ Least-Privilege Policy ] ──> [ ECR / EKS ]
                                             │
                                             ▼
                              [ Secrets Manager / K8s Secret ]
                                             │
                                             ▼
                                 [ Non-Root Container ]
```

---

## 2. Core Security Controls

### 1. Identity & Secret Masking Rules
- **No Hardcoded Secrets**: Real API tokens, AWS keys, and private passwords MUST NEVER be committed to Git. `.env.example` provides parameter templates.
- **GitHub Actions OIDC**: Short-lived AWS STS tokens requested via `aws-actions/configure-aws-credentials` using OpenID Connect (OIDC). Long-lived IAM user keys are prohibited.

### 2. Container Security & Pod Security Standards (PSS)
- **Non-Root Execution**: Container images execute as non-root user (`USER node` / uid 1000).
- **Read-Only Root Filesystem**: Temporary writes directed to `tmpfs` mounts.
- **Image Scanning**: ECR `scan_on_push = true` automatically flags CVE vulnerabilities.

### 3. Kubernetes Admission Enforcement
- **Kyverno & OPA Policies**: Block privileged containers, enforce label requirements, and mandate resource limits before pods hit the API server.

### 4. Database & Storage Encryption
- **S3 TechDocs & State Buckets**: Server-Side Encryption (`AES256`) with public access block enabled.
- **RDS PostgreSQL**: Enforced SSL transport (`rejectUnauthorized: false` / TLS 1.3) and encrypted storage at rest.

---

## 3. Automated Security Verification Script

Run security auditing across the monorepo:
```bash
./scripts/validation/validate-security.sh
```
