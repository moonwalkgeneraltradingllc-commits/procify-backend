// Procify API Proxy — deploy this to Railway, Render, or Vercel
// Free tier on all three. Takes 10 minutes to deploy.

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/generate', async (req, res) => {
  const { processDescription, sopType } = req.body;

  if (!processDescription || processDescription.trim().length < 10) {
    return res.status(400).json({ error: 'Process description too short' });
  }

  const systemPrompt = `You are an expert business operations consultant who creates professional Standard Operating Procedures. When given a process description, you output a clean, structured SOP in JSON format.

Return ONLY valid JSON with this exact structure:
{
  "title": "SOP title (5-8 words)",
  "type": "${sopType || 'Standard SOP'}",
  "department": "relevant department",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "action": "Clear action description",
      "note": "Optional tip or warning (empty string if none)"
    }
  ],
  "checklist": ["item 1", "item 2", "item 3", "item 4"],
  "owner": "Role responsible",
  "time": "Estimated completion time"
}

Create 5-8 specific, actionable steps. Return only valid JSON.`;

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
        messages: [{ role: 'user', content: `Create a ${sopType} for:\n\n${processDescription}` }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const sop = JSON.parse(text);
    res.json({ sop });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Generation failed. Please try again.' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', product: 'Procify' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Procify backend running on port ${PORT}`));
