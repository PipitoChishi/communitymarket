# CommunityMarket – India's Community Price Tracker

A community-driven web app where anyone can report and track real market prices across India.

## 🌐 Live App
**[communitymarket.onrender.com](https://communitymarket.onrender.com)** ← deploy link goes here

## 🛠 Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js + Express
- **Database**: SQLite (via sql.js — pure JS, no native build tools)

## 🚀 Run Locally

```bash
npm install
npm start        # → http://localhost:3001
npm run dev      # auto-restart with nodemon
```

## 📡 API Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard stats (reports, contributors, cities) |
| GET | `/api/ticker` | Live scrolling ticker items |
| GET | `/api/overview` | Category price averages |
| GET | `/api/chart/:category` | 30-day price history (`groceries`, `fuel`, `vegetables`, `electronics`) |
| GET | `/api/products` | Products list — supports `?search=`, `?category=`, `?sort=` |
| POST | `/api/products` | Submit a new price report |
| GET | `/api/leaderboard` | Top 10 contributors by points |
| GET | `/api/feed` | 6 most recent community reports |

## ☁️ Deploy to Render (Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` and deploys

Your app will be live at: `https://communitymarket.onrender.com`

## 🏷 Domain Names to Register

| Domain | Registrar | Est. Price |
|---|---|---|
| `communitymarket.in` | GoDaddy / Namecheap | ~₹800/yr |
| `communitymarket.co.in` | BigRock | ~₹500/yr |
| `communitymarket.store` | GoDaddy | ~₹200/yr |

Point your domain's DNS **A record** to Render's IP after deploying.
