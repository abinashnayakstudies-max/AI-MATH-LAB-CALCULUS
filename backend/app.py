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


# ========================================================
# SIGNALS & SYSTEMS LAB MODELS & ENDPOINTS
# ========================================================

class SignalGenerateRequest(BaseModel):
    signal_type: str = Field("step", description="impulse, step, ramp, rect, sine, cosine, exponential, sinc")
    domain: str = Field("continuous", description="continuous or discrete")
    time_start: float = Field(-5.0, description="Start time/index")
    time_end: float = Field(5.0, description="End time/index")
    amplitude: float = Field(1.0, description="Signal amplitude A")
    frequency: float = Field(1.0, description="Frequency (rad/s for cont, rad/sample for disc)")
    phase: float = Field(0.0, description="Phase shift in radians")
    decay: float = Field(-0.5, description="Exponential decay/growth factor")
    pulse_width: float = Field(2.0, description="Width for rectangular pulse")
    time_shift: float = Field(0.0, description="Time shift t0 (positive = delay, negative = advance)")
    time_scaling: float = Field(1.0, description="Time scaling factor a in x(a*t)")
    time_reversal: bool = Field(False, description="Whether to reverse time x(-t)")
    amp_scale: float = Field(1.0, description="Amplitude scaling factor")


def eval_base_signal(t_val: float, signal_type: str, amp: float, freq: float, phase: float, decay: float, width: float, domain: str) -> float:
    st = signal_type.lower()
    if st == "impulse":
        if domain == "discrete":
            return amp if abs(round(t_val)) == 0 else 0.0
        else:
            return amp if abs(t_val) < 0.05 else 0.0
    elif st == "step":
        if t_val >= -1e-9:
            return amp
        return 0.0
    elif st == "ramp":
        return amp * t_val if t_val >= 0 else 0.0
    elif st == "rect":
        half_w = width / 2.0
        return amp if abs(t_val) <= half_w + 1e-9 else 0.0
    elif st == "sine":
        return amp * np.sin(freq * t_val + phase)
    elif st == "cosine":
        return amp * np.cos(freq * t_val + phase)
    elif st == "exponential":
        if t_val >= -1e-9:
            return amp * np.exp(decay * t_val)
        return 0.0
    elif st == "sinc":
        if abs(t_val) < 1e-9:
            return amp
        return amp * np.sin(np.pi * t_val) / (np.pi * t_val)
    return 0.0


