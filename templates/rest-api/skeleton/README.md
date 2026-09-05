# ${{ values.component_id }}

${{ values.description }}

This microservice was generated automatically via the **Internal Developer Platform (IDP)** REST API Golden Path template.

---

## 🚀 Service Summary

- **Service Name**: `${{ values.component_id }}`
- **Owner Team**: `${{ values.owner }}`
- **Environment**: `${{ values.environment }}`
- **HTTP Listening Port**: `${{ values.port }}`

---

## 🛠️ Local Execution

```bash
# Install dependencies
npm install

# Start local server
npm start
```

---

## 📊 Endpoints

- `GET /api/v1/resource` — Query resource items.
- `POST /api/v1/resource` — Create new resource item.
- `GET /healthz` — Liveness & readiness probe endpoint.
- `GET /metrics` — Prometheus metrics export endpoint.
