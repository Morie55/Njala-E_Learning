/**
 * NELMS Plagiarism Detection & Text Similarity Engine
 * Uses N-gram tokenization and Jaccard similarity coefficient to detect peer copy-pasting and overlap.
 */

function generateNGrams(text, n = 3) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  const nGrams = new Set()
  for (let i = 0; i <= words.length - n; i++) {
    nGrams.add(words.slice(i, i + n).join(' '))
  }
  return nGrams
}

export function computeSimilarity(textA, textB) {
  if (!textA || !textB || textA.length < 10 || textB.length < 10) {
    return { similarityPct: 0, matchedSnippet: '' }
  }

  const setA = generateNGrams(textA)
  const setB = generateNGrams(textB)

  if (setA.size === 0 || setB.size === 0) {
    return { similarityPct: 0, matchedSnippet: '' }
  }

  let intersectionSize = 0
  const matches = []

  for (const gram of setA) {
    if (setB.has(gram)) {
      intersectionSize++
      if (matches.length < 3) matches.push(gram)
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize
  const similarityPct = unionSize > 0 ? Math.round((intersectionSize / unionSize) * 100) : 0

  const matchedSnippet = matches.length > 0
    ? `Overlapping phrases: "${matches.join(' ... ')}"`
    : ''

  return { similarityPct, matchedSnippet }
}
