# Fraud Checker JSON API

Main goal: phone number দিলে **JSON data** পাওয়া।

```text
GET /api?number=01943124216
```

Image generation optional — লাগলে আলাদা route আছে।

## Primary API (JSON)

```bash
curl "http://localhost:3000/api?number=01943124216"
```

Success response (upstream JSON as-is):

```json
{
  "success": true,
  "data": {
    "phone": "01943124216",
    "total_orders": 1,
    "total_delivered": 1,
    "total_cancelled": 0,
    "delivery_rate": "100.00%",
    "couriers": [ ... ]
  }
}
```

Other routes:

| Route | Purpose |
| --- | --- |
| `GET /` | API info |
| `GET /health` | Health check |
| `GET /api?number=` | **Main JSON lookup** |
| `GET /generate?number=` | Optional PNG |
| `POST /generate` | Optional PNG from JSON body |
| `GET /preview` | Optional UI |

## Local run

```bash
npm install
npm start
```

Open: `http://localhost:3000/api?number=01943124216`

## Important: Vercel will not work for JSON lookup

EliteMart Cloudflare Vercel IP block করে (`Just a moment...`).

**JSON API production-এ VPS-এ চালান** (DigitalOcean / Contabo / Hetzner / any VPS).

## Deploy on VPS (Docker)

```bash
git clone <your-repo>
cd bornoland-currier
docker compose up -d --build
```

Test:

```bash
curl "http://YOUR_SERVER_IP:3000/api?number=01943124216"
```

Optional nginx + HTTPS:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

## Optional image generation

Only if you also want PNG:

```bash
curl "http://localhost:3000/generate?number=01943124216"
# or
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d @report.json
```

On Vercel, image generation can work with Blob storage, but **number → JSON lookup will still fail** because of Cloudflare.

## Environment

See `.env.example`:

- `FRAUD_CHECK_LOOKUP_URL` — override upstream URL
- `BLOB_READ_WRITE_TOKEN` — only needed for Vercel image storage
- `PUPPETEER_EXECUTABLE_PATH` — Chrome path for local PNG
