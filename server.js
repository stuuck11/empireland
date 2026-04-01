import express from "express";
import path from "path";
import * as admin from "firebase-admin";

console.log("🚀 SERVER STARTING - VERSION 1.0.5");

const serviceAccount = {
  "type": "service_account",
  "project_id": "empireland-5d335",
  "private_key_id": "1aa520b1167930f1ff79d4d8637a026621bc0e92",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJ1pdc7E/7SK6v\nEz+QbwR4CFAcdQVEx6WJou0dU6jgxNiX/VZNphiK0JmeCZLMSxZTFynrmD7shTf6\nlAm8Z8ejmWb0VHemMJpvYLf6zq6rFYoQv5JCKNYWXh5m7kkYCwdb+pPxS8h4Lbl0\njvzGUUUqo1v1L241/TiLqvhRL13DQ7c6jZIdIZWWti0yVoEdiyy4ILsZsKVYQ2oI\nroeg1Isdsiyue0AGSKtfDMDN4p5GloyPqreCeVrO2hYtEMzcKvnzvPUCt3eE6vkI\n6cdhwyPRNJd3bS1NcaYl6JP5wzPniQtqH2b4X26wV2Vb2G8XCWvhJRHsUgVzXrS7\nBy+t/NmLAgMBAAECggEAX3dmhIcplXtdVGXQTOqVvIiCC9O1uECOJbmwWYy2dgnl\nQI6NAZEsTow3/K4ehw6E8qwkIdETAiBIx/a5XCniHZlzPuGs7ihTA5dFrhWQPE+l\nzCIwdaaHDHFcA+d1HzAoPPMagqkLmvxVmbIAEXVjN7WoyyGyCUtKMZWeehfjS3Wl\n22Nlq16/n0f1W/xRfC4dvl5gKM6VHcrWw3Q49bYFqrBxcRp6kEk5DC/NprsTq5gK\n51CFMy/Ck5m2OQcYqwEE1EbiAfIlzv7Otaj7arlteP2SWJKXjPBbVOmcX0avZU2x\n9oLjKR2fF4Ke4gB5RmMvQksZ3xtk6d4oJpCHpwBLEQKBgQD7MSEY3YlHoLUX9yq2\nunVKPWoSWHJDD+YcEW06rOxuXrrfMYysVmXSF6/ooDo1jE68sSe52uu1Shih2u2Q\nyvo5/x5W5MFxmadcblkEKW8WlE8icBe5JBr99psBl/TON1bZIkhpDHdTfa7P5/Ly\nbtIAzZ9KfGmn1ClQx8JVq6cSPwKBgQDNs5+Axh/A/IgwNEUADBv2sUCXBasVjqU/\ntYZntg7mWVW2wX7XQKk+BaI8CXI2fkrdEl0phs7sqdWbWEmjvqgWgu8i+XknuGLU\n6DLnKfOOf3wqXqcH+kxdUYCZbXVp3gF6C88ulMWiFZ+pSOQWxZ0Afr/NdtWeV6Ww\n0LnTF6BNtQKBgAeatSXLjxxcAR94nBJsEqDsuwlTJCJjmNPAs03TblTpCT84gMm2\n095IWUrxjtGQLdIIiutVdU1HsPc1aXu4qVqYHpMC2dhWjnp93LQDjRlh5ANm4VD5\htepX4fs0bxscHSiVQ7ZEcO1SlWA8BnmwPTFRM08dvZdteJ8KaXuTGCBAoGBAMlM\nTHzyZcSv3H5/yD5hm0Pw9epUq7Xu4BvWgm8propLkbF1w/QudW6cg+LyNdgx18vbpV\n7EFlIT5MfTMGVRoey9Mr0uWBCWUrddwwVxAM58G9VD8KXZ7a/LwdtCFxEoPFs+BB\nikBlanpReuto33zBagFACGcDMc1ArG658/91kXQ5AoGBAPJ7DZQiLM10LqTpjAdt\nbE2WNLI9BnbEe8yi2RNXIKLIroQXYBNkA17VjdWimKgssDF4VvswWAbqip4BlZfn\ntwGb6+Zh94Y0xJGLPM+klxDZtzbnQdkt0ZZskxfeW5Cfnr5vPf/VqLjfySabFwv7\nD8jGS/vpusr7duPSXsoXa3Fl\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@empireland-5d335.iam.gserviceaccount.com",
  "client_id": "103391503121359308064",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40empireland-5d335.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// We'll import Vite dynamically only in development
// import { createServer as createViteServer } from "vite"; 

let db = null;
let lastInitError = null;

function getDb() {
  process.stderr.write(`[${new Date().toISOString()}] DEBUG: getDb() called. Current db state: ${!!db}\n`);
  if (!db) {
    try {
      process.stderr.write(`[${new Date().toISOString()}] DEBUG: Initializing Firebase Admin...\n`);
      
      // Handle potential ESM default export issues
      const firebaseAdmin = admin.default || admin;
      
      const apps = firebaseAdmin.apps || [];
      if (apps.length === 0) {
        // Normalize the private key to fix ASN.1 parsing errors
        const normalizedKey = serviceAccount.private_key.replace(/\\n/g, '\n').trim();
        
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert({
            ...serviceAccount,
            private_key: normalizedKey
          }),
        });
        process.stderr.write(`[${new Date().toISOString()}] DEBUG: Firebase Admin initialized successfully.\n`);
      } else {
        process.stderr.write(`[${new Date().toISOString()}] DEBUG: Firebase Admin already initialized.\n`);
      }
      db = firebaseAdmin.firestore();
      process.stderr.write(`[${new Date().toISOString()}] DEBUG: Firestore instance obtained.\n`);
    } catch (err) {
      lastInitError = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[${new Date().toISOString()}] ❌ DEBUG: Erro ao inicializar Firebase Admin: ${err}\n`);
      if (err instanceof Error) {
        process.stderr.write(`[${new Date().toISOString()}] DEBUG: Error message: ${err.message}\n`);
        process.stderr.write(`[${new Date().toISOString()}] DEBUG: Error stack: ${err.stack}\n`);
      }
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
