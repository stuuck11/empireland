import express from "express";
import path from "path";
import fs from "fs";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

console.log("🚀 SERVER STARTING - VERSION 1.1.1");

// We'll import Vite dynamically only in development
// import { createServer as createViteServer } from "vite"; 

let db = null;
let lastInitError = null;

function getDb() {
  if (!db) {
    try {
      const base64Config = process.env.FIREBASE_CONFIG_BASE64;
      
      if (!base64Config) {
        const errorMsg = "❌ ERRO: Variável FIREBASE_CONFIG_BASE64 não encontrada.";
        console.error(errorMsg);
        lastInitError = errorMsg;
        return null;
      }

      // Decodifica a string Base64 de volta para o JSON original
      const serviceAccount = JSON.parse(Buffer.from(base64Config, 'base64').toString('utf8'));

      const firebaseAdmin = admin.default || admin;
      const apps = firebaseAdmin.apps || [];
      
      if (apps.length === 0) {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount)
        });
      }
      db = firebaseAdmin.firestore();
      console.log("🔥 Firebase inicializado com sucesso via Base64!");
    } catch (err) {
      lastInitError = err instanceof Error ? err.message : String(err);
      console.error("❌ Erro ao inicializar Firebase:", err);
      return null;
    }
  }
  return db;
}

const app = express();
app.use(express.json());

// API Routes
app.get("/api/config", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) {
      return res.status(503).json({ 
        error: "Firebase não configurado", 
        hint: "Ocorreu um erro ao inicializar o Firebase com as credenciais embutidas." 
      });
    }
    
    // Fetch general settings
    const settingsSnap = await firestore.collection("config").doc("settings").get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {
      title: "O melhor empréstimo para você em 20 segundos",
      description: "Por favor, responda as perguntas abaixo para que nossa tecnologia possa escolher o melhor empréstimo para você."
    };

    const questionsSnap = await firestore.collection("config").doc("questions").get();
    const questions = questionsSnap.exists ? questionsSnap.data()?.items || [] : [];
    
    const numbersSnap = await firestore.collection("whatsapp_numbers").where("active", "==", true).get();
    const whatsappNumbers = numbersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ ...settings, questions, whatsappNumbers });
  } catch (error) {
    console.error("Error fetching config:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error",
      hint: "Verifique se as variáveis de ambiente do Firebase estão configuradas no painel da Hostinger."
    });
  }
});

