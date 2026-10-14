// The deck behind the landing page: five units of a sample course, each
// with a header card and seven study cards. Every card has a front (a term,
// formula or question) and a back (the answer), so any card can be flipped.

export const UNITS = [
  { short: "Probability", title: "Probability and Random Variables" },
  { short: "Moments", title: "Moments and Generating Functions" },
  { short: "Distributions", title: "Standard Distributions" },
  { short: "Hypothesis tests", title: "Sampling and Hypothesis Testing" },
  { short: "Regression", title: "Correlation and Regression" },
];

// kind: term | formula | question
const RAW = [
  [
    ["term", "Sample space", null, "The set of every possible outcome of an experiment."],
    ["formula", "Conditional probability", "P(A|B) = P(A∩B) / P(B)", "Only defined when P(B) > 0."],
    ["question", "When are A and B independent?", null, "When P(A∩B) = P(A) · P(B)."],
    ["formula", "Bayes' theorem", "P(A|B) = P(B|A) P(A) / P(B)", "Turns a likelihood into a posterior."],
    ["term", "Random variable", null, "A rule that gives every outcome a number."],
    ["question", "PMF or PDF?", null, "PMF for discrete variables, PDF for continuous ones."],
    ["formula", "Total probability", "P(B) = Σ P(B|Aᵢ) P(Aᵢ)", "Sum over a partition A₁, A₂, … of the sample space."],
  ],
  [
    ["formula", "Expectation", "E[X] = Σ x · P(X = x)", "The probability-weighted average of X."],
    ["formula", "Variance", "Var(X) = E[X²] − (E[X])²", "How far X spreads around its mean."],
    ["term", "Moments", "E[Xᵏ]", "The k-th moment of X about the origin."],
    ["formula", "Moment generating function", "M(t) = E[e^(tX)]", "Differentiate at t = 0 to read off the moments."],
    ["question", "Why use an MGF?", null, "It produces every moment and identifies the distribution."],
    ["formula", "Chebyshev's inequality", "P(|X − μ| ≥ kσ) ≤ 1/k²", "Holds for any distribution with a finite variance."],
    ["question", "What is E[aX + b]?", null, "a · E[X] + b, since expectation is linear."],
  ],
  [
    ["formula", "Binomial", "P(X = k) = C(n,k) pᵏ (1−p)ⁿ⁻ᵏ", "k successes in n independent trials."],
    ["term", "Poisson", "rate λ", "Counts rare events; its mean and variance are both λ."],
    ["term", "Geometric", null, "Number of trials until the first success."],
    ["term", "Exponential", null, "Waiting time between Poisson events. It is memoryless."],
    ["formula", "Standard normal", "Z = (X − μ) / σ", "Turns any normal variable into N(0, 1)."],
    ["question", "What is the 68–95–99.7 rule?", null, "The share of a normal within 1, 2 and 3 standard deviations."],
    ["term", "Uniform", "[a, b]", "Every value between a and b is equally likely."],
  ],
  [
    ["formula", "Standard error", "SE = σ / √n", "How much the sample mean varies between samples."],
    ["term", "Null hypothesis", "H₀", "The default claim the test tries to reject."],
    ["question", "What is a Type I error?", null, "Rejecting H₀ when it is actually true. Its rate is α."],
    ["question", "What is a Type II error?", null, "Keeping H₀ when it is actually false."],
    ["formula", "t statistic", "t = (x̄ − μ₀) / (s / √n)", "Used when the population σ is unknown."],
    ["term", "p-value", null, "How likely data this extreme is if H₀ is true."],
    ["term", "Chi-square test", "χ²", "Checks goodness of fit and independence for counts."],
  ],
  [
    ["formula", "Correlation", "−1 ≤ r ≤ 1", "Measures the strength of a linear relationship."],
    ["formula", "Least squares", "min Σ (yᵢ − a − bxᵢ)²", "Finds the line of best fit."],
    ["formula", "Slope", "b = Sxy / Sxx", "Change in y for each unit of x."],
    ["term", "Rank correlation", "ρ", "Spearman's ρ works on ranks instead of values."],
    ["question", "Is y on x the same line as x on y?", null, "No. Each line minimises errors in a different direction."],
    ["formula", "Coefficient of determination", "r²", "Share of the variance in y the line explains."],
    ["question", "Does correlation mean causation?", null, "No. It only measures how the two move together."],
  ],
];

export const CARDS = [];
UNITS.forEach((unit, u) => {
  CARDS.push({ unit: u, row: 0, kind: "header", title: unit.title, short: unit.short, back: `${RAW[u].length} cards in this unit` });
  RAW[u].forEach(([kind, title, formula, back], r) => {
    CARDS.push({ unit: u, row: r + 1, kind, title, formula, back, short: unit.short });
  });
});

// Notes that get dropped into the sorting demo, with the unit they belong to.
export const FILES = [
  { name: "lecture-07-bayes.pdf", unit: 0, peek: "prior, likelihood, posterior" },
  { name: "mgf-derivations.pdf", unit: 1, peek: "M(t) = E[e^(tX)]" },
  { name: "poisson-practice.pdf", unit: 2, peek: "λ = 3 calls per minute" },
  { name: "t-tests-tutorial.txt", unit: 3, peek: "σ unknown, use t" },
  { name: "least-squares-notes.pdf", unit: 4, peek: "b = Sxy / Sxx" },
];

// The cards shown in the flashcard fan (unit 1, rows 1-7).
export const FAN_CARDS = CARDS.filter((c) => c.unit === 0 && c.row > 0).map((c) => CARDS.indexOf(c));
