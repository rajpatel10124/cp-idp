# ${{ values.component_id }} Architecture & Documentation

Welcome to the documentation for background worker **${{ values.component_id }}**.

## Architecture & Queue Consumer Flow

```
Event Stream / Queue ──> Poller ──> Worker Concurrency Pool (${{ values.concurrency }} threads) ──> Prometheus Metrics (Port 9090)
```

## Operation & Monitoring

- **Concurrency**: `${{ values.concurrency }}` parallel job executions.
- **Health Probes**: `GET http://localhost:9090/healthz`
- **Metrics**: `GET http://localhost:9090/metrics`
