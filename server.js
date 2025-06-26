// server.js  
// Интеграция с Python-бэкендом на Render.com
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsyaml = require('js-yaml');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
const demoTasks = require('./demoTasks.json');

const app = express();
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://creatoria-demo-3d.vercel.app', 'https://*.vercel.app'] 
    : 'http://localhost:3000'
}));
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Функция для вызова Python-бэкенда
async function callPythonBackend(goals, constraints) {
  const backendUrl = process.env.PYTHON_BACKEND_URL;
  
  if (!backendUrl) {
    throw new Error('PYTHON_BACKEND_URL не настроен в переменных окружения');
  }

  try {
    console.log('Вызываем Python-бэкенд:', backendUrl);
    console.log('Цели:', goals);
    console.log('Ограничения:', constraints);

    const response = await fetch(`${backendUrl}/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        goals: goals,
        constraints: constraints
      }),
      timeout: 300000 // 5 минут таймаут для долгих вычислений
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка бэкенда: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Получен ответ от Python-бэкенда:', result);
    
    return result;
  } catch (error) {
    console.error('Ошибка при вызове Python-бэкенда:', error);
    throw error;
  }
}

// Функция для запуска оптимизации
async function runOptimizationEngine(goals, constraints) {
  try {
    const result = await callPythonBackend(goals, constraints);
    
    // Преобразуем результат в формат, ожидаемый фронтендом
    if (result.pareto_front && Array.isArray(result.pareto_front)) {
      return result.pareto_front.map(solution => ({
        stiffness: solution.stiffness || solution.жесткость || 0,
        mass: solution.mass || solution.масса || 0,
        cost: solution.cost || solution.стоимость || 0,
        front: solution.front || 'A'
      }));
    }
    
    // Fallback на демо-данные если формат неожиданный
    console.warn('Неожиданный формат ответа от бэкенда, используем fallback');
    return [
      { stiffness: 5.2, mass: 45.0, cost: 92.5, front: 'A' },
      { stiffness: 4.8, mass: 47.5, cost: 95.0, front: 'A' },
      { stiffness: 6.0, mass: 49.0, cost: 98.0, front: 'B' },
      { stiffness: 5.5, mass: 46.2, cost: 93.1, front: 'B' },
      { stiffness: 5.0, mass: 45.8, cost: 94.3, front: 'C' }
    ];
  } catch (error) {
    console.error('Ошибка в runOptimizationEngine:', error);
    throw error;
  }
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

// 2) Run optimization with demoTasks support and live backend integration
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, goals = [], constraints = [] } = req.body;
    
    // Если предоставлен ключ демо-задачи, возвращаем предвычисленные демо-данные
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
    
    // Иначе вызываем реальный Python-бэкенд
    console.log('Запуск живой оптимизации с целями:', goals);
    console.log('И ограничениями:', constraints);
    
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
    console.error('Ошибка в /api/run-opt:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint для проверки статуса
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    backendUrl: process.env.PYTHON_BACKEND_URL ? 'configured' : 'not configured'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server запущен на http://localhost:${PORT}`);
  console.log(`Python backend URL: ${process.env.PYTHON_BACKEND_URL || 'не настроен'}`);
});
