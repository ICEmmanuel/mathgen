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
      ? 'Include a thorough step-by-step worked solution in the "answer" field.'
      : includeAnswers === 'brief'
      ? 'Include only the final answer in the "answer" field.'
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

IMPORTANT: Your entire response must be ONLY a valid JSON array. Start your response with [ and end with ]. No introduction, no explanation, no markdown code fences, no text before or after the array.

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

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

    let rawText = null
    let lastError = ''

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      })
      const geminiData = await geminiRes.json()
      if (geminiRes.ok) {
        rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        break
      }
      lastError = geminiData?.error?.message || `Model ${model} failed`
    }

    if (rawText === null) throw new Error(lastError || 'Generation failed. Please try again.')

    // Bulletproof JSON extraction — handles every known Gemini response format
    let questions = null

    // Attempt 1: direct parse (works when responseMimeType forces clean JSON)
    try { questions = JSON.parse(rawText); } catch (_) {}

    // Attempt 2: strip markdown fences then parse
    if (!questions) {
      try {
        const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
        questions = JSON.parse(stripped)
      } catch (_) {}
    }

    // Attempt 3: extract first JSON array found anywhere in the text
    if (!questions) {
      const match = rawText.match(/\[[\s\S]*?\](?=\s*$)/) || rawText.match(/\[[\s\S]*\]/)
      if (match) {
        try { questions = JSON.parse(match[0]) } catch (_) {}
      }
    }

    // Attempt 4: find array by scanning for '[' and matching closing ']'
    if (!questions) {
      const start = rawText.indexOf('[')
      const end = rawText.lastIndexOf(']')
      if (start !== -1 && end !== -1 && end > start) {
        try { questions = JSON.parse(rawText.slice(start, end + 1)) } catch (_) {}
      }
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('The AI returned an unexpected format. Please try again.')
    }

    // Sanitise each question so missing fields never break the frontend
    questions = questions.map((q, i) => ({
      question: q.question || q.text || q.q || `Question ${i + 1}`,
      difficulty: q.difficulty || 'Medium',
      type: q.type || 'General',
      marks: typeof q.marks === 'number' ? q.marks : 5,
      answer: q.answer && q.answer !== 'null' ? q.answer : null
    }))

    return res.status(200).json({ questions })
  } catch (err) {
    console.error('Generate error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to generate questions.' })
  }
}
