/**
 * curatedProblems.js
 * Comprehensive master problem bank for Calculus Core and Signals & Systems.
 * Provides instant, zero-latency offline practice with step-by-step KaTeX solutions.
 */

export const CURATED_PROBLEMS = [
  {
    id: 1,
    category: "calculus",
    topic: "Derivatives & Chain Rule",
    difficulty: "Fundamentals",
    question: "Find the first derivative $\\frac{d}{dx} \\left[ (3x^2 - 4)^5 \\right]$.",
    options: [
      "30x(3x^2 - 4)^4",
      "5(3x^2 - 4)^4",
      "15x(3x^2 - 4)^4",
      "30x^2(3x^2 - 4)^4"
    ],
    correct_index: 0,
    hint: "Apply the generalized power rule: $\\frac{d}{dx}[u^n] = n u^{n-1} \\cdot u'$.",
    solution_steps: [
      {
        title: "Identify Inner Function",
        content: "Let $u(x) = 3x^2 - 4$, then $f(u) = u^5$."
      },
      {
        title: "Differentiate Inner Function",
        content: "$u'(x) = \\frac{d}{dx}(3x^2 - 4) = 6x$."
      },
      {
        title: "Apply Chain Rule",
        content: "$\\frac{df}{dx} = 5u^4 \\cdot u' = 5(3x^2 - 4)^4 \\cdot (6x) = 30x(3x^2 - 4)^4$."
      }
    ]
  },
  {
    id: 2,
    category: "calculus",
    topic: "Mean Value Theorem",
    difficulty: "Standard",
    question: "For $f(x) = x^3 - x$ on $[0, 2]$, find the value of $c \\in (0, 2)$ guaranteed by the Mean Value Theorem.",
    options: [
      "c = \\frac{2}{\\sqrt{3}}",
      "c = 1",
      "c = \\sqrt{3}",
      "c = \\frac{4}{3}"
    ],
    correct_index: 0,
    hint: "Set $f'(c) = \\frac{f(b) - f(a)}{b - a}$. Note $f(0)=0$ and $f(2)=6$.",
    solution_steps: [
      {
        title: "Evaluate Boundary Values",
        content: "$f(0) = 0$, $f(2) = 2^3 - 2 = 6$."
      },
      {
        title: "Calculate Secant Slope",
        content: "$\\text{Secant Slope} = \\frac{6 - 0}{2 - 0} = 3$."
      },
      {
        title: "Equate to Derivative",
        content: "$f'(x) = 3x^2 - 1 \\implies 3c^2 - 1 = 3 \\implies 3c^2 = 4 \\implies c = \\frac{2}{\\sqrt{3}} \\approx 1.155$."
      }
    ]
  },
  {
    id: 3,
    category: "calculus",
    topic: "Taylor Polynomials",
    difficulty: "Standard",
    question: "What is the third-order Maclaurin polynomial $P_3(x)$ for $f(x) = \\sin(x)$ around $a = 0$?",
    options: [
      "x - \\frac{x^3}{6}",
      "x + \\frac{x^3}{6}",
      "1 - \\frac{x^2}{2} + \\frac{x^3}{6}",
      "x - x^3"
    ],
    correct_index: 0,
    hint: "Recall that odd derivatives of $\\sin(x)$ at $0$ are $\\pm 1$, while even derivatives vanish.",
    solution_steps: [
      {
        title: "Compute Derivatives at a = 0",
        content: "$f(0)=0, f'(0)=1, f''(0)=0, f'''(0)=-1$."
      },
      {
        title: "Formulate Taylor Series Sum",
        content: "$P_3(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\frac{f'''(0)}{3!}x^3$."
      },
      {
        title: "Substitute Values",
        content: "$P_3(x) = 0 + 1 \\cdot x + 0 - \\frac{1}{6}x^3 = x - \\frac{x^3}{6}$."
      }
    ]
  },
  {
    id: 4,
    category: "calculus",
    topic: "Limits & L'Hôpital",
    difficulty: "Challenge",
    question: "Evaluate $\\lim_{x \\to 0} \\frac{\\sin(x) - x}{x^3}$.",
    options: [
      "-\\frac{1}{6}",
      "\\frac{1}{6}",
      "0",
      "\\text{Does not exist}"
    ],
    correct_index: 0,
    hint: "Direct substitution yields $0/0$. Use L'Hôpital's rule or Taylor expansion.",
    solution_steps: [
      {
        title: "Check Indeterminate Form",
        content: "At $x=0$, $\\frac{\\sin(0) - 0}{0} = \\frac{0}{0}$ (Indeterminate)."
      },
      {
        title: "Use Maclaurin Expansion",
        content: "$\\sin(x) = x - \\frac{x^3}{6} + O(x^5) \\implies \\sin(x) - x = -\\frac{x^3}{6} + O(x^5)$."
      },
      {
        title: "Evaluate Limit",
        content: "$\\lim_{x \\to 0} \\frac{-x^3/6 + O(x^5)}{x^3} = -\\frac{1}{6}$."
      }
    ]
  },
  {
    id: 5,
    category: "signals",
    topic: "Linearity & Homogeneity",
    difficulty: "Fundamentals",
    question: "Is the continuous system $y(t) = 3x(t) + 2$ linear?",
    options: [
      "No, because $T\\{0\\} = 2 \\neq 0$",
      "Yes, because it is an equation of a straight line",
      "Yes, if and only if $x(t) > 0$",
      "No, because time is continuous"
    ],
    correct_index: 0,
    hint: "Any linear system must satisfy the zero-in/zero-out property: $T\\{0\\} = 0$.",
    solution_steps: [
      {
        title: "Check Zero Input Response",
        content: "For input $x(t) = 0$, the output is $y(t) = 3(0) + 2 = 2 \\neq 0$."
      },
      {
        title: "Check Additivity",
        content: "$T\\{x_1 + x_2\\} = 3(x_1 + x_2) + 2 \\neq (3x_1 + 2) + (3x_2 + 2) = 3(x_1 + x_2) + 4$."
      },
      {
        title: "Conclusion",
        content: "Because additivity and zero-input conditions fail, the system is non-linear (affine)."
      }
    ]
  },
  {
    id: 6,
    category: "signals",
    topic: "Time Invariance",
    difficulty: "Standard",
    question: "Determine whether $y(t) = x(2t)$ is time-invariant.",
    options: [
      "Time-variant, because time-scaling alters delays",
      "Time-invariant, because the amplitude is preserved",
      "Linear and Time-Invariant (LTI)",
      "Causal and Time-Invariant"
    ],
    correct_index: 0,
    hint: "Compare $y(t - t_0)$ with the system response to a delayed input $x(t - t_0)$.",
    solution_steps: [
      {
        title: "Delay the Output",
        content: "$y(t - t_0) = x(2(t - t_0)) = x(2t - 2t_0)$."
      },
      {
        title: "Pass Delayed Input Through System",
        content: "Let $x_1(t) = x(t - t_0)$, then $y_1(t) = x_1(2t) = x(2t - t_0)$."
      },
      {
        title: "Compare Expressions",
        content: "$x(2t - 2t_0) \\neq x(2t - t_0)$ for any $t_0 \\neq 0$. Therefore, the system is time-variant."
      }
    ]
  },
  {
    id: 7,
    category: "signals",
    topic: "Fourier Series Symmetry",
    difficulty: "Standard",
    question: "Why do odd-symmetric periodic functions $f(-t) = -f(t)$ have all cosine Fourier coefficients $a_n = 0$?",
    options: [
      "The integrand $f(t)\\cos(n\\omega_0 t)$ is an odd function integrated over a symmetric interval",
      "Cosine waves only represent discrete systems",
      "Because odd functions do not possess energy",
      "Because $b_n$ coefficients absorb the cosine terms"
    ],
    correct_index: 0,
    hint: "Recall: $\\text{odd} \\times \\text{even} = \\text{odd}$, and $\\int_{-T/2}^{T/2} \\text{odd}\\,dt = 0$.",
    solution_steps: [
      {
        title: "Examine Integral for an",
        content: "$a_n = \\frac{2}{T}\\int_{-T/2}^{T/2} f(t)\\cos(n\\omega_0 t)\\,dt$."
      },
      {
        title: "Evaluate Parity of Integrand",
        content: "Since $f(t)$ is odd and $\\cos(n\\omega_0 t)$ is even, their product is odd: $(-f(t))(\\cos(-n\\omega_0 t)) = -f(t)\\cos(n\\omega_0 t)$."
      },
      {
        title: "Integral Over Symmetric Period",
        content: "The integral of any odd function over $[-T/2, T/2]$ is identically zero. Thus $a_n = 0$ for all $n$."
      }
    ]
  },
  {
    id: 8,
    category: "signals",
    topic: "BIBO Stability",
    difficulty: "Challenge",
    question: "An LTI system has impulse response $h(t) = e^{2t} u(t)$. Is the system BIBO stable?",
    options: [
      "No, because $\\int_{-\\infty}^{\\infty} |h(t)|\\,dt = \\infty$",
      "Yes, because $h(t)$ is causal",
      "Yes, because $e^{2t}$ is continuous",
      "Conditionally stable for bounded sinusoids"
    ],
    correct_index: 0,
    hint: "An LTI system is Bounded-Input Bounded-Output (BIBO) stable if and only if $\\int_{-\\infty}^{\\infty} |h(t)|\\,dt < \\infty$.",
    solution_steps: [
      {
        title: "BIBO Stability Condition",
        content: "Requires absolute integrability: $\\int_{-\\infty}^{\\infty} |h(t)|\\,dt < \\infty$."
      },
      {
        title: "Evaluate Integral",
        content: "$\\int_0^{\\infty} e^{2t}\\,dt = \\left[ \\frac{e^{2t}}{2} \\right]_0^\\infty = \\infty - \\frac{1}{2} = \\infty$."
      },
      {
        title: "Conclusion",
        content: "Since the integral diverges to infinity, the system is unstable (an unbounded response occurs for bounded inputs)."
      }
    ]
  }
];
