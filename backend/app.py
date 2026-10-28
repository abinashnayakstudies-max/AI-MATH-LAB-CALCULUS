from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sympy as sp
import numpy as np
import torch
import torch.nn as nn
from scipy.optimize import brentq
import os
import ast
import operator
import re

x = sp.Symbol("x")

app = FastAPI(
    title="AI Math Lab API",
    version="2.0.0",
    description="Computational mathematics API with symbolic calculus, numerical methods, and AI-assisted MVT solving."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MVTModelV4(nn.Module):
    def __init__(self):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(102, 128), nn.ReLU(),
            nn.Linear(128, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, 1), nn.Sigmoid()
        )
    def forward(self, x):
        return self.network(x)

model = MVTModelV4()
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "mvt_model_v4.pt")
MODEL_AVAILABLE = False

if os.path.exists(MODEL_PATH):
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
        model.eval()
        MODEL_AVAILABLE = True
    except Exception as e:
        print(f"Warning: could not load PyTorch model: {e}")


def preprocess_expression(expression: str) -> str:
    """Preprocess math input: replace ^ with **, ln with log, and insert implicit multiplications."""
    expr = expression.strip()
    if not expr or len(expr) > 200:
        raise ValueError("Expression must contain 1–200 characters.")
    
    # Normalize ln to log
    expr = re.sub(r'\bln\b', 'log', expr)
    expr = expr.replace("^", "**")

    # Implicit multiplication conversions:
    # 1. Number directly before variable, constant, or function: 2x -> 2*x, 3sin(x) -> 3*sin(x), 4pi -> 4*pi
    expr = re.sub(r'(\d+)\s*([a-zA-Z])', r'\1*\2', expr)
    # 2. Number or variable directly before open parenthesis: 2(x+1) -> 2*(x+1), x(x+1) -> x*(x+1)
    expr = re.sub(r'(\d+|\bx\b)\s*\(', r'\1*(', expr)
    # 3. Close parenthesis directly before number, variable, or function: (x+1)x -> (x+1)*x, (x+1)2 -> (x+1)*2
    expr = re.sub(r'\)\s*([0-9a-zA-Z])', r')*\1', expr)
    # 4. Close parenthesis directly before open parenthesis: (x+1)(x-1) -> (x+1)*(x-1)
    expr = re.sub(r'\)\s*\(', r')*(', expr)
    # 5. Variable x directly before a function call: x sin(x) -> x*sin(x)
    expr = re.sub(r'\b(x)\s*([a-zA-Z_]\w*)', r'\1*\2', expr)

    return expr


def parse_math_expression(expression: str):
    """Safely parse arithmetic and elementary functions using Python AST."""
    cleaned = preprocess_expression(expression)
    tree = ast.parse(cleaned, mode="eval")

    allowed_functions = {
        "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
        "asin": sp.asin, "acos": sp.acos, "atan": sp.atan,
        "sec": sp.sec, "csc": sp.csc, "cot": sp.cot,
        "exp": sp.exp, "log": sp.log, "sqrt": sp.sqrt,
        "abs": sp.Abs, "sinh": sp.sinh, "cosh": sp.cosh, "tanh": sp.tanh,
    }
    binary_ops = {
        ast.Add: operator.add, ast.Sub: operator.sub,
        ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Pow: operator.pow,
    }
    unary_ops = {ast.UAdd: operator.pos, ast.USub: operator.neg}

    def visit(node):
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return sp.Integer(node.value) if isinstance(node.value, int) else sp.Float(node.value)
        if isinstance(node, ast.Name):
            if node.id == "x": return x
            if node.id == "pi": return sp.pi
            if node.id == "e": return sp.E
            raise ValueError(f"Unsupported symbol '{node.id}'. Supported symbols: x, pi, e.")
        if isinstance(node, ast.BinOp) and type(node.op) in binary_ops:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow) and hasattr(right, "is_number") and right.is_number:
                try:
                    if abs(float(right)) > 100:
                        raise ValueError("Exponent magnitude must not exceed 100.")
                except Exception:
                    pass
            return binary_ops[type(node.op)](left, right)
        if isinstance(node, ast.UnaryOp) and type(node.op) in unary_ops:
            return unary_ops[type(node.op)](visit(node.operand))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in allowed_functions and len(node.args) == 1 and not node.keywords:
            return allowed_functions[node.func.id](visit(node.args[0]))
        raise ValueError("Invalid expression syntax. Use x, numbers, +, -, *, /, ^, parentheses, and functions like sin, cos, exp, ln, sqrt.")

    result = visit(tree)
    if not isinstance(result, sp.Expr):
        result = sp.sympify(result)
    if len(str(result)) > 1000:
        raise ValueError("Expression is too complex.")
    return result


