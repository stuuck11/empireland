import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());

const DB_FILE = path.join(process.cwd(), "db.json");

// Initial data
const initialData = {
  questions: [
    {
      id: 1,
      text: "De quanto você precisa?",
      options: [
        "Até R$2.000,00",
        "Entre R$2.000,00 e R$5.000,00",
        "Entre R$5.000,00 e R$15.000,00",
        "Mais de R$15.000,00"
      ]
    },
    {
      id: 2,
      text: "Você está negativado?",
      options: ["Sim", "Não"]
    }
  ],
  whatsappNumbers: [
    { id: 1, name: "Operador 1", number: "5531996996452", message: "Olá, vim pelo quiz e gostaria de ver meu empréstimo!", active: true, clicks: 0 }
  ],
  currentIndex: 0,
  totalClicks: 0
};

// Load or initialize DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

function getDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API Routes
app.get("/api/config", (req, res) => {
  const db = getDB();
  res.json({
    questions: db.questions,
    whatsappNumbers: db.whatsappNumbers.filter((n: any) => n.active)
  });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "stuuck" && password === "stuuck77") {
    res.json({ success: true, token: "fake-jwt-token" });
  } else {
    res.status(401).json({ success: false, message: "Credenciais inválidas" });
  }
});

app.get("/api/admin/stats", (req, res) => {
  const db = getDB();
  res.json({
    totalClicks: db.totalClicks,
    whatsappNumbers: db.whatsappNumbers,
    questions: db.questions
  });
});

app.post("/api/admin/update-config", (req, res) => {
  const { questions, whatsappNumbers } = req.body;
  const db = getDB();
  db.questions = questions;
  db.whatsappNumbers = whatsappNumbers;
  saveDB(db);
  res.json({ success: true });
});

app.get("/api/redirect-lead", (req, res) => {
  const db = getDB();
  const activeNumbers = db.whatsappNumbers.filter((n: any) => n.active);
  
  if (activeNumbers.length === 0) {
    return res.status(404).send("Nenhum número de WhatsApp ativo configurado.");
  }

  // Round Robin Logic
  const index = db.currentIndex % activeNumbers.length;
  const selected = activeNumbers[index];
  
  // Update stats
  db.totalClicks++;
  const realIndex = db.whatsappNumbers.findIndex((n: any) => n.id === selected.id);
  if (realIndex !== -1) {
    db.whatsappNumbers[realIndex].clicks++;
  }
  
  // Increment global index
  db.currentIndex = (db.currentIndex + 1) % activeNumbers.length;
  saveDB(db);

  const encodedMsg = encodeURIComponent(selected.message);
  const waUrl = `https://wa.me/${selected.number}?text=${encodedMsg}`;
  
  res.redirect(waUrl);
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
