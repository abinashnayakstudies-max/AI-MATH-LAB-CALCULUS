import sys, os
sys.path.insert(0, r"C:\Users\abina\.gemini\antigravity\scratch\AI-MATH-LAB-CALCULUS\backend")
from app import (
    app,
    calculate_mvt, MVTRequest,
    calculate_calculus, CalculusRequest,
    calculate_limits, LimitRequest,
    calculate_critical_points, CriticalPointsRequest,
    calculate_taylor, TaylorRequest,
    calculate_riemann_sum, RiemannRequest,
    generate_signal, SignalGenerateRequest,
    compute_convolution, ConvolutionRequest,
    analyze_lti_system, LTIAnalyzeRequest,
    calculate_fourier_series, FourierSeriesRequest,
    get_practice_problems,
    verify_practice_answer, VerifyAnswerRequest
)

print("Starting direct functional unit tests...")

# 1. MVT
r1 = calculate_mvt(MVTRequest(expression="x^2", a=-2.0, b=3.0))
assert "canonical_c" in r1
print("[PASS] 1. MVT:", r1["canonical_c"])

# 2. Calculus
r2 = calculate_calculus(CalculusRequest(expression="3x^3 - 2x", operation="differentiate", order=1))
assert r2["success"] is True
print("[PASS] 2. Calculus:", r2["result"])

# 3. Limits
r3 = calculate_limits(LimitRequest(expression="sin(x)/x", point="0", operation="limit", direction="both"))
assert r3["result"] == "1"
print("[PASS] 3. Limits:", r3["result"])

# 4. Critical Points
r4 = calculate_critical_points(CriticalPointsRequest(expression="x^3 - 3x", a=-2.0, b=2.0))
assert r4["success"] is True
print("[PASS] 4. Critical Points count:", r4["number_of_critical_points"])

# 5. Taylor
r5 = calculate_taylor(TaylorRequest(expression="sin(x)", point=0.0, order=5))
assert r5["success"] is True
print("[PASS] 5. Taylor terms:", len(r5["terms"]))

# 6. Riemann
r6 = calculate_riemann_sum(RiemannRequest(expression="x^2", a=0.0, b=3.0, n=6, method="midpoint"))
assert r6["success"] is True
print("[PASS] 6. Riemann sum:", r6["riemann_sum"])

# 7. Signal Explorer
r7 = generate_signal(SignalGenerateRequest(signal_type="step", domain="continuous"))
assert r7["success"] is True
print("[PASS] 7. Signal generate:", r7["base_latex"])

# 8. Convolution
r8 = compute_convolution(ConvolutionRequest(preset_x="rect", preset_h="rect", domain="discrete", current_shift=2.0))
assert r8["success"] is True
print("[PASS] 8. Convolution instant:", r8["instant_value"])

# 9. LTI System Analyzer
r9 = analyze_lti_system(LTIAnalyzeRequest(system_id="accumulator", domain="discrete"))
assert r9["success"] is True
assert r9["system"]["linear"] is True
print("[PASS] 9. LTI Analyzer:", r9["system"]["name"])

# 10. Fourier Series
r10 = calculate_fourier_series(FourierSeriesRequest(waveform="square", harmonics=5, fundamental_freq=1.0, amplitude=1.0))
assert r10["success"] is True
assert len(r10["coefficients"]) == 5
print("[PASS] 10. Fourier Series harmonics:", len(r10["coefficients"]))

# 11. Practice Problems & Verify
probs = get_practice_problems()
assert len(probs["problems"]) > 0
p0 = probs["problems"][0]
v1 = verify_practice_answer(VerifyAnswerRequest(problem_id=p0["id"], selected_index=p0["correct_index"]))
assert v1["is_correct"] is True
print("[PASS] 11. Practice Verify: answer verified successfully!")

print("\n>>> ALL 11 BACKEND MODULES AND ENDPOINTS VERIFIED 100% SUCCEEDED! <<<")
