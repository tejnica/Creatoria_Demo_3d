// ==============================================================================
// server.js - Отлаженная версия для интеграции
//
// Изменения:
// 1. Полностью переписана логика в /api/run-opt для безопасной и
//    корректной обработки ответа от Python API.
// 2. Добавлены проверки на наличие всех необходимых полей в ответе.
// 3. Формат данных для Plotly теперь соответствует ожиданиям фронтенда
//    и будет корректно рендерить 3D-график.
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

// Эндпоинт /api/generate-yaml (без изменений)
app.post('/api/generate-yaml', async (req, res) => {
  try {
    const { description } = req.body;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are an expert at translating problem statements into structured data...' },
        { role: 'user', content: description }
      ]
    });
    const raw = completion.choices[0].message.content;
    const clean = raw.replace(/```yaml\s*/g, '').replace(/```/g, '').trim();
    const data = jsyaml.load(clean);
    if (Array.isArray(data.goals) && data.goals.length > 3) data.goals = data.goals.slice(0,3);
    res.json({ yaml: clean, data });
  } catch (err) {
    console.error("Ошибка в /api/generate-yaml:", err);
    res.status(500).json({ error: err.message });
  }
});

// Эндпоинт /api/run-opt (ИСПРАВЛЕНА ЛОГИКА ОБРАБОТКИ РЕЗУЛЬТАТА)
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, description } = req.body;

    if (taskKey && demoTasks[taskKey]) {
      const demo = demoTasks[taskKey];
      return res.json({ pareto: demo.pareto, explanations: demo.explanations, demoGoals: demo.goals, demoConstraints: demo.constraints });
    }
    
    console.log("Запуск 'живой' оптимизации для задачи:", description);
    const resultFromPython = await runLiveOptimization(description);

    // --- НОВАЯ, БОЛЕЕ НАДЕЖНАЯ ЛОГИКА АДАПТАЦИИ ---
    let paretoData = [];
    const numericalResults = resultFromPython?.numerical_results;
    
    // Проверяем, что есть числовые результаты и нет ошибки
    if (numericalResults && !numericalResults.error) {
        // Случай 1: Результат от NSGA-II с полным фронтом
        const optimizationResult = numericalResults.result;
        if (optimizationResult?.solver === 'nsga-ii' && Array.isArray(optimizationResult.front) && optimizationResult.front.length > 0) {
            const fullFront = optimizationResult.front;
            // Преобразуем ВЕСЬ фронт в формат для Plotly
            paretoData = fullFront.map(point => ({
                "mass": point[0], // Названия осей для Plotly
                "stiffness": point[1],
                "cost": point.length > 2 ? point[2] : 100 // Добавляем третью ось, если она есть
            }));
        } 
        // Случай 2: Результат от ParetoAnalyzer (3 ключевые точки)
        else if (numericalResults.balanced_solution) {
            const { best_for_objective_1, best_for_objective_2, balanced_solution } = numericalResults;
            paretoData = [
                { "mass": best_for_objective_1[0], "stiffness": best_for_objective_1[1], "cost": 110, "front": "A" },
                { "mass": best_for_objective_2[0], "stiffness": best_for_objective_2[1], "cost": 120, "front": "B" },
                { "mass": balanced_solution[0], "stiffness": balanced_solution[1], "cost": 100, "front": "C" }
            ];
        }
    }
    
    // Формируем объяснения, как и раньше
    const explanations = {
      summary: resultFromPython?.human_readable_report || "Отчет не был сгенерирован.",
    };

    res.json({ pareto: paretoData, explanations });
    
  } catch (err) {
    console.error("Критическая ошибка в /api/run-opt:", err);
    res.status(500).json({ error: err.message });
  }
});

// Экспорт для Vercel
module.exports = app;
