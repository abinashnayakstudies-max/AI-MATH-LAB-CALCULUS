# AI Math Lab — MVT Explorer + Calculus Engine

AI Math Lab is an interactive mathematics website combining a generalized Mean Value Theorem (MVT) explorer, numerical root finding, a trained PyTorch model, a Three.js visualization, a function-value finder, and a symbolic calculus workspace.

## Project structure

```text
ai-math-lab/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── models/
│       └── mvt_model_v4.pt
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       └── style.css
├── render.yaml
├── README.md
└── THIRD_PARTY_NOTICES.md
```

## Features

- **MVT Explorer:** numerical MVT point search, ML candidate estimate, hybrid verification, and an interactive 3D curve/secant/tangent scene.
- **Coordinate interaction:** labelled X/Y/Z axes, origin, hover coordinates, and click-to-pin curve points.
- **Function Value Finder:** evaluates `f(x)` at a selected input.
- **Calculus Engine:** first through fifth derivatives, indefinite integration, and definite integration.
- **Calculus plot:** previews the original function and its first derivative.
- **Restricted expression parser:** supports `x`, numeric constants, `pi`, `e`, arithmetic operators, powers, parentheses, and common functions (`sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `sinh`, `cosh`, etc.).

## Local development

### Backend

From the `backend` directory:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

API documentation: `http://127.0.0.1:8000/docs`

Health check: `http://127.0.0.1:8000/health`

### Frontend

In a second terminal, from `frontend`:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend URL if it differs from the default. Restart the Vite server after changing environment variables.

## Deployment recommendation

The frontend can be deployed to **Vercel**, while the FastAPI backend and PyTorch model remain on **Render**. This keeps the current ML stack on a persistent Python service rather than forcing PyTorch/SciPy into a serverless function.

### Backend on Render

The root `render.yaml` contains a Render Blueprint for the backend. Import the repository into Render or update the existing Web Service with:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

After deployment, verify `/health` reports `"model_available": true`.

### Frontend on Vercel

1. Import this repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**.
4. Add environment variable `VITE_API_BASE_URL` with the full URL of the deployed Render backend (no trailing slash), for example `https://your-backend.onrender.com`.
5. Deploy the frontend.

The frontend and backend are deployed separately, but remain in this single repository. Do not switch off the existing deployment until both services have been verified.

## API endpoints

- `GET /health`
- `POST /mvt` — body: `{"expression":"x^2","a":-2,"b":3}`
- `POST /function-value` — body: `{"expression":"x^2","x":3}`
- `POST /calculus` — body examples:

Differentiate:
```json
{"expression":"x^3 + 2*x^2 - 5*x + 1","operation":"differentiate","order":1}
```

Indefinite integral:
```json
{"expression":"x^2","operation":"integrate"}
```

Definite integral:
```json
{"expression":"x^2","operation":"definite_integral","a":0,"b":3}
```

The calculus endpoint returns symbolic output and sampled points for plotting. Mathematical expressions can still have domain restrictions; only use expressions and intervals where the relevant operation is defined.

## Important note

Machine-learning predictions are estimates, not mathematical proofs. MVT candidates are independently checked with numerical methods. Numerical root searches may not detect every root for every possible function. This is an educational project, not a universal computer algebra system.
