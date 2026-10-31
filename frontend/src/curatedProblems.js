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
      "c = \\sqrt{2}",
      "c = \\frac{4}{3}"
    ],
    correct_index: 0,
    hint: "Recall MVT: $f'(c) = \\frac{f(b) - f(a)}{b - a}$. Find secant slope first.",
    solution_steps: [
      {
        title: "Evaluate Boundary Values",
        content: "$f(0) = 0$ and $f(2) = 2^3 - 2 = 6$."
      },
      {
        title: "Calculate Secant Slope",
        content: "$\\frac{f(2) - f(0)}{2 - 0} = \\frac{6 - 0}{2} = 3$."
      },
      {
        title: "Equate to Derivative",
        content: "$f'(x) = 3x^2 - 1 = 3 \\implies 3x^2 = 4 \\implies x = \\frac{2}{\\sqrt{3}} \\approx 1.155 \\in (0, 2)$."
      }
    ]
  },
  {
    id: 3,
    category: "calculus",
    topic: "Taylor Series Expansion",
    difficulty: "Standard",
    question: "What is the 3rd-order Taylor polynomial $P_3(x)$ for $f(x) = \\ln(1 + x)$ centered at $a = 0$?",
    options: [
      "x - \\frac{x^2}{2} + \\frac{x^3}{3}",
      "x + \\frac{x^2}{2} + \\frac{x^3}{6}",
      "1 + x - \\frac{x^2}{2}",
      "x - x^2 + x^3"
    ],
    correct_index: 0,
    hint: "Calculate successive derivatives at $x = 0$ and divide by $k!$. Note alternating signs.",
    solution_steps: [
      {
        title: "Compute Derivatives at a = 0",
        content: "$f(0) = 0$, $f'(0) = 1$, $f''(0) = -1$, $f'''(0) = 2$."
      },
      {
        title: "Formulate Taylor Series Sum",
        content: "$P_3(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\frac{f'''(0)}{3!}x^3$."
      },
      {
        title: "Substitute Values",
        content: "$P_3(x) = 0 + 1x + \\frac{-1}{2}x^2 + \\frac{2}{6}x^3 = x - \\frac{x^2}{2} + \\frac{x^3}{3}$."
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
      "0",
      "\\frac{1}{6}",
      "\\infty"
    ],
    correct_index: 0,
    hint: "This limit is indeterminate $\\frac{0}{0}$. Use Taylor expansion $\\sin(x) = x - \\frac{x^3}{6} + O(x^5)$ or apply L'Hôpital three times.",
    solution_steps: [
      {
        title: "Check Indeterminate Form",
        content: "At $x = 0$, $\\frac{\\sin(0) - 0}{0^3} = \\frac{0}{0}$."
      },
      {
        title: "Use Maclaurin Expansion",
        content: "Substitute $\\sin(x) = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\dots$ into the numerator."
      },
      {
        title: "Evaluate Limit",
        content: "$\\lim_{x \\to 0} \\frac{(x - x^3/6 + \\dots) - x}{x^3} = \\lim_{x \\to 0} \\frac{-x^3/6}{x^3} = -\\frac{1}{6}$."
      }
    ]
  },
  {
    id: 5,
    category: "signals",
    topic: "System Linearity",
    difficulty: "Fundamentals",
    question: "Is the system defined by $y(t) = 3x(t) + 5$ linear?",
    options: [
      "No, it violates the zero-input zero-output condition $T\\{0\\} = 0$",
      "Yes, because 3 and 5 are constant scalars",
      "Yes, because it satisfies homogeneity",
      "Cannot be determined without frequency response"
    ],
    correct_index: 0,
    hint: "A linear system must satisfy both additivity and homogeneity, which strictly requires $y(t) = 0$ when $x(t) = 0$.",
    solution_steps: [
      {
        title: "Check Zero Input Response",
        content: "When $x(t) = 0$, $y(t) = 3(0) + 5 = 5 \\neq 0$."
      },
      {
        title: "Check Additivity",
        content: "$T\\{x_1 + x_2\\} = 3(x_1 + x_2) + 5 \\neq (3x_1 + 5) + (3x_2 + 5) = 3x_1 + 3x_2 + 10$."
      },
      {
        title: "Conclusion",
        content: "Because $T\\{0\\} \\neq 0$ and additivity fails, the system is non-linear (affine)."
      }
    ]
  },
  {
    id: 6,
    category: "signals",
    topic: "Time Invariance",
    difficulty: "Standard",
    question: "Determine whether $y(t) = x(2t)$ represents a time-invariant system.",
    options: [
      "Time-variant, time scaling inherently produces time variation",
      "Time-invariant, because the transformation is linear",
      "Time-invariant, because no explicit function of t is added",
      "Both time-invariant and causal"
    ],
    correct_index: 0,
    hint: "Compare $y(t - t_0)$ with the system response to delayed input $x(t - t_0)$.",
    solution_steps: [
      {
        title: "Delay the Output",
        content: "$y(t - t_0) = x(2(t - t_0)) = x(2t - 2t_0)$."
      },
      {
        title: "Pass Delayed Input Through System",
        content: "Let $x_1(t) = x(t - t_0)$. Then $y_1(t) = x_1(2t) = x(2t - t_0)$."
      },
      {
        title: "Compare Expressions",
        content: "$x(2t - 2t_0) \\neq x(2t - t_0)$. Hence the system is time-variant."
      }
    ]
  },
  {
    id: 7,
    category: "signals",
    topic: "Fourier Series Symmetry",
    difficulty: "Standard",
    question: "If a real periodic signal $x(t)$ is an odd function ($x(-t) = -x(t)$), what can be said about its Fourier coefficients $a_n$ and $b_n$?",
    options: [
      "a_n = 0 for all n, and b_n contains only sine harmonics",
      "b_n = 0 for all n, and a_n contains only cosine harmonics",
      "Both a_n and b_n are strictly zero",
      "a_0 \\neq 0 and b_n = 0"
    ],
    correct_index: 0,
    hint: "Recall: $\\cos(n\\omega_0 t)$ is even, while $\\sin(n\\omega_0 t)$ is odd. What is the integral of (odd $\\times$ even) over a symmetric interval?",
    solution_steps: [
      {
        title: "Examine Integral for an",
        content: "$a_n = \\frac{2}{T}\\int_{-T/2}^{T/2} x(t)\\cos(n\\omega_0 t)dt$."
      },
      {
        title: "Evaluate Parity of Integrand",
        content: "Since $x(t)$ is odd and $\\cos(n\\omega_0 t)$ is even, the product is odd: $(\\text{odd}) \\times (\\text{even}) = \\text{odd}$."
      },
      {
        title: "Integral Over Symmetric Period",
        content: "The integral of an odd function over a symmetric interval $[-T/2, T/2]$ is identically 0. Thus $a_n = 0$, leaving purely sine terms $b_n$."
      }
    ]
  },
  {
    id: 8,
    category: "signals",
    topic: "BIBO Stability",
    difficulty: "Challenge",
    question: "An LTI system has impulse response $h(t) = e^{-2t} u(t)$. Is the system BIBO stable?",
    options: [
      "Stable, because $\\int_{-\\infty}^{\\infty} |h(t)| dt = \\frac{1}{2} < \\infty$",
      "Unstable, because the exponential decays to zero",
      "Marginally stable, because of the unit step discontinuity",
      "Unstable, because the integral diverges"
    ],
    correct_index: 0,
    hint: "An LTI system is Bounded-Input Bounded-Output (BIBO) stable if and only if its impulse response is absolutely integrable.",
    solution_steps: [
      {
        title: "BIBO Stability Condition",
        content: "The system is BIBO stable if $\\int_{-\\infty}^{\\infty} |h(t)| dt < \\infty$."
      },
      {
        title: "Evaluate Integral",
        content: "$\\int_0^{\\infty} e^{-2t} dt = \\left[ -\\frac{e^{-2t}}{2} \\right]_0^{\\infty} = 0 - \\left(-\\frac{1}{2}\\right) = \\frac{1}{2}$."
      },
      {
        title: "Conclusion",
        content: "Since $\\frac{1}{2} < \\infty$, the impulse response is absolutely integrable, confirming BIBO stability."
      }
    ]
  },
  {
    id: 9,
    category: "calculus",
    topic: "Optimization & Extrema",
    difficulty: "Standard",
    question: "A rectangular garden is to be fenced on three sides using 40 meters of fencing (the fourth side is a brick wall). Find the maximum possible area.",
    options: [
      "200\\text{ m}^2",
      "100\\text{ m}^2",
      "400\\text{ m}^2",
      "150\\text{ m}^2"
    ],
    correct_index: 0,
    hint: "Let $x$ be the width of the two perpendicular sides. The length is $40 - 2x$. Maximize $A(x) = x(40 - 2x)$.",
    solution_steps: [
      {
        title: "Formulate Area Function",
        content: "Fence constraint: $2x + y = 40 \\implies y = 40 - 2x$. Area $A(x) = x(40 - 2x) = 40x - 2x^2$."
      },
      {
        title: "Differentiate and Locate Stationary Point",
        content: "$A'(x) = 40 - 4x = 0 \\implies 4x = 40 \\implies x = 10\\text{ m}$."
      },
      {
        title: "Verify Maximum and Calculate Area",
        content: "$A''(x) = -4 < 0$ (concave down $\\implies$ local maximum). Maximum area $A(10) = 10 \\cdot (40 - 20) = 200\\text{ m}^2$."
      }
    ]
  },
  {
    id: 10,
    category: "calculus",
    topic: "Multivariable Gradient & Direction",
    difficulty: "Challenge",
    question: "Compute the gradient $\\nabla f(1, 2)$ for the 3D surface $f(x, y) = x^2 y + y^3$.",
    options: [
      "\\nabla f(1, 2) = \\begin{pmatrix} 4 \\\\ 13 \\end{pmatrix}",
      "\\nabla f(1, 2) = \\begin{pmatrix} 2 \\\\ 12 \\end{pmatrix}",
      "\\nabla f(1, 2) = \\begin{pmatrix} 4 \\\\ 7 \\end{pmatrix}",
      "\\nabla f(1, 2) = \\begin{pmatrix} 1 \\\\ 8 \\end{pmatrix}"
    ],
    correct_index: 0,
    hint: "Recall: $\\nabla f(x, y) = \\left( \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y} \\right)^T$. Differentiate with respect to each variable holding the other constant.",
    solution_steps: [
      {
        title: "Partial Derivative with Respect to x",
        content: "$\\frac{\\partial f}{\\partial x} = 2xy$. At $(1, 2)$: $2(1)(2) = 4$."
      },
      {
        title: "Partial Derivative with Respect to y",
        content: "$\\frac{\\partial f}{\\partial y} = x^2 + 3y^2$. At $(1, 2)$: $1^2 + 3(2^2) = 1 + 12 = 13$."
      },
      {
        title: "Construct Gradient Vector",
        content: "$\\nabla f(1, 2) = \\langle 4, 13 \\rangle$. This points in the direction of steepest ascent on the surface."
      }
    ]
  },
  {
    id: 11,
    category: "signals",
    topic: "Continuous Fourier Transform",
    difficulty: "Standard",
    question: "What is the continuous Fourier Transform of a symmetric rectangular pulse of width $\\tau$: $x(t) = \\text{rect}(t/\\tau)$?",
    options: [
      "X(\\omega) = \\tau \\cdot \\text{sinc}\\left(\\frac{\\omega\\tau}{2\\pi}\\right)",
      "X(\\omega) = \\frac{1}{j\\omega + 1}",
      "X(\\omega) = \\pi \\delta(\\omega)",
      "X(\\omega) = \\tau^2 e^{-j\\omega\\tau}"
    ],
    correct_index: 0,
    hint: "Integrate $x(t)e^{-j\\omega t}$ from $-\\tau/2$ to $\\tau/2$. Use Euler's formula $\\frac{e^{j\\theta} - e^{-j\\theta}}{2j} = \\sin\\theta$.",
    solution_steps: [
      {
        title: "Setup Fourier Integral",
        content: "$X(\\omega) = \\int_{-\\tau/2}^{\\tau/2} 1 \\cdot e^{-j\\omega t} dt = \\left[ \\frac{e^{-j\\omega t}}{-j\\omega} \\right]_{-\\tau/2}^{\\tau/2}$."
      },
      {
        title: "Evaluate Definite Limits",
        content: "$X(\\omega) = \\frac{e^{j\\omega\\tau/2} - e^{-j\\omega\\tau/2}}{j\\omega} = \\frac{2\\sin(\\omega\\tau/2)}{\\omega} = \\tau \\frac{\\sin(\\omega\\tau/2)}{\\omega\\tau/2}$."
      },
      {
        title: "Standard Sinc Formulation",
        content: "In engineering notation $\\text{sinc}(u) = \\frac{\\sin(\\pi u)}{\\pi u}$, this is $X(\\omega) = \\tau \\cdot \\text{sinc}\\left(\\frac{\\omega\\tau}{2\\pi}\\right)$."
      }
    ]
  },
  {
    id: 12,
    category: "signals",
    topic: "Euler Formula & Phasors",
    difficulty: "Fundamentals",
    question: "Using Euler's identity, what is the polar magnitude and angle of the complex signal $z(t) = e^{j(\\omega_0 t + \\pi/3)}$?",
    options: [
      "|z(t)| = 1, \\quad \\angle z(t) = \\omega_0 t + \\frac{\\pi}{3}",
      "|z(t)| = \\omega_0, \\quad \\angle z(t) = \\frac{\\pi}{3}",
      "|z(t)| = \\sqrt{2}, \\quad \\angle z(t) = 0",
      "|z(t)| = 0.5, \\quad \\angle z(t) = \\pi/3"
    ],
    correct_index: 0,
    hint: "Recall Euler's formula: $|e^{j\\theta}| = \\sqrt{\\cos^2\\theta + \\sin^2\\theta} = 1$ for any real angle $\\theta$.",
    solution_steps: [
      {
        title: "Apply Euler's Formula",
        content: "$e^{j\\theta} = \\cos\\theta + j\\sin\\theta$, where $\\theta = \\omega_0 t + \\pi/3$."
      },
      {
        title: "Compute Complex Magnitude",
        content: "$|z(t)| = \\sqrt{\\cos^2(\\theta) + \\sin^2(\\theta)} = 1$ (unit circle phasor)."
      },
      {
        title: "Determine Phase Angle",
        content: "The argument $\\angle z(t) = \\text{atan2}(\\sin\\theta, \\cos\\theta) = \\omega_0 t + \\pi/3$ rad."
      }
    ]
  }
];
