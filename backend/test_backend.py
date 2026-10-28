from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "online"
    print("[PASS] Root endpoint:", data["service"])

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    print("[PASS] Health endpoint OK")

def test_implicit_multiplication_and_mvt():
    r = client.post("/mvt", json={"expression": "x^2", "a": -2.0, "b": 3.0})
    assert r.status_code == 200
    data = r.json()
    assert "canonical_c" in data
    print(f"[PASS] MVT: canonical_c={data['canonical_c']}, residual={data['numerical_residual']}")

    r2 = client.post("/mvt", json={"expression": "2x^2 - 4x + 1", "a": 0.0, "b": 4.0})
    assert r2.status_code == 200
    data2 = r2.json()
    assert "canonical_c" in data2
    print(f"[PASS] MVT with implicit multiplication '2x^2 - 4x + 1': c={data2['canonical_c']}")

def test_calculus():
    r = client.post("/calculus", json={"expression": "3x^3 - 2x", "operation": "differentiate", "order": 1})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    print(f"[PASS] Calculus differentiation '3x^3 - 2x': result={data['result']}")

    r2 = client.post("/calculus", json={"expression": "sin(2x)", "operation": "integrate", "order": 1})
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["success"] is True
    print(f"[PASS] Calculus integration 'sin(2x)': result={data2['result']}")

    r3 = client.post("/calculus", json={"expression": "x^2", "operation": "definite_integral", "a": 0.0, "b": 3.0})
    assert r3.status_code == 200
    data3 = r3.json()
    assert data3["success"] is True
    print(f"[PASS] Calculus definite integral 'x^2' on [0, 3]: result={data3['result']}")

def test_limits():
    r = client.post("/limits", json={"expression": "sin(x)/x", "point": "0", "operation": "limit", "direction": "both"})
    assert r.status_code == 200
    data = r.json()
    assert data["result"] == "1"
    print(f"[PASS] Limit sin(x)/x as x->0: {data['result']}")

def test_critical_points():
    r = client.post("/critical-points", json={"expression": "x^3 - 3x", "a": -2.0, "b": 2.0})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    print(f"[PASS] Critical points 'x^3 - 3x': found {data['number_of_critical_points']} points, max={data['global_maximum']}, min={data['global_minimum']}")

def test_taylor():
    r = client.post("/taylor", json={"expression": "sin(x)", "point": 0.0, "order": 5})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    print(f"[PASS] Taylor series sin(x) at 0 (order 5): {data['polynomial']}")
    assert len(data["terms"]) > 0

def test_riemann_sum():
    r = client.post("/riemann-sum", json={"expression": "x^2", "a": 0.0, "b": 3.0, "n": 6, "method": "midpoint"})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    print(f"[PASS] Riemann sum midpoint n=6: sum={data['riemann_sum']}, exact={data['exact_integral']}, error={data['error']}")
    assert len(data["rectangles"]) == 6

if __name__ == "__main__":
    test_root()
    test_health()
    test_implicit_multiplication_and_mvt()
    test_calculus()
    test_limits()
    test_critical_points()
    test_taylor()
    test_riemann_sum()
    print("\nALL BACKEND UNIT TESTS PASSED WITH 100% SUCCESS!")