def find_mvt_points(expr, derivative, a, b, grid_size=300):
    f = sp.lambdify(x, expr, "numpy")
    df = sp.lambdify(x, derivative, "numpy")
    secant_slope = float((f(b) - f(a)) / (b - a))

    def equation(z):
        try:
            return float(df(z) - secant_slope)
        except Exception:
            return float("nan")

    grid = np.linspace(a, b, grid_size)
    values = np.asarray([equation(z) for z in grid], dtype=float)
    roots = []

    for i in range(len(grid) - 1):
        y1, y2 = values[i], values[i + 1]
        if not np.isfinite(y1) or not np.isfinite(y2):
            continue
        if abs(y1) < 1e-10:
            roots.append(float(grid[i]))
        elif y1 * y2 < 0:
            try:
                root = brentq(equation, grid[i], grid[i + 1])
                if a < root < b:
                    roots.append(float(root))
            except Exception:
                pass

    unique_roots = []
    for r in roots:
        if not any(abs(r - u) < 1e-6 for u in unique_roots):
            unique_roots.append(r)
    return unique_roots, secant_slope, f, df


def create_v4_features(expr, derivative, a, b):
    f = sp.lambdify(x, expr, "numpy")
    df = sp.lambdify(x, derivative, "numpy")
    x_grid = np.linspace(a, b, 50)
    f_values = np.asarray(f(x_grid), dtype=float)
    df_values = np.asarray(df(x_grid), dtype=float)

    if not np.all(np.isfinite(f_values)):
        raise ValueError("Function produced non-finite values in this interval.")
    if not np.all(np.isfinite(df_values)):
        raise ValueError("Derivative produced non-finite values in this interval.")

    f_std = np.std(f_values)
    df_std = np.std(df_values)
    if f_std < 1e-10 or df_std < 1e-10:
        raise ValueError("Function variation is too small.")

    f_values = (f_values - np.mean(f_values)) / f_std
    df_values = (df_values - np.mean(df_values)) / df_std

    features = np.concatenate([f_values, df_values, [a, b]])
    if len(features) != 102:
        raise ValueError(f"Expected 102 features, got {len(features)}")
    return features


def predict_ml_c(expr, derivative, a, b):
    if not MODEL_AVAILABLE:
        raise RuntimeError("PyTorch model was not loaded.")
    features = create_v4_features(expr, derivative, a, b)
    tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        relative_c = model(tensor).item()
    c_ml = a + relative_c * (b - a)
    return c_ml, relative_c


# ==========================================
# API ROUTES
# ==========================================

