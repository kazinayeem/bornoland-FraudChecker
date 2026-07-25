# Fraud Report Image API

Production-ready Node.js API that receives fraud report JSON and renders a
premium, Apple/Stripe-style dashboard PNG (**1080 × 1350**, retina quality)
using **Express + EJS + Puppeteer**.

## Features

- `POST /generate` — JSON in, PNG out
- `GET /images/report-<timestamp>.png` — serve generated images
- `GET /` — preview page with JSON editor, live preview and download button
- Auto filenames using timestamps
- Old images auto-deleted after 24 hours (hourly cleanup job)
- Reused headless browser instance (fast repeated generation)
- Input validation and centralized error handling
- Graceful shutdown (closes Chromium cleanly)

## Getting Started

```bash
npm install
npm start
```

Server runs at `http://localhost:3000` (override with `PORT` env variable).

## API

### POST /generate

Request body:

```json
{
  "phone": "01943124216",
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
}
```

Response:

```json
{
  "success": true,
  "image": "/images/report-1721990000000.png"
}
```

`courier.customer_rating` is optional — when present it renders as a green
⭐ badge under the courier name.

## Project Structure

```
project
├── server.js              # Express app, error handling, shutdown
├── routes
│   ├── report.js          # POST /generate
│   └── preview.js         # GET / (preview page)
├── templates
│   ├── report.ejs         # PNG dashboard template (540x675 @2x = 1080x1350)
│   └── preview.ejs        # Browser preview page
├── utils
│   ├── imageGenerator.js  # Puppeteer rendering (shared browser instance)
│   ├── cleanup.js         # Deletes images older than 24h
│   └── validate.js        # Request payload validation
├── public
│   └── images/            # Generated PNGs (auto-cleaned)
└── package.json
```

## Notes

- The image is rendered at a 540 × 675 CSS viewport with `deviceScaleFactor: 2`,
  producing a crisp 1080 × 1350 PNG.
- Chromium is launched with `--no-sandbox` for container compatibility; remove
  the flag if your environment supports sandboxing.
