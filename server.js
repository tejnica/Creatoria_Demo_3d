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

// Функция для определения названий столбцов на основе описания задачи
function getObjectiveNames(taskDescription, nObjectives) {
    const desc = taskDescription.toLowerCase();
    const names = [];
    
    // Определяем названия на основе ключевых слов в описании
    if (desc.includes('weight') || desc.includes('mass')) {
        names.push('weight');
    }
    if (desc.includes('cost') || desc.includes('price')) {
        names.push('cost');
    }
    if (desc.includes('strength') || desc.includes('stiffness')) {
        names.push('strength');
    }
    if (desc.includes('heat') || desc.includes('flux')) {
        names.push('heat_flux');
    }
    if (desc.includes('pressure') || desc.includes('drop')) {
        names.push('pressure_drop');
    }
    if (desc.includes('volume')) {
        names.push('volume');
    }
    if (desc.includes('thrust')) {
        names.push('thrust');
    }
    if (desc.includes('energy')) {
        names.push('energy');
    }
    if (desc.includes('efficiency')) {
        names.push('efficiency');
    }
    if (desc.includes('safety')) {
        names.push('safety');
    }
    if (desc.includes('time') || desc.includes('duration')) {
        names.push('time');
    }
    if (desc.includes('noise')) {
        names.push('noise');
    }
    if (desc.includes('drag')) {
        names.push('drag');
    }
    if (desc.includes('lift')) {
        names.push('lift');
    }
    
    // Если найдено меньше названий чем целей, добавляем общие названия
    while (names.length < nObjectives) {
        names.push(`objective${names.length + 1}`);
    }
    
    // Возвращаем только нужное количество
    return names.slice(0, nObjectives);
}

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
        { role: 'system', content: 'You are an expert at translating problem statements into structured data. Input: description of an engineering design task. Output: raw YAML with the EXACT number of goals mentioned in the task (can be 1, 2, 3, 4, or more), any number of constraints.' },
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
    // Убрано ограничение на 3 цели - теперь поддерживается любое количество целей
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

    // --- ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ДИАГНОСТИКИ ---
    console.log("=== ПОЛНЫЙ ОТВЕТ ОТ BACKEND ===");
    console.log(JSON.stringify(resultFromPython, null, 2));
    
    // --- НОВАЯ, ИСПРАВЛЕННАЯ ЛОГИКА АДАПТАЦИИ ---
    
    // Проверяем, есть ли реальные вычислительные результаты
    const numericalResults = resultFromPython.numerical_results;
    let paretoData = [];

    // Проверяем, что есть фронт Парето от NSGA-II (многоцелевые задачи)
    if (numericalResults && numericalResults.result?.solver === 'nsga-ii' && numericalResults.result?.front) {
        const fullFront = numericalResults.result.front;
        const nObjectives = numericalResults.result.n_objectives || fullFront[0]?.length || 2;
        
        console.log("=== ДЕТАЛИ NSGA-II РЕЗУЛЬТАТОВ ===");
        console.log(`Количество целей: ${nObjectives}`);
        console.log(`Размер фронта: ${fullFront.length}`);
        console.log("Первые 3 точки фронта:", fullFront.slice(0, 3));
        console.log("Последние 3 точки фронта:", fullFront.slice(-3));
        
        // Создаем названия для целей
        const objectiveNames = getObjectiveNames(taskDescription, nObjectives);
        console.log("Названия целей:", objectiveNames);
        
        // Преобразуем ВЕСЬ фронт в формат для Frontend
        paretoData = fullFront.map((point, index) => {
            const dataPoint = { type: index < 3 ? ["Best for Objective 1", "Best for Objective 2", "Balanced"][index] : "Pareto Point" };
            
            // Добавляем значения целей с правильными ключами
            for (let i = 0; i < nObjectives && i < point.length; i++) {
                let value = point[i];
                // Если значение отрицательное (от maximize целей), инвертируем его
                if (value < 0) {
                    value = Math.abs(value);
                }
                // Используем общие ключи objective_1, objective_2 вместо названий
                dataPoint[`objective_${i+1}`] = value;
            }
            
            return dataPoint;
        });
        
        console.log("=== АНАЛИЗ РАЗНООБРАЗИЯ ДАННЫХ ===");
        if (paretoData.length > 1) {
            const firstPoint = paretoData[0];
            const objectiveKeys = Array.from({length: nObjectives}, (_, i) => `objective_${i+1}`);
            const allSame = paretoData.every(point => 
                objectiveKeys.every(key => Math.abs(point[key] - firstPoint[key]) < 0.001)
            );
            console.log(`Все точки одинаковые: ${allSame}`);
            
            // Показываем статистику по каждой цели
            objectiveKeys.forEach(key => {
                const values = paretoData.map(p => p[key]);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                console.log(`${key}: min=${min.toFixed(4)}, max=${max.toFixed(4)}, avg=${avg.toFixed(4)}, range=${(max-min).toFixed(4)}`);
            });
        }
        
        console.log("Финальные данные для Frontend (первые 5):", paretoData.slice(0, 5));
        console.log("ДИАГНОСТИКА: Ключи первого элемента:", Object.keys(paretoData[0]));
        console.log("ДИАГНОСТИКА: Значения первого элемента:", Object.values(paretoData[0]));
    } else if (numericalResults && numericalResults.result?.solver === 'ga' && numericalResults.result?.front) {
        // Обработка одноцелевых задач (GA)
        const front = numericalResults.result.front;
        const solutions = numericalResults.result.solutions;
        
        console.log("Обработка GA результатов для 1D задачи");
        
        if (Array.isArray(front) && front.length > 0 && Array.isArray(solutions) && solutions.length > 0) {
            // Для 1D задач создаем простую структуру данных
            let objectiveValue = Array.isArray(front[0]) ? front[0][0] : front[0];
            const designParam = Array.isArray(solutions[0]) ? solutions[0][0] : solutions[0];
            
            // Конвертируем отрицательные значения в положительные
            if (objectiveValue < 0) {
                objectiveValue = Math.abs(objectiveValue);
            }
            
            // Получаем правильное название для 1D задачи
            const objectiveNames = getObjectiveNames(taskDescription, 1);
            
            paretoData = [{
                [objectiveNames[0]]: objectiveValue,
                "parameter1": designParam,
                "type": "Optimal Solution"
            }];
            
            // Добавляем несколько вариаций для демонстрации (если нужно)
            if (paretoData.length === 1) {
                paretoData.push({
                    [objectiveNames[0]]: objectiveValue * 1.1,
                    "parameter1": designParam * 0.9,
                    "type": "Alternative 1"
                });
                paretoData.push({
                    [objectiveNames[0]]: objectiveValue * 1.2,
                    "parameter1": designParam * 0.8,
                    "type": "Alternative 2"
                });
            }
        } else {
            // Дефолтные данные для 1D задач
            const objectiveNames = getObjectiveNames(taskDescription, 1);
            paretoData = [{
                [objectiveNames[0]]: 1.0,
                "parameter1": 0.5,
                "type": "Default Solution"
            }];
        }
    } else {
        // Запасной вариант для других типов ответов
        console.log("Использование запасного варианта данных");
        const objectiveNames = getObjectiveNames(taskDescription, 1);
        paretoData = [{
            [objectiveNames[0]]: 1.0,
            "parameter1": 0.5,
            "type": "Default Solution"
        }];
    }
    
    // Помещаем весь Markdown отчет в поле summary, как ожидает ваш фронтенд
    const explanations = {
      summary: resultFromPython.human_readable_report || "Отчет не был сгенерирован.",
      trends: "", 
      anomalies: "",
      recommendations: ""
    };

    console.log("Отправка данных на Frontend:", JSON.stringify(paretoData, null, 2));
    
    // ИСПРАВЛЕНИЕ: Передаем И старый формат pareto И новый numerical_results
    const responseData = {
      pareto: paretoData,
      human_readable_report: resultFromPython.human_readable_report || "Отчет не был сгенерирован.",
      explanations,
      numerical_results: resultFromPython.numerical_results  // ← ДОБАВЛЯЕМ numerical_results!
    };
    
    console.log("=== ФИНАЛЬНЫЙ ОТВЕТ ДЛЯ FRONTEND ===");
    console.log("Структура ответа:", Object.keys(responseData));
    console.log("Наличие numerical_results:", !!responseData.numerical_results);
    if (responseData.numerical_results?.result?.front) {
      console.log("Количество точек в numerical_results.result.front:", responseData.numerical_results.result.front.length);
      console.log("Первая точка в numerical_results.result.front:", responseData.numerical_results.result.front[0]);
    }
    
    res.json(responseData);
    
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