@app.post("/signals/generate")
def generate_signal(req: SignalGenerateRequest):
    try:
        t_start = max(-50.0, min(req.time_start, req.time_end - 0.1))
        t_end = min(50.0, max(req.time_end, req.time_start + 0.1))
        is_discrete = req.domain.lower() == "discrete"

        if is_discrete:
            n_start = int(np.floor(t_start))
            n_end = int(np.ceil(t_end))
            t_axis = [float(n) for n in range(n_start, n_end + 1)]
        else:
            n_pts = 301
            t_axis = [float(val) for val in np.linspace(t_start, t_end, n_pts)]

        original_samples = []
        transformed_samples = []

        scale_a = req.time_scaling if req.time_scaling != 0 else 1.0
        if req.time_reversal:
            scale_a = -abs(scale_a)

        for t in t_axis:
            y_orig = float(eval_base_signal(t, req.signal_type, req.amplitude, req.frequency, req.phase, req.decay, req.pulse_width, req.domain))
            original_samples.append({"t": round(t, 4), "y": round(y_orig, 5)})

            t_eval = scale_a * (t - req.time_shift)
            y_trans = float(req.amp_scale * eval_base_signal(t_eval, req.signal_type, req.amplitude, req.frequency, req.phase, req.decay, req.pulse_width, req.domain))
            transformed_samples.append({"t": round(t, 4), "y": round(y_trans, 5)})

        var_sym = "n" if is_discrete else "t"
        st = req.signal_type.lower()
        if st == "impulse":
            base_tex = f"{req.amplitude}\\delta[{var_sym}]" if is_discrete else f"{req.amplitude}\\delta({var_sym})"
        elif st == "step":
            base_tex = f"{req.amplitude}u[{var_sym}]" if is_discrete else f"{req.amplitude}u({var_sym})"
        elif st == "ramp":
            base_tex = f"{req.amplitude}r({var_sym})"
        elif st == "rect":
            base_tex = f"{req.amplitude}\\text{{rect}}\\left(\\frac{{{var_sym}}}{{{req.pulse_width}}}\\right)"
        elif st == "sine":
            base_tex = f"{req.amplitude}\\sin({req.frequency}{var_sym} + {req.phase})"
        elif st == "cosine":
            base_tex = f"{req.amplitude}\\cos({req.frequency}{var_sym} + {req.phase})"
        elif st == "exponential":
            base_tex = f"{req.amplitude}e^{{{req.decay}{var_sym}}} u({var_sym})"
        else:
            base_tex = f"{req.amplitude}\\text{{sinc}}({var_sym})"

        shift_str = f" - {req.time_shift}" if req.time_shift > 0 else (f" + {abs(req.time_shift)}" if req.time_shift < 0 else "")
        rev_str = "-" if req.time_reversal else ""
        scale_str = f"{abs(req.time_scaling)}" if abs(req.time_scaling) != 1.0 else ""
        inner_trans = f"{rev_str}{scale_str}({var_sym}{shift_str})" if shift_str else f"{rev_str}{scale_str}{var_sym}"
        amp_prefix = f"{req.amp_scale} \\cdot " if req.amp_scale != 1.0 else ""
        trans_tex = f"{amp_prefix}x({inner_trans})" if not is_discrete else f"{amp_prefix}x[{inner_trans}]"

        y_vals = np.array([pt["y"] for pt in original_samples])
        trapz_func = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
        energy = float(np.sum(y_vals ** 2)) if is_discrete else float(trapz_func(y_vals ** 2, t_axis) if trapz_func else np.sum(y_vals**2)*(t_axis[1]-t_axis[0]))

        return {
            "success": True,
            "signal_type": req.signal_type,
            "domain": req.domain,
            "base_latex": base_tex,
            "transformed_latex": trans_tex,
            "energy": round(energy, 4),
            "original_samples": original_samples,
            "transformed_samples": transformed_samples
        }
    except Exception as e:
        return {"error": f"Signal generation error: {str(e)}"}


class ConvolutionRequest(BaseModel):
    preset_x: str = Field("rect", description="Signal x: rect, step, exponential, ramp, impulse")
    preset_h: str = Field("rect", description="Signal h: rect, step, exponential, ramp, impulse")
    domain: str = Field("discrete", description="discrete or continuous")
    current_shift: float = Field(0.0, description="Current shift parameter n or t")


