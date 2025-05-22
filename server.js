// server.js  
// redeploy test 2025-05-22)
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
      let explanations = demo.explanations;
      if (Array.isArray(explanations)) {
        let summary = [];
        let trends = [];
        let anomalies = [];
        let recommendations = [];
        explanations.forEach(str => {
          const s = str.trim();
          if (/^recommendation[:\-]/i.test(s)) {
            recommendations.push(s.replace(/^recommendation[:\-]\s*/i, ''));
          } else if (/^trend[:\-]/i.test(s) || /pattern/i.test(s)) {
            trends.push(s.replace(/^trend[:\-]\s*/i, ''));
          } else if (/anomal/i.test(s) || /unexpected|outlier/i.test(s)) {
            anomalies.push(s);
          } else if (/summary/i.test(s)) {
            summary.push(s.replace(/^summary[:\-]\s*/i, ''));
          } else {
            if (s.length < 80) summary.push(s);
            else trends.push(s);
          }
        });
        explanations = {
          summary: summary.join(' '),
          trends: trends.join(' '),
          anomalies: anomalies.join(' '),
          recommendations: recommendations.join(' ')
        };
      }
      return res.json({
        pareto: demo.pareto,
        explanations,
        demoGoals: demo.goals,
        demoConstraints: demo.constraints
      });
    }
    // Otherwise call real engine
    const pareto = await runOptimizationEngine(goals, constraints);
    const topSolutions = pareto.slice(0,5);
    const systemPrompt = {
      role: 'system',
      content: 'You are an expert in engineering optimization. You will receive JSON of top Pareto solutions. Analyze and return ONLY valid JSON object with the following fields: summary, trends, anomalies, recommendations. Do not use markdown, do not add any explanations or text before or after the JSON. Do not return an array, return an object with these fields.'
    };
    const userPrompt = {
      role: 'user',
      content: `Analyze the following Pareto optimization data.\n1. Describe the main trends and patterns.\n2. Indicate if there are any anomalies or unexpected results.\n3. Give recommendations for choosing the optimal solution.\n4. Summarize your findings in 2-3 sentences.\nReturn ONLY valid JSON object with the following fields: summary, trends, anomalies, recommendations. Do not use markdown, do not add any explanations or text before or after the JSON. Do not return an array, return an object with these fields.\nData: ${JSON.stringify(topSolutions, null, 2)}`
    };
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [systemPrompt, userPrompt]
    });
    let explanations;
    const content = chat.choices[0].message.content.trim();
    try {
      // Попытка извлечь JSON даже если он в markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        explanations = JSON.parse(jsonMatch[0]);
      } else {
        explanations = JSON.parse(content);
      }
      // Если вдруг вернулся массив, распределяем строки по полям
      if (Array.isArray(explanations)) {
        let summary = [];
        let trends = [];
        let anomalies = [];
        let recommendations = [];
        explanations.forEach(str => {
          const s = str.trim();
          if (/^recommendation[:\-]/i.test(s)) {
            recommendations.push(s.replace(/^recommendation[:\-]\s*/i, ''));
          } else if (/^trend[:\-]/i.test(s) || /pattern/i.test(s)) {
            trends.push(s.replace(/^trend[:\-]\s*/i, ''));
          } else if (/anomal/i.test(s) || /unexpected|outlier/i.test(s)) {
            anomalies.push(s);
          } else if (/summary/i.test(s)) {
            summary.push(s.replace(/^summary[:\-]\s*/i, ''));
          } else {
            // fallback: если строка короткая — summary, длинная — trend
            if (s.length < 80) summary.push(s);
            else trends.push(s);
          }
        });
        explanations = {
          summary: summary.join(' '),
          trends: trends.join(' '),
          anomalies: anomalies.join(' '),
          recommendations: recommendations.join(' ')
        };
      }
    } catch (e) {
      explanations = { summary: content };
    }
    res.json({ pareto, explanations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`));
