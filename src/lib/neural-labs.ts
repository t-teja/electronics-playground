import type { LabMeta } from "./catalog";

export const NEURAL_CATEGORY = {
  id: "neural" as const,
  label: "Neural",
  blurb: "Weighted sums, thresholds, and attention. The same math as a network.",
};

export const NEURAL_LABS: LabMeta[] = [
  {
    slug: "perceptron",
    badge: "new",
    name: "Perceptron",
    symbol: "N",
    category: "neural",
    tagline: "A weighted sum with a door",
    summary:
      "Two inputs, two weights, a bias. If the sum clears zero, the neuron fires. One straight cut in the plane.",
    principle:
      "A perceptron computes z = w1 x1 + w2 x2 + b and outputs 1 when z is at least zero. AND, OR, and NAND are linearly separable. XOR is not.",
    formula: "y = step(w · x + b)",
    uses: [
      "The first trainable neural nets",
      "Linear classifiers at the front of a larger model",
      "Teaching the limit of one decision line",
    ],
  },
  {
    slug: "neural-net",
    badge: "new",
    name: "Neural net",
    symbol: "NN",
    category: "neural",
    tagline: "One line cannot do XOR. Two layers can.",
    summary:
      "Two hidden neurons fold the plane so XOR becomes easy. Each edge is a weight. Each node is a sigmoid.",
    principle:
      "A hidden layer computes new features: here one unit leans AND, the other OR. The output mixes them. That bent boundary is why deep nets work.",
    formula: "h = sigmoid(Wx + b)",
    uses: [
      "Every multilayer perceptron",
      "XOR and other bent decision regions",
      "The core of classic feed-forward nets",
    ],
  },
  {
    slug: "attention",
    badge: "new",
    name: "Attention",
    symbol: "Attn",
    category: "neural",
    tagline: "Ask, listen, mix",
    summary:
      "A query scores every key, softmax turns scores into weights, and the mix is a weighted sum of values.",
    principle:
      "Attention is a soft lookup. The query asks; keys vote; values are averaged by those votes. Temperature flattens or sharpens the vote.",
    formula: "a = softmax(q · k / T)",
    uses: [
      "Language models choosing what to read",
      "Translation and summarization",
      "Any model that must look at a sequence",
    ],
  },
];
