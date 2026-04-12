export default async function handler(req, res) {
  // CORS headers so any browser can call this
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

  const prompt = `You are an expert mathematics teacher and exam paper setter with decades of experience writing challenging, high-quality assessments.

Generate exactly ${count} mathematics questions on the topic: "${topic}".

Requirements:
- Education level: ${level}
- Difficulty: ${difficulty}
- Question type: ${type}
- ${ansInstruction}
- CRITICAL: Questions must be INDIRECT and NON-TRIVIAL. Avoid straightforward formula substitution. Use:
  * Real-world contextual problems
  * Multi-step reasoning chains
  * Unexpected angles or reverse-engineering
  * "Show that..." / proof-based approaches
  * Scenarios where students must identify which concept to apply
- Each question must test genuine conceptual understanding, not mere recall.
- Use plain-text math notation: x^2 for squared, sqrt(x) for square root, pi for π, etc.
- Make each question distinctly different in phrasing, context, and approach.
- Assign realistic mark allocations (2–10 marks) based on complexity.

Return ONLY a valid JSON array — no markdown fences, no preamble, no trailing text:
[
  {
    "question": "full question text",
    "difficulty": "Easy" | "Medium" | "Hard" | "Very Hard",
    "type": "Word problem" | "Calculation" | "Proof" | "Multi-step" | "Multiple choice",
    "marks": <integer>,
    "answer": "worked solution or brief answer or null"
  }
]`

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set.')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
        }
      })
    })

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok) {
      const msg = geminiData?.error?.message || 'Gemini API error'
      throw new Error(msg)
    }

    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = raw.replace(/```json|```/gi, '').trim()

    let questions
    try {
      questions = JSON.parse(cleaned)
    } catch {
      // Try to extract JSON array from response
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('Could not parse questions from AI response.')
      questions = JSON.parse(match[0])
    }

    return res.status(200).json({ questions })
  } catch (err) {
    console.error('Generate error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to generate questions.' })
  }
}
