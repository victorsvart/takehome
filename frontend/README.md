# Frontend: Renewal Risk Dashboard

React + TypeScript dashboard using `shadcn/ui` with Tailwind CSS v4.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- shadcn/ui (`radix`, `nova` preset)

## Run

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Environment

- `VITE_API_BASE_URL` defaults to `http://localhost:3000/api/v1`
- `VITE_DEFAULT_PROPERTY_ID` is optional and can preload a property id

## Route

- `http://localhost:5173/properties/<propertyId>/renewal-risk`

The page includes:

- latest risk load + manual refresh
- calculate risk action (`asOfDate`)
- risk summary cards
- flagged resident table with expandable signal details
- per-resident `Trigger Renewal Event` action with status feedback

## Validation Commands

```bash
npm run lint
npm run build
```
