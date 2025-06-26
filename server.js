// ==============================================================================
// server.js - Полная, исправленная и окончательная версия для MVP
//
// Что делает этот код:
// 1. Восстановлена полная рабочая логика для эндпоинта /api/generate-yaml.
// 2. Содержит исправленную логику для /api/run-opt, которая правильно
//    вызывает Python-бэкенд и обрабатывает полный фронт Парето.
// 3. Это единственный файл, который вам нужно обновить.
// ==============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsyaml = require('js-yaml');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
// Убедитесь, что путь к demoTasks.json правильный относительно корня проекта
const demoTasks = require('./src/demoTasks.json'); 

const app = express();

// Настройка CORS
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://creatoria.xyz', 'https://creatoria-demo.vercel.app', 'https://*.vercel.app'] 
    : 'http://localhost:3000'
}));
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL;

/**
 * Функция для вызова Python бэкенда.
 * @param {string} fullTaskDescription - Описание задачи от пользователя.
 * @returns {Promise<object>} - Ответ от Python API.
 */
async function runLiveOptimization(fullTaskDescription) {
  if (!PYTHON_BACKEND_URL) {
    throw new Error("URL Python бэкенда не задан в переменных окружения (PYTHON_BACKEND_URL)");
  }
  
  console.log(`Отправка запроса на Python бэкенд: ${PYTHON_BACKEND_URL}/run_task`);
  
  const response = await fetch(`${PYTHON_BACKEND_URL}/run_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: fullTaskDescription }),
      timeout: 60000, 
  });

  if (!response.ok) {
      const errorData = await response.json();
      console.error("Ошибка от Python бэкенда:", errorData);
      throw new Error(`Ошибка от Python бэкенда: ${errorData.error || response.statusText}`);
  }

  return response.json();
}

// --- Эндпоинт /api/generate-yaml (ВОССТАНОВЛЕННАЯ ЛОГИКА) ---
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
    console.error("Ошибка в /api/generate-yaml:", err);
    res.status(500).json({ error: err.message });
  }
});


// --- Эндпоинт /api/run-opt (ИСПРАВЛЕННАЯ ЛОГИКА) ---
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, description } = req.body;

    // Логика для демо-задач
    if (taskKey && demoTasks[taskKey]) {
      const demo = demoTasks[taskKey];
      // ... (ваш код для обработки демо-ответа)
      return res.json({ pareto: demo.pareto, explanations: demo.explanations, demoGoals: demo.goals, demoConstraints: demo.constraints });
    }
    
    // Логика для "живой" оптимизации
    console.log("Запуск 'живой' оптимизации для задачи:", description);
    const resultFromPython = await runLiveOptimization(description);
    
    // Адаптация ответа для фронтенда
    let paretoData = [];
    const numericalResults = resultFromPython.numerical_results;
    
    if (numericalResults && !numericalResults.error && numericalResults.result?.solver === 'nsga-ii' && numericalResults.result?.front) {
        const fullFront = numericalResults.result.front;
        paretoData = fullFront.map(point => ({
            "Objective 1 (e.g., Mass)": point[0],
            "Objective 2 (e.g., Strength)": point[1],
        }));
    } else if (numericalResults && !numericalResults.error) {
        const { best_for_objective_1, best_for_objective_2, balanced_solution } = numericalResults;
        paretoData = [
            { "Objective 1": best_for_objective_1[0], "Objective 2": best_for_objective_1[1], "Solution Type": "Best for Obj 1" },
            { "Objective 1": best_for_objective_2[0], "Objective 2": best_for_objective_2[1], "Solution Type": "Best for Obj 2" },
            { "Objective 1": balanced_solution[0], "Objective 2": balanced_solution[1], "Solution Type": "Balanced" }
        ];
    }

    const explanations = {
      summary: resultFromPython.human_readable_report || "Отчет не был сгенерирован.",
      trends: "",
      anomalies: "",
      recommendations: ""
    };

    res.json({ pareto: paretoData, explanations });
    
  } catch (err) {
    console.error("Критическая ошибка в /api/run-opt:", err);
    res.status(500).json({ error: err.message });
  }
});

// Экспорт для Vercel
module.exports = app;
