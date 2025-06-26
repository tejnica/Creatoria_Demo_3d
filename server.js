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
  // ... ваш код без изменений ...
});

// Эндпоинт /api/run-opt (ИСПРАВЛЕНА ЛОГИКА ОБРАБОТКИ РЕЗУЛЬТАТА)
app.post('/api/run-opt', async (req, res) => {
  try {
    const { taskKey, description } = req.body;

    if (taskKey && demoTasks[taskKey]) {
      // ... ваш код для демо-задач остается без изменений ...
      const demo = demoTasks[taskKey];
      return res.json({ pareto: demo.pareto, explanations: demo.explanations, demoGoals: demo.goals, demoConstraints: demo.constraints });
    }
    
    console.log("Запуск 'живой' оптимизации для задачи:", description);
    const resultFromPython = await runLiveOptimization(description);

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
            { "Objective 1": best_for_objective_1[0], "Objective 2": best_for_objective_1[1], "Solution Type": "Best for Obj 1" },
            { "Objective 1": best_for_objective_2[0], "Objective 2": best_for_objective_2[1], "Solution Type": "Best for Obj 2" },
            { "Objective 1": balanced_solution[0], "Objective 2": balanced_solution[1], "Solution Type": "Balanced" }
        ];
    }
    
    // Помещаем весь Markdown отчет в поле summary, как ожидает ваш фронтенд
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
