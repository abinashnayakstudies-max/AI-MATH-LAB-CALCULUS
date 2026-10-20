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

x = sp.Symbol("x")

app = FastAPI(title="AI Math Lab API", version="1.0.0")
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
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()
    MODEL_AVAILABLE = True

class MVTRequest(BaseModel):
    expression: str = Field(..., min_length=1)
    a: float
    b: float



class CalculusRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    operation: str
    a: float | None = None
    b: float | None = None
    order: int = Field(default=1, ge=1, le=5)


def parse_math_expression(expression: str):
    """Parse a restricted arithmetic expression without eval/sympify input execution."""
    expression = expression.replace("^", "**").strip()
    if not expression or len(expression) > 200:
        raise ValueError("Expression must contain 1–200 characters.")
    tree = ast.parse(expression, mode="eval")
    allowed_functions = {
        "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
        "asin": sp.asin, "acos": sp.acos, "atan": sp.atan,
        "exp": sp.exp, "log": sp.log, "sqrt": sp.sqrt,
        "abs": sp.Abs, "sinh": sp.sinh, "cosh": sp.cosh,
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
            raise ValueError(f"Unsupported symbol: {node.id}")
        if isinstance(node, ast.BinOp) and type(node.op) in binary_ops:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow) and right.is_number and abs(float(right)) > 100:
                raise ValueError("Exponent magnitude must not exceed 100.")
            return binary_ops[type(node.op)](left, right)
        if isinstance(node, ast.UnaryOp) and type(node.op) in unary_ops:
            return unary_ops[type(node.op)](visit(node.operand))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in allowed_functions and len(node.args) == 1 and not node.keywords:
            return allowed_functions[node.func.id](visit(node.args[0]))
        raise ValueError("Use x, numeric constants, + − * / **, parentheses, and supported functions such as sin, cos, exp, log, sqrt.")

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
        return float(df(z) - secant_slope)

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
        raise ValueError("Function produced invalid values.")
    if not np.all(np.isfinite(df_values)):
        raise ValueError("Derivative produced invalid values.")

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
        raise RuntimeError("mvt_model_v4.pt was not found.")
    features = create_v4_features(expr, derivative, a, b)
    tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
    with torch.no_grad():
        relative_c = model(tensor).item()
    c_ml = a + relative_c * (b - a)
    return c_ml, relative_c

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
        value = float(f(req.x))
        if not np.isfinite(value):
            return {"error": "Function is not finite at this x value."}
        return {"expression": str(expr), "x": req.x, "value": value}
    except Exception as e:
        return {"error": f"Could not evaluate function: {str(e) or 'invalid expression'}"}


@app.post("/mvt")
def calculate_mvt(req: MVTRequest):
    if req.a >= req.b:
        return {"error": "a must be smaller than b."}

    try:
        expr = parse_math_expression(req.expression)
        derivative = sp.diff(expr, x)

        points, secant_slope, f, df = find_mvt_points(expr, derivative, req.a, req.b)
        if len(points) == 0:
            return {"error": "No MVT point was found numerically."}

        midpoint = (req.a + req.b) / 2
        canonical_c = min(points, key=lambda c: abs(c - midpoint))
        numerical_residual = abs(float(df(canonical_c) - secant_slope))

        # Curve samples for the frontend's 3D visualization.
        plot_x = np.linspace(req.a, req.b, 121)
        plot_y = np.asarray(f(plot_x), dtype=float)
        plot_points = [
            {"x": float(px), "y": float(py)}
            for px, py in zip(plot_x, plot_y)
            if np.isfinite(py)
        ]

        ml_available = False
        ml_c = ml_relative_c = ml_residual = None
        if MODEL_AVAILABLE:
            try:
                ml_c, ml_relative_c = predict_ml_c(expr, derivative, req.a, req.b)
                ml_residual = abs(float(df(ml_c) - secant_slope))
                ml_available = True
            except Exception as e:
                print("ML prediction error:", e)

        hybrid_c = hybrid_residual = None
        if ml_available:
            if ml_residual <= 1e-3:
                hybrid_c, hybrid_residual = ml_c, ml_residual
            else:
                hybrid_c = min(points, key=lambda c: abs(c - ml_c))
                hybrid_residual = abs(float(df(hybrid_c) - secant_slope))

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
        return {"error": f"Could not process expression: {e}"}


