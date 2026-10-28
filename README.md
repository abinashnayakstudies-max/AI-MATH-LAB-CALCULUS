# AI Math Lab — Next-Generation Calculus Platform & 3D MVT Explorer

**AI Math Lab** is an interactive, modern computational mathematics application combining symbolic calculus, numerical methods, a trained PyTorch model, and rich 3D Three.js visualizations.

---

## 🚀 Key Modules & Capabilities

1. **Generalized Mean Value Theorem (MVT) Explorer:**
   - Interactive 3D/2D WebGL visualization (Three.js) with real-time coordinate inspection.
   - Dual perspective: 3D orbit view vs. 2D flat planar orthographic projection.
   - AI ML candidate estimation (`mvt_model_v4.pt`) + Brent numerical root verification.
   - Dynamic tangent lines, secant slopes, and interactive click-to-pin coordinate evaluation.

2. **Symbolic Calculus Engine:**
   - 1st through 5th order derivatives ($f', f'', f''', \dots$) and indefinite/definite integrals via SymPy.
   - Exact analytical LaTeX expressions and real-time dual curve previews.

3. **Taylor & Maclaurin Series Expansions:**
   - Dynamic polynomial order slider ($N = 1 \dots 10$) with step-by-step term breakdowns.
   - Visual convergence comparison plot showing exact $f(x)$ vs. Taylor polynomial $P_N(x)$.

4. **Riemann Sums & Area Visualizer:**
   - Definite integral approximation using Left, Right, Midpoint, and Trapezoidal rules.
   - Live partition slider ($n = 4 \dots 50$) with geometric rectangle rendering and error quantification.

5. **Critical Points, Extrema & Inflections:**
   - Stationary point detection, local maxima/minima classification via second derivative test.
   - Global extrema on closed intervals $[a, b]$ and inflection points where $f''(x) = 0$.

6. **Limits & Continuity:**
   - One-sided ($x \to a^-, x \to a^+$) and two-sided limits, limits at infinity ($\pm \infty$), and continuity testing.

7. **Smart Math Parser with Implicit Multiplication:**
   - Write standard natural math like `2x`, `3sin(x)`, `x(x+1)`, `4e^x`, and `ln(x)` without requiring explicit multiplication asterisks (`*`).

---

## 🛠️ Project Structure

```text
ai-math-lab/
├── backend/
│   ├── app.py               # FastAPI server & mathematical engines
│   ├── requirements.txt     # Python dependencies
│   ├── test_backend.py      # Automated backend unit test suite
│   ├── Dockerfile           # Production container build
│   └── models/
│       └── mvt_model_v4.pt  # Trained PyTorch MVT neural network
├── frontend/
│   ├── package.json         # React 18, Vite, Three.js, Lucide icons
│   ├── index.html           # Modern typography & meta tags
│   ├── vercel.json          # Vercel deployment configuration
│   └── src/
│       ├── main.jsx         # Full interactive client application
│       └── style.css        # Cyber-scientific glassmorphic UI design
├── render.yaml              # Render blueprint deployment config
└── README.md
```

---

## 💻 Local Development

### Backend (Python FastAPI)

From the `backend` directory:

```bash
# Set up virtual environment
python -m venv .venv

# Activate environment:
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies and run
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

- API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Run automated unit tests:
  ```bash
  python test_backend.py
  ```

### Frontend (React + Vite)

From the `frontend` directory:

```bash
npm install
npm run dev
```

Create `.env.local` if pointing to a remote backend:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🌐 Production Deployment

### 1. Backend on Render (Web Service or Docker)
The repository includes a ready-to-deploy `render.yaml` blueprint:
- **Runtime:** Python 3.11.9 (or Docker via `backend/Dockerfile`)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`

### 2. Frontend on Vercel
1. Import the repository into Vercel.
2. Select **Vite** as framework and set **Root Directory** to `frontend`.
3. Add environment variable:
   `VITE_API_BASE_URL=https://your-backend.onrender.com`
4. Deploy!

---

## 📡 API Endpoints

- `GET /` — API service overview and available endpoints
- `GET /health` — Health check & model status
- `POST /function-value` — Evaluate $f(x)$ at $x$
- `POST /mvt` — Mean Value Theorem numerical & AI solver
- `POST /calculus` — Symbolic differentiation and integration
- `POST /taylor` — Taylor series polynomial expansion & curve sampling
- `POST /riemann-sum` — Numerical integration & partition rectangles
- `POST /critical-points` — Stationary points, extrema, and inflections
- `POST /limits` — One-sided/two-sided limits and continuity check
