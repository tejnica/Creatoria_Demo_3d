// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsyaml = require('js-yaml');
const { OpenAI } = require('openai');
const demoTasks = require('./demoTasks.json');

const app = express();
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://creatoria-demo-3d.vercel.app', 'https://*.vercel.app'] 
    : 'http://localhost:3000'
}));
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Placeholder for real optimization engine call
async function runOptimizationEngine(goals, constraints) {
  // TODO: integrate creatoria-core here
  return [
    { stiffness: 5.2, mass: 45.0, cost: 92.5, front: 'A' },
    { stiffness: 4.8, mass: 47.5, cost: 95.0, front: 'A' },
    { stiffness: 6.0, mass: 49.0, cost: 98.0, front: 'B' },
    { stiffness: 5.5, mass: 46.2, cost: 93.1, front: 'B' },
    { stiffness: 5.0, mass: 45.8, cost: 94.3, front: 'C' }
  ];
}

// 1) Generate YAML
app.post('/api/generate-yaml', async (req, res) => {
  try {
    const { description } = req.body;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are an expert at translating problem statements into structured data. Input: description of an engineering design task. Output: raw YAML with exactly three goals, any number of constraints.' },
        { role: 'user', content: description }
      ]
    });
    const raw = completion.choices[0].message.content;
    const clean = raw.replace(/```yaml\s*/g, '').replace(/```/g, '').trim();
    let data;
    try {
      data = jsyaml.load(clean);
    } catch (e) {
      return res.status(400).json({ error: 'YAML parsing error', details: e.message });
    }
    if (Array.isArray(data.goals) && data.goals.length > 3) data.goals = data.goals.slice(0,3);
    res.json({ yaml: clean, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2) Run optimization with demoTasks support
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, goals = [], constraints = [] } = req.body;
    // If demo task key provided, return precomputed demo
    if (taskKey && demoTasks[taskKey]) {
      const demo = demoTasks[taskKey];
      return res.json({
        pareto: demo.pareto,
        explanations: demo.explanations,
        demoGoals: demo.goals,
        demoConstraints: demo.constraints
      });
    }
    // Otherwise call real engine
    const pareto = await runOptimizationEngine(goals, constraints);
    const topSolutions = pareto.slice(0,5);
    const systemPrompt = {
      role: 'system',
      content: 'You are an expert in engineering optimization. You will receive JSON of top Pareto solutions. Parse and interpret.'
    };
    const userPrompt = {
      role: 'user',
      content: 'Top 5 Pareto solutions JSON:\n```json\n' + JSON.stringify(topSolutions, null, 2) + '\n```\nSummarize trade-offs and next steps.'
    };
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [systemPrompt, userPrompt]
    });
    const explanations = [chat.choices[0].message.content.trim()];
    res.json({ pareto, explanations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`));