@app.get("/")
def root():
    return {
        "service": "AI Math Lab API",
        "version": "2.0.0",
        "status": "online",
        "model_available": MODEL_AVAILABLE,
        "endpoints": [
            "/health",
            "/function-value",
            "/mvt",
            "/calculus",
            "/limits",
            "/critical-points",
            "/taylor",
            "/riemann-sum"
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "AI Math Lab",
        "model_available": MODEL_AVAILABLE
    }


class FunctionValueRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    x: float


@app.post("/function-value")
def function_value(req: FunctionValueRequest):
    try:
        expr = parse_math_expression(req.expression)
        f = sp.lambdify(x, expr, "numpy")
        val = float(f(req.x))
        if not np.isfinite(val):
            return {"error": "Function is not finite at this x coordinate."}
        return {"expression": str(expr), "x": req.x, "value": val}
    except Exception as e:
        return {"error": f"Evaluation error: {str(e)}"}


class MVTRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    a: float
    b: float


@app.post("/mvt")
def calculate_mvt(req: MVTRequest):
    if req.a >= req.b:
        return {"error": "Lower bound a must be strictly less than upper bound b."}

    try:
        expr = parse_math_expression(req.expression)
        derivative = sp.diff(expr, x)

        points, secant_slope, f, df = find_mvt_points(expr, derivative, req.a, req.b)
        if len(points) == 0:
            return {"error": "No MVT point c was found numerically in this interval."}

        midpoint = (req.a + req.b) / 2
        canonical_c = min(points, key=lambda c: abs(c - midpoint))
        numerical_residual = abs(float(df(canonical_c) - secant_slope))

        # Sample curve points for 3D and 2D visualization
        plot_x = np.linspace(req.a, req.b, 161)
        plot_points = []
        for px in plot_x:
            try:
                py = float(f(px))
                if np.isfinite(py) and abs(py) < 1e7:
                    plot_points.append({"x": float(px), "y": py})
            except Exception:
                continue

        ml_available = False
        ml_c = ml_relative_c = ml_residual = None
        if MODEL_AVAILABLE:
            try:
                ml_c, ml_relative_c = predict_ml_c(expr, derivative, req.a, req.b)
                ml_residual = abs(float(df(ml_c) - secant_slope))
                ml_available = True
            except Exception as e:
                print("ML prediction notice:", e)

        hybrid_c = hybrid_residual = None
        if ml_available and ml_c is not None:
            if ml_residual is not None and ml_residual <= 1e-3:
                hybrid_c, hybrid_residual = ml_c, ml_residual
            else:
                hybrid_c = min(points, key=lambda c: abs(c - ml_c))
                hybrid_residual = abs(float(df(hybrid_c) - secant_slope))
        else:
            hybrid_c = canonical_c
            hybrid_residual = numerical_residual

        return {
            "expression": str(expr),
            "derivative": str(derivative),
            "a": req.a,
            "b": req.b,
            "secant_slope": secant_slope,
            "mvt_points": points,
            "canonical_c": canonical_c,
            "numerical_residual": numerical_residual,
            "ml_available": ml_available,
            "ml_c": ml_c,
            "ml_relative_c": ml_relative_c,
            "ml_residual": ml_residual,
            "hybrid_c": hybrid_c,
            "hybrid_residual": hybrid_residual,
            "plot_points": plot_points,
            "valid": req.a < canonical_c < req.b
        }
    except Exception as e:
        return {"error": f"MVT calculation error: {str(e)}"}


class CalculusRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    operation: str
    a: float | None = None
    b: float | None = None
    order: int = Field(default=1, ge=1, le=5)


@app.post("/calculus")
def calculate_calculus(req: CalculusRequest):
    if req.operation not in {"differentiate", "integrate", "definite_integral"}:
        return {"error": "Unsupported operation. Choose differentiate, integrate, or definite_integral."}
    try:
        expr = parse_math_expression(req.expression)
        if req.operation == "differentiate":
            result = sp.diff(expr, x, req.order)
            operation_name = f"{req.order}{'st' if req.order == 1 else 'nd' if req.order == 2 else 'rd' if req.order == 3 else 'th'} Derivative"
        elif req.operation == "integrate":
            result = sp.integrate(expr, x)
            operation_name = "Indefinite Integral"
        else:
            if req.a is None or req.b is None:
                return {"error": "Both lower and upper limits are required for a definite integral."}
            if req.a > req.b:
                return {"error": "Lower limit must be less than or equal to upper limit."}
            result = sp.integrate(expr, (x, req.a, req.b))
            operation_name = "Definite Integral"

        derivative = sp.diff(expr, x)
        f = sp.lambdify(x, expr, "numpy")
        df = sp.lambdify(x, derivative, "numpy")
        left = req.a if req.a is not None else -5.0
        right = req.b if req.b is not None else 5.0
        if not np.isfinite(left) or not np.isfinite(right) or left >= right:
            left, right = -5.0, 5.0
        left, right = max(left, -50.0), min(right, 50.0)
        xs = np.linspace(left, right, 141)
        original_points, derivative_points = [], []
        for xv in xs:
            try:
                yv = float(f(xv))
                dyv = float(df(xv))
                if np.isfinite(yv) and abs(yv) < 1e7:
                    original_points.append({"x": float(xv), "y": yv})
                if np.isfinite(dyv) and abs(dyv) < 1e7:
                    derivative_points.append({"x": float(xv), "y": dyv})
            except Exception:
                continue

        steps = []
        if req.operation == "differentiate":
            steps.append({
                "title": "Define function",
                "description": "Expression to differentiate with respect to x",
                "latex": f"f(x) = {sp.latex(expr)}"
            })
            if req.order == 1:
                steps.append({
                    "title": "Apply differentiation rules",
                    "description": "Compute first derivative with standard rules",
                    "latex": f"\\frac{{d}}{{dx}}\\left[{sp.latex(expr)}\\right]"
                })
                steps.append({
                    "title": "Resulting derivative",
                    "description": "Simplified closed-form derivative",
                    "latex": f"f'(x) = {sp.latex(result)}"
                })
            else:
                for ord_i in range(1, req.order + 1):
                    d_i = sp.diff(expr, x, ord_i)
                    steps.append({
                        "title": f"Order {ord_i} derivative",
                        "description": f"Differentiating f^({ord_i - 1})(x)",
                        "latex": f"f^{{({ord_i})}}(x) = {sp.latex(d_i)}"
                    })
        elif req.operation == "integrate":
            steps.append({
                "title": "Set up indefinite integral",
                "description": "Find antiderivative of the function",
                "latex": f"\\int \\left({sp.latex(expr)}\\right) dx"
            })
            steps.append({
                "title": "Antiderivative calculation",
                "description": "Evaluate closed-form antiderivative",
                "latex": f"= {sp.latex(result)}"
            })
            steps.append({
                "title": "Constant of integration",
                "description": "Include arbitrary constant C for family of curves",
                "latex": f"{sp.latex(result)} + C"
            })
        else:
            steps.append({
                "title": "Set up definite integral",
                "description": f"Net signed area over [{req.a}, {req.b}]",
                "latex": f"\\int_{{{req.a}}}^{{{req.b}}} \\left({sp.latex(expr)}\\right) dx"
            })
            antideriv = sp.integrate(expr, x)
            steps.append({
                "title": "Find general antiderivative F(x)",
                "description": "Determine indefinite integral F(x)",
                "latex": f"F(x) = {sp.latex(antideriv)}"
            })
            steps.append({
                "title": "Fundamental Theorem of Calculus",
                "description": f"Evaluate F({req.b}) - F({req.a})",
                "latex": f"\\left[ {sp.latex(antideriv)} \\right]_{{{req.a}}}^{{{req.b}}}"
            })
            steps.append({
                "title": "Final evaluated area",
                "description": "Evaluated definite integral value",
                "latex": f"= {sp.latex(result)}"
            })

        return {
            "success": True,
            "operation": operation_name,
            "expression": str(expr),
            "result": str(result),
            "latex": sp.latex(result),
            "original_latex": sp.latex(expr),
            "derivative": str(derivative),
            "variable": "x",
            "plot_points": original_points,
            "derivative_plot_points": derivative_points,
            "integration_constant_note": "+ C" if req.operation == "integrate" else None,
            "steps": steps
        }
    except Exception as e:
        return {"error": f"Calculus calculation error: {str(e)}"}


class LimitRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    point: str = Field(default="0", max_length=30)
    operation: str = "limit"
    direction: str = "both"


def parse_limit_point(point: str):
    point = point.strip().lower()
    if point in {"oo", "+oo", "inf", "+inf", "infinity", "+infinity"}:
        return sp.oo
    if point in {"-oo", "-inf", "-infinity"}:
        return -sp.oo
    value = float(point)
    if not np.isfinite(value) or abs(value) > 1_000_000:
        raise ValueError("Enter a finite number within ±1,000,000 or use oo/-oo.")
    return sp.Float(value)


@app.post("/limits")
def calculate_limits(req: LimitRequest):
    try:
        expr = parse_math_expression(req.expression)
        point = parse_limit_point(req.point)

        if req.operation not in {"limit", "continuity"}:
            return {"error": "Unsupported operation. Choose limit or continuity."}
        if req.direction not in {"both", "left", "right"}:
            return {"error": "Direction must be both, left, or right."}
        if req.operation == "continuity" and point in {sp.oo, -sp.oo}:
            return {"error": "Continuity must be checked at a finite point."}

        if point in {sp.oo, -sp.oo}:
            limit_val = sp.limit(expr, x, point)
            return {
                "success": True,
                "operation": "Limit at infinity",
                "expression": str(expr),
                "point": str(point),
                "result": str(limit_val),
                "latex": sp.latex(limit_val),
                "direction": "both"
            }

        left_lim = sp.limit(expr, x, point, dir="-")
        right_lim = sp.limit(expr, x, point, dir="+")
        func_val = sp.simplify(expr.subs(x, point))

        if req.operation == "limit":
            if req.direction == "left":
                res = left_lim
            elif req.direction == "right":
                res = right_lim
            else:
                if sp.simplify(left_lim - right_lim) == 0:
                    res = left_lim
                else:
                    res = "Does not exist (left limit != right limit)"

            return {
                "success": True,
                "operation": "Limit",
                "expression": str(expr),
                "point": str(point),
                "direction": req.direction,
                "left_limit": str(left_lim),
                "right_limit": str(right_lim),
                "result": str(res),
                "latex": sp.latex(res) if isinstance(res, sp.Expr) else str(res)
            }

        continuous = (
            getattr(left_lim, 'is_finite', False) is True
            and getattr(right_lim, 'is_finite', False) is True
            and getattr(func_val, 'is_finite', False) is True
            and sp.simplify(left_lim - right_lim) == 0
            and sp.simplify(left_lim - func_val) == 0
        )

        return {
            "success": True,
            "operation": "Continuity Check",
            "expression": str(expr),
            "point": str(point),
            "left_limit": str(left_lim),
            "right_limit": str(right_lim),
            "function_value": str(func_val),
            "continuous": bool(continuous),
            "result": f"Continuous at x = {point}" if continuous else f"Discontinuous at x = {point}"
        }
    except Exception as e:
        return {"error": f"Limit calculation error: {str(e)}"}


class CriticalPointsRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    a: float = Field(default=-10.0, ge=-1000, le=1000)
    b: float = Field(default=10.0, ge=-1000, le=1000)


@app.post("/critical-points")
def calculate_critical_points(req: CriticalPointsRequest):
    try:
        if req.a >= req.b:
            return {"error": "Lower bound a must be strictly less than upper bound b."}

        expr = parse_math_expression(req.expression)
        df = sp.diff(expr, x)
        d2f = sp.diff(df, x)

        domain = sp.Interval(req.a, req.b)
        sol_set = sp.solveset(df, x, domain=domain)

        candidates = []
        if isinstance(sol_set, sp.FiniteSet):
            candidates = list(sol_set)
        else:
            # Numerical root search for transcendental equations
            df_np = sp.lambdify(x, df, "numpy")
            grid = np.linspace(req.a, req.b, 1001)
            vals = []
            for pt in grid:
                try:
                    v = float(df_np(float(pt)))
                    vals.append(v if np.isfinite(v) else np.nan)
                except Exception:
                    vals.append(np.nan)

            for i in range(len(grid) - 1):
                y1, y2 = vals[i], vals[i + 1]
                if np.isnan(y1) or np.isnan(y2):
                    continue
                if abs(y1) < 1e-8:
                    candidates.append(sp.Float(grid[i]))
                elif y1 * y2 < 0:
                    try:
                        r = brentq(lambda z: float(df_np(z)), grid[i], grid[i + 1])
                        candidates.append(sp.Float(r))
                    except Exception:
                        pass

        f_np = sp.lambdify(x, expr, "numpy")
        d2f_np = sp.lambdify(x, d2f, "numpy")

        numeric_pts = []
        for c in candidates:
            try:
                p = float(sp.N(c))
                if np.isfinite(p) and (req.a - 1e-7 <= p <= req.b + 1e-7):
                    if not any(abs(p - ex) < 1e-5 for ex in numeric_pts):
                        numeric_pts.append(p)
            except Exception:
                continue

        numeric_pts.sort()

        critical_points = []
        for p in numeric_pts:
            try:
                y_val = float(f_np(p))
                second_val = float(d2f_np(p))
                if not (np.isfinite(y_val) and np.isfinite(second_val)):
                    continue

                if second_val > 1e-6:
                    classification = "Local Minimum"
                elif second_val < -1e-6:
                    classification = "Local Maximum"
                else:
                    classification = "Stationary Point (Inconclusive)"

                critical_points.append({
                    "x": round(p, 5),
                    "y": round(y_val, 5),
                    "second_derivative": round(second_val, 5),
                    "classification": classification
                })
            except Exception:
                continue

        # Check inflection points (where d2f == 0)
        inflection_points = []
        try:
            d2_sols = sp.solveset(d2f, x, domain=domain)
            if isinstance(d2_sols, sp.FiniteSet):
                for inf_c in d2_sols:
                    ip = float(sp.N(inf_c))
                    if req.a <= ip <= req.b:
                        iy = float(f_np(ip))
                        if np.isfinite(iy):
                            inflection_points.append({"x": round(ip, 5), "y": round(iy, 5)})
        except Exception:
            pass

        # Global extrema on closed interval [a, b]
        all_evals = []
        for boundary in [req.a, req.b]:
            try:
                by = float(f_np(boundary))
                if np.isfinite(by):
                    all_evals.append({"x": round(boundary, 5), "y": round(by, 5), "type": f"Boundary x={boundary}"})
            except Exception:
                pass

        for cp in critical_points:
            all_evals.append({"x": cp["x"], "y": cp["y"], "type": cp["classification"]})

        global_max = max(all_evals, key=lambda it: it["y"]) if all_evals else None
        global_min = min(all_evals, key=lambda it: it["y"]) if all_evals else None

        # Sample plot points
        plot_x = np.linspace(req.a, req.b, 161)
        plot_points = []
        for pt in plot_x:
            try:
                v = float(f_np(float(pt)))
                if np.isfinite(v) and abs(v) < 1e7:
                    plot_points.append({"x": float(pt), "y": v})
            except Exception:
                continue

        return {
            "success": True,
            "expression": str(expr),
            "first_derivative": str(df),
            "second_derivative": str(d2f),
            "interval": {"a": req.a, "b": req.b},
            "critical_points": critical_points,
            "inflection_points": inflection_points,
            "global_maximum": global_max,
            "global_minimum": global_min,
            "number_of_critical_points": len(critical_points),
            "plot_points": plot_points
        }
    except Exception as e:
        return {"error": f"Critical point error: {str(e)}"}


# ==========================================
# TAYLOR & MACLAURIN SERIES EXPANSION
# ==========================================

class TaylorRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    point: float = Field(default=0.0)
    order: int = Field(default=4, ge=1, le=12)


@app.post("/taylor")
def calculate_taylor(req: TaylorRequest):
    try:
        expr = parse_math_expression(req.expression)
        center = req.point
        
        # Calculate Taylor series polynomial
        series_poly = sp.series(expr, x, x0=center, n=req.order + 1).removeO()
        
        # Step-by-step term breakdown: f^(k)(a)/k! * (x - a)^k
        terms = []
        f_eval = expr
        factorial = 1
        for k in range(req.order + 1):
            if k > 0:
                factorial *= k
                f_eval = sp.diff(f_eval, x)
            try:
                deriv_val = sp.simplify(f_eval.subs(x, center))
                coeff = deriv_val / factorial
                if coeff != 0:
                    term_str = f"{coeff}*(x - {center})^{k}" if center != 0 else f"{coeff}*x^{k}"
                    terms.append({
                        "order": k,
                        "derivative_value": str(deriv_val),
                        "coefficient": str(coeff),
                        "latex": sp.latex(coeff * (x - center)**k if center != 0 else coeff * x**k)
                    })
            except Exception:
                continue

        # Plot curves for f(x) and Taylor approximation
        f_np = sp.lambdify(x, expr, "numpy")
        taylor_np = sp.lambdify(x, series_poly, "numpy")
        
        span = 4.0
        grid = np.linspace(center - span, center + span, 141)
        original_points = []
        taylor_points = []
        
        for gx in grid:
            try:
                y_orig = float(f_np(gx))
                if np.isfinite(y_orig) and abs(y_orig) < 1e5:
                    original_points.append({"x": float(gx), "y": y_orig})
            except Exception:
                pass
            try:
                y_tay = float(taylor_np(gx))
                if np.isfinite(y_tay) and abs(y_tay) < 1e5:
                    taylor_points.append({"x": float(gx), "y": y_tay})
            except Exception:
                pass

        return {
            "success": True,
            "expression": str(expr),
            "point": center,
            "order": req.order,
            "polynomial": str(series_poly),
            "latex": sp.latex(series_poly),
            "terms": terms,
            "original_plot_points": original_points,
            "taylor_plot_points": taylor_points
        }
    except Exception as e:
        return {"error": f"Taylor expansion error: {str(e)}"}


# ==========================================
# RIEMANN SUMS & NUMERICAL INTEGRATION
# ==========================================

class RiemannRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    a: float
    b: float
    n: int = Field(default=10, ge=2, le=100)
    method: str = Field(default="midpoint") # left, right, midpoint, trapezoid


@app.post("/riemann-sum")
def calculate_riemann_sum(req: RiemannRequest):
    if req.a >= req.b:
        return {"error": "Lower limit a must be less than upper limit b."}
    if req.method not in {"left", "right", "midpoint", "trapezoid"}:
        return {"error": "Method must be left, right, midpoint, or trapezoid."}

    try:
        expr = parse_math_expression(req.expression)
        f_np = sp.lambdify(x, expr, "numpy")
        
        # Analytical integral for exact comparison
        exact_integral = None
        try:
            exact_sym = sp.integrate(expr, (x, req.a, req.b))
            exact_val = float(sp.N(exact_sym))
            if np.isfinite(exact_val):
                exact_integral = exact_val
        except Exception:
            pass

        n_steps = req.n
        dx = (req.b - req.a) / n_steps
        rectangles = []
        total_sum = 0.0

        for i in range(n_steps):
            x_left = req.a + i * dx
            x_right = x_left + dx

            if req.method == "left":
                x_eval = x_left
                height = float(f_np(x_eval))
                area = height * dx
            elif req.method == "right":
                x_eval = x_right
                height = float(f_np(x_eval))
                area = height * dx
            elif req.method == "midpoint":
                x_eval = (x_left + x_right) / 2.0
                height = float(f_np(x_eval))
                area = height * dx
            else: # trapezoid
                x_eval = (x_left + x_right) / 2.0
                h_left = float(f_np(x_left))
                h_right = float(f_np(x_right))
                height = (h_left + h_right) / 2.0
                area = height * dx

            if not np.isfinite(height):
                return {"error": f"Function produced non-finite value near x={round(x_eval, 4)}"}

            total_sum += area
            rectangles.append({
                "index": i,
                "x_left": round(x_left, 5),
                "x_right": round(x_right, 5),
                "x_eval": round(x_eval, 5),
                "height": round(height, 5),
                "area": round(area, 5)
            })

        error = abs(total_sum - exact_integral) if exact_integral is not None else None

        # Sample function curve for visualization
        plot_x = np.linspace(req.a, req.b, 161)
        plot_points = []
        for px in plot_x:
            try:
                py = float(f_np(px))
                if np.isfinite(py):
                    plot_points.append({"x": float(px), "y": py})
            except Exception:
                pass

        return {
            "success": True,
            "expression": str(expr),
            "a": req.a,
            "b": req.b,
            "n": n_steps,
            "method": req.method,
            "dx": round(dx, 5),
            "riemann_sum": round(total_sum, 6),
            "exact_integral": round(exact_integral, 6) if exact_integral is not None else None,
            "error": round(error, 6) if error is not None else None,
            "rectangles": rectangles,
            "plot_points": plot_points
        }
    except Exception as e:
        return {"error": f"Riemann sum error: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
