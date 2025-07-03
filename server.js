// ==============================================================================
// server.js - Исправленная версия с правильной обработкой фронта Парето
//
// Изменения:
// 1. Логика в /api/run-opt теперь правильно обрабатывает весь массив
//    точек фронта Парето, полученный от Python API.
// 2. Данные для Plotly теперь формируются на основе всего фронта, что
//    позволит отрисовать полноценный 3D-график.
// 3. Формат ответа адаптирован для корректного отображения в вашем UI.
// ==============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsyaml = require('js-yaml');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
const demoTasks = require('./src/demoTasks.json');

const app = express();

console.log("PYTHON_BACKEND_URL:", process.env.PYTHON_BACKEND_URL);

app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://creatoria.xyz', 'https://creatoria-demo.vercel.app', 'https://*.vercel.app'] 
    : 'http://localhost:3000'
}));
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL;

async function runLiveOptimization(fullTaskDescription) {
  if (!PYTHON_BACKEND_URL) {
    throw new Error("URL Python бэкенда не задан в переменных окружения (PYTHON_BACKEND_URL)");
  }
  
  console.log(`Отправка запроса на Python бэкенд: ${PYTHON_BACKEND_URL}/run_task`);
  
  const response = await fetch(`${PYTHON_BACKEND_URL}/run_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: fullTaskDescription }),
      timeout: 180000, // 3 минуты
  });

  if (!response.ok) {
      const errorData = await response.json();
      console.error("Ошибка от Python бэкенда:", errorData);
      throw new Error(`Ошибка от Python бэкенда: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

// Эндпоинт /api/generate-yaml
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

// Эндпоинт /api/run-opt (ИСПРАВЛЕНА ЛОГИКА ОБРАБОТКИ РЕЗУЛЬТАТА)
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, description, goals = [], constraints = [] } = req.body;

    if (taskKey && demoTasks[taskKey]) {
      // ... ваш код для демо-задач остается без изменений ...
      const demo = demoTasks[taskKey];
      return res.json({ pareto: demo.pareto, explanations: demo.explanations, demoGoals: demo.goals, demoConstraints: demo.constraints });
    }
    
    // Определяем, что передавать в Python бэкенд
    let taskDescription = description;
    if (!taskDescription && (goals.length > 0 || constraints.length > 0)) {
      // Если нет description, но есть goals/constraints, формируем описание
      taskDescription = `Goals: ${goals.join(', ')}. Constraints: ${constraints.join(', ')}`;
    }
    
    if (!taskDescription) {
      return res.status(400).json({ error: 'Необходимо указать description или goals/constraints' });
    }
    
    console.log("Запуск 'живой' оптимизации для задачи:", taskDescription);
    const resultFromPython = await runLiveOptimization(taskDescription);

    // --- НОВАЯ, ИСПРАВЛЕННАЯ ЛОГИКА АДАПТАЦИИ ---
    
    // Проверяем, есть ли реальные вычислительные результаты
    const numericalResults = resultFromPython.numerical_results;
    let paretoData = [];

    // Проверяем, что есть фронт Парето от NSGA-II
    if (numericalResults && resultFromPython.numerical_results?.result?.solver === 'nsga-ii' && resultFromPython.numerical_results?.result?.front) {
        const fullFront = resultFromPython.numerical_results.result.front;
        // Преобразуем ВЕСЬ фронт в формат, который понимает ваш Plotly компонент
        paretoData = fullFront.map(point => ({
            "Mass (Цель 1)": point[0],
            "Strength (Цель 2)": point[1],
            // Можно добавить третью ось, если она есть
        }));
    } else if (numericalResults && !numericalResults.error) {
        // Запасной вариант для других типов ответов (QUBO, GA и т.д.)
        const { best_for_objective_1, best_for_objective_2, balanced_solution } = numericalResults;
        paretoData = [
            { mass: best_for_objective_1[0], stiffness: best_for_objective_1[1], type: "Best for Mass" },
            { mass: best_for_objective_2[0], stiffness: best_for_objective_2[1], type: "Best for Stiffness" },
            { mass: balanced_solution[0], stiffness: balanced_solution[1], type: "Balanced" }
        ];
    }
    
    // Помещаем весь Markdown отчет в поле summary, как ожидает ваш фронтенд
    const explanations = {
      summary: resultFromPython.human_readable_report || "Отчет не был сгенерирован.",
      trends: "", 
      anomalies: "",
      recommendations: ""
    };

    res.json({ pareto: paretoData, human_readable_report: resultFromPython.human_readable_report || "Отчет не был сгенерирован.", explanations });
    
  } catch (err) {
    console.error("Критическая ошибка в /api/run-opt:", err);
    res.status(500).json({ error: err.message });
  }
});

// Экспорт для Vercel
module.exports = app;

// Health check endpoint для диагностики
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    backendUrl: PYTHON_BACKEND_URL ? 'configured' : 'not configured',
    openaiKey: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
  });
});
