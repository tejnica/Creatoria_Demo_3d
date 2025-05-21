# Creatoria Demo 3D

🧠 **Creatoria** — a demo interface for an AI-powered service for multi-criteria engineering design and analysis.  
Allows you to upload a task description in YAML, run optimization, and visualize the Pareto front in 3D with explanations.

---

## 📹 Demo Video

🎬 [Watch Creatoria Demo (3 min)](https://youtu.be/XBQIzM9myZw)

> From task to tradeoffs — how Creatoria helps engineers explore decisions visually and logically.

---

## ⚙️ Technologies

- React + TailwindCSS  
- Plotly 3D Graph  
- YAML upload & parsing  
- Creatoria logo and custom styles  

---

## 🚀 Local Setup & Run Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/creatoria-demo-3d.git
cd creatoria-demo-3d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm start
```

- The app will be available at [http://localhost:3000](http://localhost:3000) by default.

### 4. (Optional) Start the backend server

If your project uses a backend (for example, Express on port 3001), start it in a separate terminal:

```bash
npm run server
```
or
```bash
node server.js
```

### 5. Usage

- On the main page, you can either select a demo task or enter your own problem description in YAML format.
- Click "Generate YAML" to parse your input.
- Configure goals and constraints as needed.
- Run the optimization and explore the results in 3D with explanations.

---

## 📦 Notes

- Do **not** commit the `node_modules` folder or any sensitive files (see `.gitignore`).
- If you encounter issues with dependencies, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.
- For production deployment, use `npm run build`.