@app.post("/calculus")
def calculate_calculus(req: CalculusRequest):
    if req.operation not in {"differentiate", "integrate", "definite_integral"}:
        return {"error": "Unsupported operation. Choose differentiate, integrate, or definite_integral."}
    try:
        expr = parse_math_expression(req.expression)
        if req.operation == "differentiate":
            result = sp.diff(expr, x, req.order)
            operation_name = "Derivative"
        elif req.operation == "integrate":
            result = sp.integrate(expr, x)
            operation_name = "Indefinite Integral"
        else:
            if req.a is None or req.b is None:
                return {"error": "Both lower and upper limits are required for a definite integral."}
            if req.a > req.b:
                return {"error": "The lower limit must not exceed the upper limit."}
            result = sp.integrate(expr, (x, req.a, req.b))
            operation_name = "Definite Integral"

        # Sample the original function and its derivative for the calculus plot.
        derivative = sp.diff(expr, x)
        f = sp.lambdify(x, expr, "numpy")
        df = sp.lambdify(x, derivative, "numpy")
        left = req.a if req.a is not None else -5.0
        right = req.b if req.b is not None else 5.0
        if not np.isfinite(left) or not np.isfinite(right) or left >= right:
            left, right = -5.0, 5.0
        left, right = max(left, -100.0), min(right, 100.0)
        xs = np.linspace(left, right, 121)
        original_points, derivative_points = [], []
        for xv in xs:
            try:
                yv, dyv = float(f(xv)), float(df(xv))
                if np.isfinite(yv): original_points.append({"x": float(xv), "y": yv})
                if np.isfinite(dyv): derivative_points.append({"x": float(xv), "y": dyv})
            except Exception:
                continue
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
        }
    except Exception as e:
        return {"error": f"Could not process expression: {str(e) or 'invalid expression'}"}
# ==========================================
# LIMITS & CONTINUITY — AI MATH LAB
# ==========================================

class LimitRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=200)
    point: str = Field(default="0", max_length=30)
    operation: str = "limit"
    direction: str = "both"


def parse_limit_point(point: str):
    """Safely parse a finite number or positive/negative infinity."""
    point = point.strip().lower()

    if point in {"oo", "+oo", "inf", "+inf", "infinity", "+infinity"}:
        return sp.oo

    if point in {"-oo", "-inf", "-infinity"}:
        return -sp.oo

    value = float(point)

    if not np.isfinite(value) or abs(value) > 1_000_000:
        raise ValueError("Enter a finite point within ±1,000,000 or use oo/-oo.")

    return sp.Float(value)


@app.post("/limits")
def calculate_limits(req: LimitRequest):
    try:
        expr = parse_math_expression(req.expression)
        point = parse_limit_point(req.point)

        if req.operation not in {"limit", "continuity"}:
            return {
                "error": "Unsupported operation. Choose limit or continuity."
            }

        if req.direction not in {"both", "left", "right"}:
            return {
                "error": "Direction must be both, left, or right."
            }

        if req.operation == "continuity" and point in {sp.oo, -sp.oo}:
            return {
                "error": "Continuity must be checked at a finite point."
            }

        # Calculate the left-hand, right-hand and two-sided limits.
        if point in {sp.oo, -sp.oo}:
            limit_value = sp.limit(expr, x, point)

            return {
                "success": True,
                "operation": "Limit at infinity",
                "expression": str(expr),
                "point": str(point),
                "result": str(limit_value),
                "latex": sp.latex(limit_value),
                "direction": "both"
            }

        left_limit = sp.limit(expr, x, point, dir="-")
        right_limit = sp.limit(expr, x, point, dir="+")

        function_value = sp.simplify(expr.subs(x, point))

        if req.operation == "limit":
            if req.direction == "left":
                result = left_limit
            elif req.direction == "right":
                result = right_limit
            else:
                if sp.simplify(left_limit - right_limit) == 0:
                    result = left_limit
                else:
                    result = sp.Limit(expr, x, point)

            return {
                "success": True,
                "operation": "Limit",
                "expression": str(expr),
                "point": str(point),
                "direction": req.direction,
                "left_limit": str(left_limit),
                "right_limit": str(right_limit),
                "result": str(result),
                "latex": sp.latex(result)
            }

        # Continuity requires both one-sided limits and f(point)
        # to exist and have the same finite value.
        continuous = (
            left_limit.is_finite is True
            and right_limit.is_finite is True
            and function_value.is_finite is True
            and sp.simplify(left_limit - right_limit) == 0
            and sp.simplify(left_limit - function_value) == 0
        )

        return {
            "success": True,
            "operation": "Continuity Check",
            "expression": str(expr),
            "point": str(point),
            "left_limit": str(left_limit),
            "right_limit": str(right_limit),
            "function_value": str(function_value),
            "continuous": bool(continuous),
            "result": (
                f"Continuous at x = {point}"
                if continuous
                else f"Not continuous at x = {point}"
            )
        }

    except Exception as e:
        return {
            "error": f"Could not calculate the limit: "
                     f"{str(e) or 'invalid input'}"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
