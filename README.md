# Fraud Report Image API

An Express API that converts courier fraud-report JSON into a premium
**1080 × 1350 PNG** using EJS, Puppeteer Core, and serverless Chromium.
It runs locally and deploys as a single Node.js Function on Vercel.

## Features

- `POST /generate` generates a retina-quality PNG
- `GET /` provides a JSON editor, preview, and download UI
- Vercel-compatible Chromium via `@sparticuz/chromium`
- Persistent production images in public Vercel Blob storage
- Local images saved in `public/images`
- Generated filenames use timestamps
- Images older than 24 hours are removed during subsequent generations
- Input validation and centralized error handling
- No database or frontend framework

## Requirements

- Node.js 22
- Google Chrome, Chromium, or Microsoft Edge for local development
- A Vercel account
- A public Vercel Blob store for deployed image URLs

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app automatically checks common Chrome locations on macOS, Linux, and
Windows. If Chrome is installed elsewhere, create `.env.local` or export:

```bash
PUPPETEER_EXECUTABLE_PATH="/absolute/path/to/chrome" npm start
```

Without Blob credentials, local PNG files are written to `public/images`.

## Deploy to Vercel

### 1. Push the project to GitHub

```bash
git add .
git commit -m "Make image API Vercel ready"
git push
```

### 2. Import the repository

1. Open [vercel.com/new](https://vercel.com/new).
2. Import the GitHub repository.
3. Keep **Framework Preset** as `Other`.
4. Keep the root directory as the repository root.
5. Do not add a custom build command.
6. Click **Deploy**.

Vercel detects the root `server.js`, imports its default Express app, and
deploys it as one Node.js Function. `vercel.json` includes the EJS templates
and gives image generation a 60-second maximum duration.

### 3. Create and connect a public Blob store

The deployed function cannot persist files in `public/images`; Vercel
Functions have a read-only filesystem with only temporary `/tmp` storage.
Generated reports therefore use Vercel Blob.

1. Open the deployed project in the Vercel dashboard.
2. Go to **Storage**.
3. Select **Create Database** → **Blob**.
4. Create a store with **Public** access.
5. Connect it to Production, Preview, and Development environments.
6. Redeploy the project from **Deployments**.

Vercel automatically supplies the Blob credentials. Do not commit
`BLOB_READ_WRITE_TOKEN` to Git.

### 4. Test the deployment

Open:

```text
https://your-project.vercel.app
```

Or test the API:

```bash
curl -X POST "https://your-project.vercel.app/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "********* ",
    "total_orders": 1,
    "total_delivered": 1,
    "total_cancelled": 0,
    "delivery_rate": "100%",
    "couriers": [
      {
        "courier_name": "Pathao",
        "orders": 0,
        "delivered": 0,
        "cancelled": 0,
        "delivery_rate": "95%",
        "customer_rating": "Excellent Customer"
      },
      {
        "courier_name": "RedX",
        "orders": 1,
        "delivered": 1,
        "cancelled": 0,
        "delivery_rate": "100%"
      }
    ]
  }'
```

Production response:

```json
{
  "success": true,
  "image": "https://your-store.public.blob.vercel-storage.com/reports/report-1723456780000.png"
}
```

The returned Blob URL is public and can be opened directly.

## Deploy with Vercel CLI

```bash
npx vercel
```

After linking the project, create/connect the public Blob store in the
dashboard and deploy production:

```bash
npx vercel --prod
```

To pull Vercel environment variables for local Blob testing:

```bash
npx vercel env pull .env.local
npm run dev
```

When Blob credentials exist locally, generated images are uploaded to Blob
instead of `public/images`.

## API

### `POST /generate`

Required fields:

- `phone`: non-empty string
- `couriers`: non-empty array
- `couriers[].courier_name`: non-empty string

Other numeric and rate fields receive safe defaults when omitted.
`customer_rating` is optional.

Success:

```json
{
  "success": true,
  "image": "/images/report-1723456780000.png"
}
```

Local responses use `/images/...`; Vercel responses use a full public Blob URL.

Validation error:

```json
{
  "success": false,
  "error": "\"phone\" is required and must be a non-empty string"
}
```

## Project Structure

```text
.
├── server.js
├── vercel.json
├── routes
│   ├── preview.js
│   └── report.js
├── templates
│   ├── preview.ejs
│   └── report.ejs
├── utils
│   ├── imageGenerator.js
│   ├── storage.js
│   └── validate.js
├── public
│   └── images
├── .env.example
└── package.json
```

## How Vercel Mode Works

1. Express receives `POST /generate`.
2. EJS renders the report HTML.
3. `puppeteer-core` launches the lightweight serverless Chromium package.
4. Puppeteer captures the PNG directly into memory.
5. The PNG is uploaded to the connected public Blob store.
6. The API returns the permanent Blob URL.
7. Reports older than 24 hours are cleaned up on later generation requests.

The browser may be reused by warm Vercel Function instances. The code does not
depend on that reuse, so cold starts are safe.

## Troubleshooting

### `Vercel Blob is not configured`

Connect a **public** Blob store to the project and redeploy. Confirm that
`BLOB_READ_WRITE_TOKEN` appears under **Settings → Environment Variables**.

### `No local Chrome/Chromium installation found`

Install Chrome or set `PUPPETEER_EXECUTABLE_PATH` to the browser executable.

### Function timeout

The function duration is set to 60 seconds in `vercel.json`. A normal warm
request should finish much faster. Check Function logs for Chromium or Blob
configuration errors.

## Official Vercel References

- [Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Function filesystem support](https://vercel.com/docs/functions/runtimes#file-system-support)
- [Vercel Blob server uploads](https://vercel.com/docs/vercel-blob/server-upload)
- [Public Blob storage](https://vercel.com/docs/vercel-blob/public-storage)
- [Function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration)