@app.post("/signals/convolution")
def compute_convolution(req: ConvolutionRequest):
    try:
        is_discrete = req.domain.lower() == "discrete"

        if is_discrete:
            k_min, k_max = -8, 8
            k_axis = np.arange(k_min, k_max + 1)

            def sample_discrete(preset: str, k_arr: np.ndarray):
                if preset == "rect":
                    return np.where((k_arr >= 0) & (k_arr <= 3), 1.0, 0.0)
                elif preset == "step":
                    return np.where((k_arr >= 0) & (k_arr <= 5), 1.0, 0.0)
                elif preset == "exponential":
                    return np.where((k_arr >= 0) & (k_arr <= 5), (0.7) ** k_arr, 0.0)
                elif preset == "ramp":
                    return np.where((k_arr >= 0) & (k_arr <= 4), k_arr * 0.5, 0.0)
                elif preset == "impulse":
                    return np.where(k_arr == 0, 1.0, 0.0)
                return np.where((k_arr >= 0) & (k_arr <= 3), 1.0, 0.0)

            x_vals = sample_discrete(req.preset_x, k_axis)
            h_vals = sample_discrete(req.preset_h, k_axis)

            full_conv = np.convolve(x_vals, h_vals)
            n_out_min = 2 * k_min
            n_out_max = 2 * k_max
            n_out_axis = np.arange(n_out_min, n_out_max + 1)

            current_n = int(round(req.current_shift))
            h_folded_shifted = sample_discrete(req.preset_h, current_n - k_axis)
            product_k = x_vals * h_folded_shifted
            current_sum = float(np.sum(product_k))

            x_points = [{"k": int(k), "y": float(y)} for k, y in zip(k_axis, x_vals)]
            h_points = [{"k": int(k), "y": float(y)} for k, y in zip(k_axis, h_folded_shifted)]
            product_points = [{"k": int(k), "y": float(y)} for k, y in zip(k_axis, product_k)]

            y_points = []
            for n_val, y_val in zip(n_out_axis, full_conv):
                if -10 <= n_val <= 10:
                    y_points.append({"n": int(n_val), "y": round(float(y_val), 4)})

            return {
                "success": True,
                "domain": "discrete",
                "current_shift": current_n,
                "instant_value": round(current_sum, 4),
                "x_points": x_points,
                "h_folded_points": h_points,
                "product_points": product_points,
                "output_points": y_points,
                "formula_latex": "y[n] = \\sum_{k=-\\infty}^{\\infty} x[k] h[n - k]"
            }
        else:
            tau_axis = np.linspace(-6.0, 6.0, 241)
            d_tau = tau_axis[1] - tau_axis[0]

            def sample_continuous(preset: str, t_arr: np.ndarray):
                if preset == "rect":
                    return np.where((t_arr >= -1.0) & (t_arr <= 1.0), 1.0, 0.0)
                elif preset == "step":
                    return np.where((t_arr >= 0.0) & (t_arr <= 3.0), 1.0, 0.0)
                elif preset == "exponential":
                    return np.where((t_arr >= 0.0) & (t_arr <= 4.0), np.exp(-t_arr), 0.0)
                elif preset == "ramp":
                    return np.where((t_arr >= 0.0) & (t_arr <= 2.0), t_arr, 0.0)
                elif preset == "impulse":
                    return np.where(np.abs(t_arr) <= 0.08, 1.0, 0.0)
                return np.where((t_arr >= -1.0) & (t_arr <= 1.0), 1.0, 0.0)

            x_vals = sample_continuous(req.preset_x, tau_axis)
            t_curr = float(req.current_shift)
            h_folded = sample_continuous(req.preset_h, t_curr - tau_axis)
            product = x_vals * h_folded
            instant_integral = float(np.sum(product) * d_tau)

            t_sweep = np.linspace(-5.0, 5.0, 101)
            output_curve = []
            for t_val in t_sweep:
                h_shift = sample_continuous(req.preset_h, t_val - tau_axis)
                val = float(np.sum(x_vals * h_shift) * d_tau)
                output_curve.append({"t": round(float(t_val), 3), "y": round(val, 4)})

            return {
                "success": True,
                "domain": "continuous",
                "current_shift": round(t_curr, 3),
                "instant_value": round(instant_integral, 4),
                "x_points": [{"t": round(float(t), 3), "y": round(float(y), 4)} for t, y in zip(tau_axis, x_vals)],
                "h_folded_points": [{"t": round(float(t), 3), "y": round(float(y), 4)} for t, y in zip(tau_axis, h_folded)],
                "product_points": [{"t": round(float(t), 3), "y": round(float(y), 4)} for t, y in zip(tau_axis, product)],
                "output_points": output_curve,
                "formula_latex": "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) d\\tau"
            }
    except Exception as e:
        return {"error": f"Convolution error: {str(e)}"}


# ========================================================
# PRACTICE MODE & STEP-BY-STEP SOLVER ENDPOINTS
# ========================================================

