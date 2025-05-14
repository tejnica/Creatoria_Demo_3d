import React, { useState } from "react";
import Plot from "react-plotly.js";
import * as yaml from "js-yaml";
import logo from "./logo_creatoria.png";

const exampleTemplates = {
  "Thermal shield": [
    "name: thermal_shield",
    "goal_variables:",
    "  - λ",
    "  - ρ",
    "  - cost",
    "constraints:",
    "  temp_max: '>= 1500'",
    "  thickness: '<= 0.05'",
    "  toxicity: '<= moderate'",
  ].join("\n"),

  "Composite layer": [
    "name: composite_layer",
    "goal_variables:",
    "  - strength",
    "  - weight",
    "  - cost",
    "constraints:",
    "  thickness: '<= 0.02'",
    "  stability: '>= 0.9'",
  ].join("\n"),
};

export default function CreatoriaWizard() {
  const [step, setStep] = useState(1);
  const [templateName, setTemplateName] = useState("");
  const [goalVariables, setGoalVariables] = useState([]);
  const [constraints, setConstraints] = useState(null);
  const [resultData, setResultData] = useState(null);

  const handleYamlUpload = async (e) => {
    const file = e.target.files[0];
    setTemplateName(file.name);
    const text = await file.text();
    parseYaml(text);
  };

  const parseYaml = (text) => {
    try {
      const parsed = yaml.load(text);
      setGoalVariables(
        Array.isArray(parsed.goal_variables) ? parsed.goal_variables : []
      );
      setConstraints(
        parsed.constraints &&
          typeof parsed.constraints === "object" &&
          !Array.isArray(parsed.constraints)
          ? parsed.constraints
          : null
      );
      setResultData(null);
      setStep(3);
    } catch (err) {
      alert("Invalid YAML format: " + err.message);
    }
  };

  const loadExampleTemplate = (templateLabel) => {
    const yamlText = exampleTemplates[templateLabel];
    setTemplateName(`${templateLabel} (example)`);
    parseYaml(yamlText);
  };

  const runOptimization = () => {
    setTimeout(() => {
      const data = {
        x: [0.2, 0.4, 0.6, 0.8, 1.0],
        y: [0.3, 0.5, 0.7, 0.9, 0.6],
        z: [0.9, 0.7, 0.5, 0.3, 0.6],
        front: ["Front 1", "Front 2", "Front 1", "Front 3", "Front 2"],
      };
      if (isValidResultData(data)) {
        setResultData(data);
        setStep(4);
      } else {
        alert("Optimization returned invalid data structure.");
      }
    }, 1000);
  };

  const isValidResultData = (data) => {
    return (
      data &&
      Array.isArray(data.x) &&
      Array.isArray(data.y) &&
      Array.isArray(data.z) &&
      Array.isArray(data.front) &&
      data.x.length === data.y.length &&
      data.y.length === data.z.length &&
      data.z.length === data.front.length
    );
  };

  const buildPlotData = (data) => {
    try {
      return [
        {
          x: Array.isArray(data.x) ? data.x : [],
          y: Array.isArray(data.y) ? data.y : [],
          z: Array.isArray(data.z) ? data.z : [],
          mode: "markers",
          type: "scatter3d",
          marker: {
            size: 6,
            color: Array.isArray(data.front)
              ? data.front.map((f) =>
                  f === "Front 1"
                    ? "#22c55e"
                    : f === "Front 2"
                    ? "#3b82f6"
                    : "#f97316"
                )
              : [],
            opacity: 0.8,
          },
          text: Array.isArray(data.front) ? data.front : [],
        },
      ];
    } catch (err) {
      console.error("Error building plot data:", err);
      return [];
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1117] text-white p-6">
      <div className="flex items-center space-x-4 mb-6">
        <img src={logo} alt="Creatoria Logo" className="h-12" />
        <h1 className="text-2xl font-semibold">Creatoria</h1>
      </div>

      {step === 1 && (
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold mb-2">
            Step 1: Define your design objective
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Select what you're aiming to improve: performance, cost, durability,
            or another aspect.
          </p>
          <button
            onClick={() => setStep(2)}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold mb-4">
            Step 2: Upload your design template (.yaml)
          </h2>
          <input
            type="file"
            accept=".yaml"
            onChange={handleYamlUpload}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600"
          />
          <p className="text-sm text-gray-500 mt-4">
            Or choose a predefined example:
          </p>
          <div className="mt-2 space-y-2">
            {Object.keys(exampleTemplates).map((label) => (
              <button
                key={label}
                onClick={() => loadExampleTemplate(label)}
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition w-full text-left"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-xl">
          <h2 className="text-xl font-semibold mb-4">Step 3: Preview inputs</h2>
          <p className="text-sm mb-2 text-gray-400">Template: {templateName}</p>
          <p className="text-sm text-gray-300">
            Goal variables: {goalVariables.join(", ")}
          </p>
          <p className="text-sm text-gray-300 mb-4">Constraints:</p>
          {constraints ? (
            <ul className="text-sm text-gray-400 list-disc pl-6">
              {Object.entries(constraints).map(([key, val]) => (
                <li key={key}>
                  {key}: {val}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-400">Invalid constraints format</p>
          )}
          <button
            onClick={runOptimization}
            className="mt-4 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition"
          >
            Run Optimization
          </button>
        </div>
      )}

      {step === 4 && resultData && isValidResultData(resultData) && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">
            Step 4: Explore results
          </h2>
          <Plot
            data={buildPlotData(resultData)}
            layout={{
              autosize: true,
              height: 500,
              paper_bgcolor: "#0e1117",
              font: { color: "white" },
              scene: {
                bgcolor: "#0e1117",
                xaxis: {
                  title: "λ",
                  color: "#ffffff",
                  gridcolor: "#444",
                  zerolinecolor: "#666",
                  linecolor: "#888",
                },
                yaxis: {
                  title: "ρ",
                  color: "#ffffff",
                  gridcolor: "#444",
                  zerolinecolor: "#666",
                  linecolor: "#888",
                },
                zaxis: {
                  title: "cost",
                  color: "#ffffff",
                  gridcolor: "#444",
                  zerolinecolor: "#666",
                  linecolor: "#888",
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