// Activity tracking for online users
app.post("/api/activity", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) return res.status(503).json({ error: "Firebase não configurado" });
    
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Session ID is required" });

    await firestore.collection("activity").doc(sessionId).set({
      lastSeen: FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    firebase: !!serviceAccount.project_id 
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

app.get("/api/admin/stats", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) return res.status(503).json({ error: "Firebase não configurado" });
    
    const { period = 'today' } = req.query;

    const rotationSnap = await firestore.collection("config").doc("rotation").get();
    const totalClicks = rotationSnap.exists ? rotationSnap.data()?.totalClicks || 0 : 0;
    
    // Helper for date ranges (UTC-7 offset considered)
    const getRange = (daysAgo = 0) => {
      const now = new Date();
      // Adjust to UTC-7
      const localNow = new Date(now.getTime() - (7 * 60 * 60 * 1000));
      
      const start = new Date(localNow);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - daysAgo);
      
      const end = new Date(start);
      end.setUTCHours(23, 59, 59, 999);
      
      // Convert back to UTC for Firestore query
      return {
        start: new Date(start.getTime() + (7 * 60 * 60 * 1000)),
        end: new Date(end.getTime() + (7 * 60 * 60 * 1000))
      };
    };

    const todayRange = getRange(0);
    const yesterdayRange = getRange(1);
    const dayBeforeYesterdayRange = getRange(2);
    const sevenDaysRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };

    // Fetch clicks for today and yesterday for the summary
    const clicksTodaySnap = await firestore.collection("clicks")
      .where("timestamp", ">=", todayRange.start)
      .where("timestamp", "<=", todayRange.end)
      .count().get();
    const clicksToday = clicksTodaySnap.data().count;

    const clicksYesterdaySnap = await firestore.collection("clicks")
      .where("timestamp", ">=", yesterdayRange.start)
      .where("timestamp", "<=", yesterdayRange.end)
      .count().get();
    const clicksYesterday = clicksYesterdaySnap.data().count;

    // Fetch clicks for the selected period
    let periodCount = 0;
    if (period === 'today') periodCount = clicksToday;
    else if (period === 'yesterday') periodCount = clicksYesterday;
    else if (period === 'yesterday_before') {
      const snap = await firestore.collection("clicks")
        .where("timestamp", ">=", dayBeforeYesterdayRange.start)
        .where("timestamp", "<=", dayBeforeYesterdayRange.end)
        .count().get();
      periodCount = snap.data().count;
    } else if (period === '7days') {
      const snap = await firestore.collection("clicks")
        .where("timestamp", ">=", sevenDaysRange.start)
        .count().get();
      periodCount = snap.data().count;
    } else {
      periodCount = totalClicks;
    }

    // Online users tracking
    const getOnlineCount = async (minutes) => {
      const threshold = new Date(Date.now() - minutes * 60 * 1000);
      const snap = await firestore.collection("activity")
        .where("lastSeen", ">=", threshold)
        .count().get();
      return snap.data().count;
    };

    const onlineRealtime = await getOnlineCount(1); // 1 min for "real-time"
    const online5m = await getOnlineCount(5);
    const online10m = await getOnlineCount(10);
    const online30m = await getOnlineCount(30);

    const questionsSnap = await firestore.collection("config").doc("questions").get();
    const questions = questionsSnap.exists ? questionsSnap.data()?.items || [] : [];
    
    const settingsSnap = await firestore.collection("config").doc("settings").get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {
      title: "O melhor empréstimo para você em 20 segundos",
      description: "Por favor, responda as perguntas abaixo para que nossa tecnologia possa escolher o melhor empréstimo para você."
    };

    const numbersSnap = await firestore.collection("whatsapp_numbers").get();
    const whatsappNumbers = numbersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ 
      totalClicks, 
      clicksToday, 
      clicksYesterday, 
      periodCount,
      online: {
        realtime: onlineRealtime,
        m5: online5m,
        m10: online10m,
        m30: online30m
      },
      whatsappNumbers, 
      questions, 
      settings 
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.post("/api/admin/update-config", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) {
      return res.status(503).json({ 
        error: "Firebase não configurado", 
        hint: lastInitError || "Erro desconhecido na inicialização do Firebase." 
      });
    }
    
    const { questions, whatsappNumbers, settings } = req.body;
    
    // Update questions
    await firestore.collection("config").doc("questions").set({ items: questions });

    // Update general settings
    if (settings) {
      await firestore.collection("config").doc("settings").set(settings);
    }
    
    // Update whatsapp numbers (batch update)
    const batch = firestore.batch();
    
    // Get current IDs to know what to delete
    const currentSnap = await firestore.collection("whatsapp_numbers").get();
    const currentIds = currentSnap.docs.map(d => d.id);
    
    whatsappNumbers.forEach((n) => {
      const { id, ...data } = n;
      const docRef = id && typeof id === 'string' && id.length > 5 
        ? firestore.collection("whatsapp_numbers").doc(id) 
        : firestore.collection("whatsapp_numbers").doc();
      batch.set(docRef, data);
      // Remove from currentIds to keep track of what's still there
      const idx = currentIds.indexOf(id);
      if (idx > -1) currentIds.splice(idx, 1);
    });
    
    // Delete removed numbers
    currentIds.forEach(id => {
      batch.delete(firestore.collection("whatsapp_numbers").doc(id));
    });

    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating config:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.get("/api/redirect-lead", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) return res.status(503).send("Serviço temporariamente indisponível (Firebase não configurado).");
    
    // Get active numbers
    const numbersSnap = await firestore.collection("whatsapp_numbers").where("active", "==", true).get();
    const activeNumbers = numbersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (activeNumbers.length === 0) {
      return res.status(404).send("Nenhum número de WhatsApp ativo configurado.");
    }

    // Atomic increment of currentIndex
    const rotationRef = firestore.collection("config").doc("rotation");
    
    const result = await firestore.runTransaction(async (transaction) => {
      const rotationDoc = await transaction.get(rotationRef);
      let currentIndex = 0;
      let totalClicks = 0;
      
      if (rotationDoc.exists) {
        currentIndex = rotationDoc.data()?.currentIndex || 0;
        totalClicks = rotationDoc.data()?.totalClicks || 0;
      }
      
      const newIndex = currentIndex + 1;
      const newTotalClicks = totalClicks + 1;
      
      transaction.set(rotationRef, { 
        currentIndex: newIndex, 
        totalClicks: newTotalClicks,
        lastUpdate: FieldValue.serverTimestamp() 
      }, { merge: true });
      
      // Calculate target
      const targetIdx = currentIndex % activeNumbers.length;
      const selected = activeNumbers[targetIdx];
      
      // Increment clicks on the selected number
      const numberRef = firestore.collection("whatsapp_numbers").doc(selected.id);
      transaction.update(numberRef, { 
        clicks: FieldValue.increment(1) 
      });

      // Log individual click with timestamp
      const clickRef = firestore.collection("clicks").doc();
      transaction.set(clickRef, {
        numberId: selected.id,
        timestamp: FieldValue.serverTimestamp()
      });
      
      return selected;
    });

    const encodedMsg = encodeURIComponent(result.message);
    const waUrl = `https://wa.me/${result.number}?text=${encodedMsg}`;
    
    res.redirect(waUrl);
  } catch (error) {
    console.error("Error in redirect-lead:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    res.status(500).send(`
      <h1>Erro no Redirecionamento</h1>
      <p>Ocorreu um erro ao tentar processar o redirecionamento para o WhatsApp.</p>
      <pre style="background: #f4f4f4; padding: 15px; border: 1px solid #ccc;">
Erro: ${errorMsg}
Detalhes: ${errorStack}
      </pre>
      <p>Por favor, verifique os logs do servidor para mais informações.</p>
    `);
  }
});

// New endpoint to save lead data before redirect
app.post("/api/leads", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) return res.status(503).json({ error: "Firebase não configurado" });
    
    const { name, email, quiz_responses } = req.body;
    
    await firestore.collection("leads").add({
      name,
      email,
      quiz_responses,
      createdAt: FieldValue.serverTimestamp()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving lead:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error",
      stack: error instanceof Error ? error.stack : undefined,
      hint: "Erro ao tentar salvar o lead no Firestore. Verifique se o FieldValue está definido."
    });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to avoid loading Vite in production
    const { createServer: createViteServer } = await import("vite");
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