PRACTICE_PROBLEMS = [
    {
        "id": "calc_deriv_1",
        "category": "calculus",
        "topic": "Derivatives & Chain Rule",
        "difficulty": "Fundamentals",
        "question": "Find the first derivative $\\frac{d}{dx} \\left[ (3x^2 - 4)^5 \\right]$.",
        "options": [
            "30x(3x^2 - 4)^4",
            "5(3x^2 - 4)^4",
            "15x(3x^2 - 4)^4",
            "30x^2(3x^2 - 4)^4"
        ],
        "correct_index": 0,
        "hint": "Use the Chain Rule: if $y = u^5$ and $u = 3x^2 - 4$, then $\\frac{dy}{dx} = 5u^4 \\cdot \\frac{du}{dx}$.",
        "steps": [
            {"title": "Identify Inner & Outer Functions", "content": "Let outer function $g(u) = u^5$ and inner function $u(x) = 3x^2 - 4$."},
            {"title": "Differentiate Outer Function", "content": "$\\frac{d}{du}[u^5] = 5u^4 = 5(3x^2 - 4)^4$."},
            {"title": "Differentiate Inner Function", "content": "$\\frac{d}{dx}[3x^2 - 4] = 6x$."},
            {"title": "Multiply via Chain Rule", "content": "$\\frac{dy}{dx} = 5(3x^2 - 4)^4 \\cdot (6x) = 30x(3x^2 - 4)^4$."}
        ]
    },
    {
        "id": "calc_mvt_1",
        "category": "calculus",
        "topic": "Mean Value Theorem",
        "difficulty": "Standard",
        "question": "For $f(x) = x^3 - x$ on $[0, 2]$, find the value of $c \\in (0, 2)$ guaranteed by the Mean Value Theorem.",
        "options": [
            "\\frac{2}{\\sqrt{3}}",
            "\\frac{1}{\\sqrt{3}}",
            "\\sqrt{2}",
            "1.0"
        ],
        "correct_index": 0,
        "hint": "Calculate the secant slope $m = \\frac{f(2) - f(0)}{2 - 0}$, then solve $f'(c) = m$.",
        "steps": [
            {"title": "Compute Secant Slope", "content": "$f(0) = 0$, $f(2) = 2^3 - 2 = 6$. Secant slope $m = \\frac{6 - 0}{2 - 0} = 3$."},
            {"title": "Find Derivative f'(x)", "content": "$f'(x) = 3x^2 - 1$."},
            {"title": "Equate f'(c) = m", "content": "$3c^2 - 1 = 3 \\implies 3c^2 = 4 \\implies c^2 = \\frac{4}{3}$."},
            {"title": "Select Root in (0, 2)", "content": "$c = \\frac{2}{\\sqrt{3}} = \\frac{2\\sqrt{3}}{3} \\approx 1.155 \\in (0, 2)$."}
        ]
    },
    {
        "id": "calc_integral_1",
        "category": "calculus",
        "topic": "Definite Integration",
        "difficulty": "Standard",
        "question": "Evaluate the definite integral $\\int_0^1 x e^{x^2} dx$.",
        "options": [
            "\\frac{e - 1}{2}",
            "e - 1",
            "\\frac{e}{2}",
            "\\frac{e + 1}{2}"
        ],
        "correct_index": 0,
        "hint": "Use u-substitution with $u = x^2$, so $du = 2x\\,dx$.",
        "steps": [
            {"title": "Substitution", "content": "Let $u = x^2 \\implies du = 2x\\,dx \\implies x\\,dx = \\frac{du}{2}$."},
            {"title": "Change Limits", "content": "When $x = 0 \\implies u = 0$. When $x = 1 \\implies u = 1$."},
            {"title": "Integrate in u", "content": "$\\int_0^1 \\frac{1}{2} e^u du = \\left[ \\frac{1}{2} e^u \\right]_0^1 = \\frac{e^1 - e^0}{2} = \\frac{e - 1}{2}$."}
        ]
    },
    {
        "id": "sig_trans_1",
        "category": "signals",
        "topic": "Signal Transformations",
        "difficulty": "Fundamentals",
        "question": "Given signal $x(t)$, which operation correctly represents $y(t) = x(2t + 4)$ using the standard order of operations?",
        "options": [
            "Shift left by 4, then compress in time by a factor of 2",
            "Shift right by 4, then expand in time by a factor of 2",
            "Compress by 2, then shift left by 4",
            "Shift right by 2, then compress by 2"
        ],
        "correct_index": 0,
        "hint": "Express as $x(2(t + 2))$ or follow: 1) shift first $t \\to t + 4$, then scale $t \\to 2t$.",
        "steps": [
            {"title": "Approach 1: Shift then Scale", "content": "Start with $x(t)$. First shift left by 4 units: $x(t) \\to x(t + 4)$. Then replace $t$ with $2t$: $x(2t + 4)$ (time compression by 2)."},
            {"title": "Approach 2: Factor Form x(a(t - t0))", "content": "Rewrite $x(2t + 4) = x(2(t + 2))$. Here $t_0 = -2$, meaning compress by 2 and advance (shift left) by 2."},
            {"title": "Conclusion", "content": "Both methods confirm: shift left by 4 then compress by 2, or compress by 2 then shift left by 2."}
        ]
    },
    {
        "id": "sig_conv_1",
        "category": "signals",
        "topic": "Discrete Convolution",
        "difficulty": "Standard",
        "question": "Compute the linear convolution of $x[n] = \\{1, 2\\}$ and $h[n] = \\{1, 1\\}$, both starting at $n=0$. What is $y[1]$?",
        "options": [
            "3",
            "2",
            "1",
            "4"
        ],
        "correct_index": 0,
        "hint": "$y[1] = x[0]h[1] + x[1]h[0]$.",
        "steps": [
            {"title": "Convolution Sum Formula", "content": "$y[n] = \\sum_k x[k] h[n - k]$."},
            {"title": "Evaluate at n = 0", "content": "$y[0] = x[0]h[0] = 1 \\cdot 1 = 1$."},
            {"title": "Evaluate at n = 1", "content": "$y[1] = x[0]h[1] + x[1]h[0] = (1)(1) + (2)(1) = 1 + 2 = 3$."},
            {"title": "Full Sequence", "content": "$y[n] = \\{1, 3, 2\\}$ starting at $n = 0$."}
        ]
    },
    {
        "id": "sig_lti_1",
        "category": "signals",
        "topic": "BIBO Stability",
        "difficulty": "Challenge",
        "question": "A discrete LTI system has impulse response $h[n] = (0.8)^n u[n]$. Is this system BIBO stable?",
        "options": [
            "Yes, because \\sum_{n=-\\infty}^\\infty |h[n]| = \\frac{1}{1 - 0.8} = 5 < \\infty",
            "No, because the response extends to infinity",
            "Yes, because h[0] is finite",
            "No, because |h[n]| does not reach zero"
        ],
        "correct_index": 0,
        "hint": "A discrete LTI system is BIBO stable if and only if its impulse response is absolutely summable: $\\sum_{n=-\\infty}^\\infty |h[n]| < \\infty$.",
        "steps": [
            {"title": "BIBO Stability Criterion", "content": "For discrete-time LTI systems, stability requires $\\sum_{n=-\\infty}^\\infty |h[n]| < \\infty$."},
            {"title": "Sum the Absolute Impulse Response", "content": "$\\sum_{n=0}^\\infty |0.8|^n = \\sum_{n=0}^\\infty 0.8^n$."},
            {"title": "Infinite Geometric Series", "content": "Since $|r| = 0.8 < 1$, the sum converges to $\\frac{a}{1 - r} = \\frac{1}{1 - 0.8} = \\frac{1}{0.2} = 5 < \\infty$."},
            {"title": "Conclusion", "content": "The absolute sum is finite ($5 < \\infty$), so the system is strictly BIBO stable."}
        ]
    }
]


