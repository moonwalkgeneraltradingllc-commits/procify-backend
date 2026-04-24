const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Home Route
app.get('/', (req, res) => {
  res.send('Procify API is live');
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'Procify'
  });
});

// Generate SOP Route
app.post('/generate', async (req, res) => {
  const { processDescription, sopType = 'Standard SOP' } = req.body;

  if (!processDescription || processDescription.trim().length < 10) {
    return res.status(400).json({
      error: 'Process description too short'
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Missing API key in Railway Variables'
    });
  }

  const systemPrompt = `
You are an expert business operations consultant.

Return ONLY valid JSON in this structure:

{
  "title": "SOP title",
  "type": "${sopType}",
  "department": "Department name",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "action": "Clear action",
      "note": ""
    }
  ],
  "checklist": ["item 1", "item 2", "item 3", "item 4"],
  "owner": "Responsible role",
  "time": "Estimated duration"
}

Create 5 to 8 practical steps.
Return JSON only.
`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Create a ${sopType} for:\n\n${processDescription}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Claude API error'
      });
    }

    const text = data.content[0].text
      .replace(/```json|```/g, '')
      .trim();

    const sop = JSON.parse(text);

    res.json({ sop });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Generation failed. Please try again.'
    });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Procify backend running on port ${PORT}`);
});
