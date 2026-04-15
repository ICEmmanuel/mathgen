export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { topic, level, difficulty, count, type, includeAnswers } = req.body

  if (!topic) return res.status(400).json({ error: 'Topic is required.' })

  const ansInstruction =
    includeAnswers === 'yes'
      ? 'Include a thorough step-by-step worked solution for each question in the "answer" field.'
      : includeAnswers === 'brief'
      ? 'Include only the final answer (no working) in the "answer" field.'
      : 'Set "answer" to null for every question.'

  const prompt = `You are an expert mathematics teacher and exam paper setter.

Generate exactly ${count} mathematics questions on the topic: "${topic}".

Requirements:
- Education level: ${level}
- Difficulty: ${difficulty}
- Question type: ${type}
- ${ansInstruction}
- Questions must be indirect and non-trivial, testing deep understanding.
- Use plain-text math: x^2 for squared, sqrt(x) for square root, pi for pi.
- Each question must be distinctly different in phrasing and context.
- Assign mark allocations (2-10 marks) based on complexity.

Return ONLY a valid JSON array, no markdown, no extra text:
[
  {
    "question": "full question text",
    "difficulty": "Easy or Medium or Hard or Very Hard",
    "type": "Word problem or Calculation or Proof or Multi-step or Multiple choice",
    "marks": 5,
    "answer": "worked solution or null"
  }
]`

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set.')

    const models = [
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
    ]

    let geminiData = null
    let lastError = ''

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 4096 }
        })
      })
      geminiData = await geminiRes.json()
      if (geminiRes.ok) break
      lastError = geminiData?.error?.message || `Model ${model} failed`
      geminiData = null
    }

    if (!geminiData) throw new Error(lastError || 'All Gemini models failed. Please try again.')

    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = raw.replace(/```json|```/gi, '').trim()

    let questions
    try {
      questions = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Could not parse AI response.')
      questions = JSON.parse(match[0])
    }

    return res.status(200).json({ questions })
  } catch (err) {
    console.error('Generate error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to generate questions.' })
  }
}