@app.get("/practice/problems")
def get_practice_problems(category: str | None = None):
    if category:
        filtered = [p for p in PRACTICE_PROBLEMS if p["category"].lower() == category.lower()]
        return {"problems": filtered}
    return {"problems": PRACTICE_PROBLEMS}


class VerifyAnswerRequest(BaseModel):
    problem_id: str
    selected_index: int


@app.post("/practice/verify")
def verify_practice_answer(req: VerifyAnswerRequest):
    prob = next((p for p in PRACTICE_PROBLEMS if p["id"] == req.problem_id), None)
    if not prob:
        return {"error": "Problem not found."}

    is_correct = (req.selected_index == prob["correct_index"])
    return {
        "success": True,
        "is_correct": is_correct,
        "correct_index": prob["correct_index"],
        "hint": prob["hint"],
        "steps": prob["steps"]
    }



# ========================================================
# LTI SYSTEM ANALYZER & FOURIER ANALYSIS LAB ENDPOINTS
# ========================================================

LTI_SYSTEM_CATALOG = {
    "delay": {
        "id": "delay",
        "name": "Ideal Delay / Shift Operator",
        "equation_latex": "y[n] = x[n - 2] \\quad \\text{or} \\quad y(t) = x(t - 1)",
        "linear": True,
        "time_invariant": True,
        "causal": True,
        "stable": True,
        "memory": "Dynamic (Memory Required)",
        "impulse_response": "h[n] = \\delta[n - 2]",
        "step_response": "s[n] = u[n - 2]",
        "linearity_proof": "T\\{a x_1 + b x_2\\} = a x_1[n - 2] + b x_2[n - 2] = a y_1[n] + b y_2[n]. Homogeneity and additivity hold strictly.",
        "time_invariance_proof": "Delay input by k: x_k[n] = x[n - k] \\implies T\\{x_k[n]\\} = x[n - k - 2] = y[n - k]. Identical to delayed output.",
        "causality_proof": "Output at time index n depends exclusively on past input at n - 2. No future samples are referenced.",
        "stability_proof": "\\sum_{n=-\\infty}^\\infty |h[n]| = |\\delta[0]| = 1 < \\infty. The impulse response is absolutely summable, hence strictly BIBO stable."
    },
    "accumulator": {
        "id": "accumulator",
        "name": "Accumulator / Discrete Integrator",
        "equation_latex": "y[n] = \\sum_{k=-\\infty}^n x[k] \\quad \\text{or} \\quad y(t) = \\int_{-\\infty}^t x(\\tau) d\\tau",
        "linear": True,
        "time_invariant": True,
        "causal": True,
        "stable": False,
        "memory": "Dynamic (Infinite Memory)",
        "impulse_response": "h[n] = u[n]",
        "step_response": "s[n] = (n + 1)u[n]",
        "linearity_proof": "The summation operator is linear: \\sum (a x_1 + b x_2) = a \\sum x_1 + b \\sum x_2. Superposition holds.",
        "time_invariance_proof": "Shifting input x by k yields \\sum_{m=-\\infty}^n x[m - k] = \\sum_{r=-\\infty}^{n - k} x[r] = y[n - k]. Time-invariant.",
        "causality_proof": "Summation upper bound is the present sample index n (k \\le n). Output never relies on future indices k > n.",
        "stability_proof": "\\sum_{n=-\\infty}^\\infty |h[n]| = \\sum_{n=0}^\\infty 1 = \\infty. Impulse response is NOT summable. A bounded unit step x[n] = u[n] produces an unbounded ramp y[n] = (n + 1) \\to \\infty. System is BIBO UNSTABLE."
    },
    "moving_average": {
        "id": "moving_average",
        "name": "3-Point Moving Average Filter",
        "equation_latex": "y[n] = \\frac{1}{3} \\big(x[n] + x[n - 1] + x[n - 2]\\big)",
        "linear": True,
        "time_invariant": True,
        "causal": True,
        "stable": True,
        "memory": "Dynamic (Finite Memory / FIR)",
        "impulse_response": "h[n] = \\frac{1}{3} \\big(\\delta[n] + \\delta[n - 1] + \\delta[n - 2]\\big)",
        "step_response": "s[n] = \\{0, \\frac{1}{3}, \\frac{2}{3}, 1, 1, \\dots\\}",
        "linearity_proof": "Linear weighted sum of input samples: T\\{a x_1 + b x_2\\} = a y_1[n] + b y_2[n]. Superposition holds.",
        "time_invariance_proof": "All filter coefficients are constant scalars. Shifting input by n_0 shifts all components identically.",
        "causality_proof": "Output at n depends only on current sample x[n] and past samples x[n-1], x[n-2].",
        "stability_proof": "\\sum_{n} |h[n]| = \\frac{1}{3} + \\frac{1}{3} + \\frac{1}{3} = 1 < \\infty. Absolutely summable, guaranteed BIBO stable."
    },
    "squarer": {
        "id": "squarer",
        "name": "Squarer (Non-Linear)",
        "equation_latex": "y[n] = (x[n])^2 \\quad \\text{or} \\quad y(t) = [x(t)]^2",
        "linear": False,
        "time_invariant": True,
        "causal": True,
        "stable": True,
        "memory": "Memoryless (Static)",
        "impulse_response": "Undefined (Concept only applies to Linear systems)",
        "step_response": "s[n] = u[n]",
        "linearity_proof": "Let x_2[n] = 2 x_1[n]. Then T\\{x_2\\} = (2 x_1)^2 = 4 x_1^2 \\neq 2 y_1[n]. Homogeneity fails. System is NON-LINEAR.",
        "time_invariance_proof": "T\\{x[n - k]\\} = (x[n - k])^2 = y[n - k]. Shift in input produces identical shift in output.",
        "causality_proof": "Output at time n depends strictly on input at the exact same instant n. Memoryless and strictly causal.",
        "stability_proof": "If |x[n]| \\le B_x < \\infty, then |y[n]| = |x[n]|^2 \\le B_x^2 < \\infty. Every bounded input produces a bounded output."
    },
    "time_compressor": {
        "id": "time_compressor",
        "name": "Time Compressor / Downsampler (Time-Varying & Non-Causal)",
        "equation_latex": "y[n] = x[2n] \\quad \\text{or} \\quad y(t) = x(2t)",
        "linear": True,
        "time_invariant": False,
        "causal": False,
        "stable": True,
        "memory": "Dynamic",
        "impulse_response": "Time-varying kernel h[n, k]",
        "step_response": "s[n] = u[2n] = u[n]",
        "linearity_proof": "T\\{a x_1 + b x_2\\} = a x_1[2n] + b x_2[2n] = a y_1[n] + b y_2[n]. Superposition holds.",
        "time_invariance_proof": "Let x_k[n] = x[n - 1]. Then T\\{x_k\\} = x[2n - 1]. But y[n - 1] = x[2(n - 1)] = x[2n - 2]. Since x[2n - 1] \\neq x[2n - 2], TIME-INVARIANCE FAILS.",
        "causality_proof": "For positive index n = 2, output is y[2] = x[4], which requires future input sample 4. System is NON-CAUSAL.",
        "stability_proof": "If |x[n]| \\le B < \\infty, then |y[n]| = |x[2n]| \\le B < \\infty. Bounded input produces bounded output."
    }
}


