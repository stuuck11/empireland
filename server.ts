import express from "express";
import path from "path";
import * as admin from "firebase-admin";

// We'll import Vite dynamically only in development
// import { createServer as createViteServer } from "vite"; 

let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (!db) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Handle both escaped \n and actual newlines, and remove potential quotes
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, '');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("⚠️ ATENÇÃO: Variáveis de ambiente do Firebase ausentes. O banco de dados não funcionará até que sejam configuradas no painel da Hostinger.");
      return null;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      db = admin.firestore();
    } catch (err) {
      console.error("❌ Erro ao inicializar Firebase Admin:", err);
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
        hint: "Configure as variáveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no painel da Hostinger." 
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

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    firebase: !!process.env.FIREBASE_PROJECT_ID 
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
    
    const rotationSnap = await firestore.collection("config").doc("rotation").get();
    const totalClicks = rotationSnap.exists ? rotationSnap.data()?.totalClicks || 0 : 0;
    
    const questionsSnap = await firestore.collection("config").doc("questions").get();
    const questions = questionsSnap.exists ? questionsSnap.data()?.items || [] : [];
    
    const settingsSnap = await firestore.collection("config").doc("settings").get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {
      title: "O melhor empréstimo para você em 20 segundos",
      description: "Por favor, responda as perguntas abaixo para que nossa tecnologia possa escolher o melhor empréstimo para você."
    };

    const numbersSnap = await firestore.collection("whatsapp_numbers").get();
    const whatsappNumbers = numbersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ totalClicks, whatsappNumbers, questions, settings });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

app.post("/api/admin/update-config", async (req, res) => {
  try {
    const firestore = getDb();
    if (!firestore) return res.status(503).json({ error: "Firebase não configurado" });
    
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
    
    whatsappNumbers.forEach((n: any) => {
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
    const activeNumbers = numbersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    
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
        lastUpdate: admin.firestore.FieldValue.serverTimestamp() 
      }, { merge: true });
      
      // Calculate target
      const targetIdx = currentIndex % activeNumbers.length;
      const selected = activeNumbers[targetIdx];
      
      // Increment clicks on the selected number
      const numberRef = firestore.collection("whatsapp_numbers").doc(selected.id);
      transaction.update(numberRef, { 
        clicks: admin.firestore.FieldValue.increment(1) 
      });
      
      return selected;
    });

    const encodedMsg = encodeURIComponent(result.message);
    const waUrl = `https://wa.me/${result.number}?text=${encodedMsg}`;
    
    res.redirect(waUrl);
  } catch (error) {
    console.error("Error in redirect-lead:", error);
    res.status(500).send(error instanceof Error ? error.message : "Erro ao processar redirecionamento.");
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
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving lead:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
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
