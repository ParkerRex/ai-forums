"use client";

import { CodeBlock, InlineCode } from "@/components/mdx/code-block";

export default function TestCodeBlocks() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Code Block Test Page</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Inline Code</h2>
        <p>
          Use <InlineCode>npm install</InlineCode> to install dependencies or{" "}
          <InlineCode>const x = 42;</InlineCode> for JavaScript.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">JavaScript Code Block</h2>
        <CodeBlock className="language-javascript">{`// Example JavaScript code
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log('Fibonacci of 10:', result);

// ES6 arrow function
const greet = (name) => {
  return \`Hello, \${name}!\`;
};`}</CodeBlock>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Python Code Block</h2>
        <CodeBlock className="language-python">{`# Python example with syntax highlighting
import numpy as np
from typing import List, Optional

class DataProcessor:
    def __init__(self, data: List[float]):
        self.data = np.array(data)
    
    def calculate_mean(self) -> float:
        """Calculate the mean of the data."""
        return np.mean(self.data)
    
    def normalize(self) -> np.ndarray:
        """Normalize the data to 0-1 range."""
        min_val = np.min(self.data)
        max_val = np.max(self.data)
        return (self.data - min_val) / (max_val - min_val)

# Usage
processor = DataProcessor([1, 2, 3, 4, 5])
print(f"Mean: {processor.calculate_mean()}")
print(f"Normalized: {processor.normalize()}")`}</CodeBlock>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">CSS Code Block</h2>
        <CodeBlock className="language-css">{`/* Modern CSS with variables and animations */
:root {
  --primary-color: #3b82f6;
  --background: #09090b;
  --foreground: #fafafa;
}

.button {
  background: var(--primary-color);
  color: var(--foreground);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`}</CodeBlock>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">HTML Code Block</h2>
        <CodeBlock className="language-html">{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Web Page</title>
</head>
<body>
    <header class="header">
        <nav class="navbar">
            <a href="#home">Home</a>
            <a href="#about">About</a>
        </nav>
    </header>
    
    <main>
        <section id="hero">
            <h1>Welcome to Our Site</h1>
            <p>Building amazing experiences</p>
        </section>
    </main>
</body>
</html>`}</CodeBlock>
      </section>
    </div>
  );
}