class LTIAnalyzeRequest(BaseModel):
    system_id: str = "delay"
    domain: str = "discrete"


@app.post("/signals/lti")
def analyze_lti_system(req: LTIAnalyzeRequest):
    sys_info = LTI_SYSTEM_CATALOG.get(req.system_id, LTI_SYSTEM_CATALOG["delay"])
    return {
        "success": True,
        "domain": req.domain,
        "system": sys_info
    }


class FourierSeriesRequest(BaseModel):
    waveform: str = "square"
    harmonics: int = Field(5, ge=1, le=30)
    fundamental_freq: float = Field(1.0, ge=0.1, le=10.0)
    amplitude: float = Field(1.0, ge=0.1, le=10.0)


@app.post("/signals/fourier")
def calculate_fourier_series(req: FourierSeriesRequest):
    try:
        f0 = req.fundamental_freq
        amp = req.amplitude
        omega0 = 2 * np.pi * f0
        period = 1.0 / f0
        t_vals = np.linspace(-period, period, 321)

        coeffs = []
        reconstructed = np.zeros_like(t_vals)
        exact = np.zeros_like(t_vals)

        if req.waveform == "square":
            mod_t = (t_vals + period / 2) % period - period / 2
            exact = np.where(mod_t >= 0, amp, -amp)
            formula_latex = "x(t) = \\frac{4A}{\\pi} \\sum_{k=1,3,5,\\dots}^{2N-1} \\frac{\\sin(k \\omega_0 t)}{k}"
            gibbs_note = "Gibbs Phenomenon: ~8.95% overshoot persists at jump discontinuities regardless of harmonic order N."

            for idx, n in enumerate(range(1, 2 * req.harmonics, 2)):
                b_n = (4 * amp) / (np.pi * n)
                coeffs.append({
                    "harmonic": n,
                    "magnitude": round(float(b_n), 4),
                    "phase": 0.0,
                    "term": f"\\frac{{4A}}{{{n}\\pi}} \\sin({n}\\omega_0 t)"
                })
                reconstructed += b_n * np.sin(n * omega0 * t_vals)

        elif req.waveform == "triangle":
            mod_t = (t_vals + period / 2) % period - period / 2
            exact = amp * (1 - 4 * np.abs(mod_t) / period)
            formula_latex = "x(t) = \\frac{8A}{\\pi^2} \\sum_{k=1,3,5,\\dots}^{2N-1} \\frac{(-1)^{(k-1)/2}}{k^2} \\sin(k \\omega_0 t)"
            gibbs_note = "Continuous everywhere: Rapid 1/k² harmonic decay; no Gibbs overshoot occurs."

            for idx, k in enumerate(range(1, 2 * req.harmonics, 2)):
                sign = (-1) ** ((k - 1) // 2)
                b_k = (8 * amp * sign) / ((np.pi ** 2) * (k ** 2))
                coeffs.append({
                    "harmonic": k,
                    "magnitude": round(float(abs(b_k)), 4),
                    "phase": 0.0 if sign > 0 else round(np.pi, 3),
                    "term": f"\\frac{{8A}}{{{k}^2\\pi^2}} \\sin({k}\\omega_0 t)"
                })
                reconstructed += b_k * np.sin(k * omega0 * t_vals)

        elif req.waveform == "sawtooth":
            mod_t = (t_vals + period / 2) % period - period / 2
            exact = 2 * amp * (mod_t / period)
            formula_latex = "x(t) = \\frac{2A}{\\pi} \\sum_{n=1}^N \\frac{(-1)^{n+1}}{n} \\sin(n \\omega_0 t)"
            gibbs_note = "Contains step discontinuities: Demonstrates 1/n harmonic decay and persistent Gibbs ripples at period boundaries."

            for n in range(1, req.harmonics + 1):
                b_n = (2 * amp * ((-1) ** (n + 1))) / (np.pi * n)
                coeffs.append({
                    "harmonic": n,
                    "magnitude": round(float(abs(b_n)), 4),
                    "phase": 0.0 if b_n >= 0 else round(np.pi, 3),
                    "term": f"\\frac{{2A}}{{{n}\\pi}} \\sin({n}\\omega_0 t)"
                })
                reconstructed += b_n * np.sin(n * omega0 * t_vals)
        else:
            return {"error": "Unsupported waveform. Choose square, triangle, or sawtooth."}

        mse = float(np.mean((exact - reconstructed) ** 2))

        return {
            "success": True,
            "waveform": req.waveform,
            "harmonics_count": len(coeffs),
            "fundamental_freq": req.fundamental_freq,
            "amplitude": req.amplitude,
            "formula_latex": formula_latex,
            "gibbs_note": gibbs_note,
            "mse_error": round(mse, 5),
            "coefficients": coeffs,
            "plot_points": [
                {"t": round(float(t), 4), "exact": round(float(ex), 4), "reconstructed": round(float(rec), 4)}
                for t, ex, rec in zip(t_vals, exact, reconstructed)
            ]
        }
    except Exception as e:
        return {"error": f"Fourier analysis error: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
