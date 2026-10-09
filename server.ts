import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Persistence file
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'forms.json');

export interface AdhesionForm {
  id: string;
  clientName: string;
  status: 'Pendiente' | 'Firmado';
  createdAt: string; // ISO string
  signedAt?: string;
  dni?: string;
  cardType?: string; // VISA, MASTERCARD, etc.
  cardNumber?: string;
  cardExpiry?: string;
  bank?: string;
  acceptedTerms?: boolean;
  signatureDataUrl?: string;
  clarification?: string;
}

let forms: AdhesionForm[] = [];

function loadData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      forms = JSON.parse(content);
    } else {
      forms = [];
      saveData();
    }
  } catch (err) {
    console.warn('Error reading data file:', err);
    forms = [];
  }
}

function saveData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(forms, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

loadData();

// API routes
app.get('/api/forms', (req, res) => {
  res.json({ success: true, forms });
});

app.get('/api/forms/:id', (req, res) => {
  const form = forms.find(f => f.id === req.params.id);
  if (!form) {
    return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
  }
  res.json({ success: true, form });
});

app.post('/api/forms', (req, res) => {
  const { clientName, dni, id, status, createdAt } = req.body;
  if (!clientName || !clientName.trim()) {
    return res.status(400).json({ success: false, message: 'El nombre y apellido es obligatorio' });
  }

  const uniqueId = id || ('avera-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36));
  const newForm: AdhesionForm = {
    id: uniqueId,
    clientName: clientName.trim().toUpperCase(),
    dni: dni ? String(dni).replace(/\D/g, '').slice(0, 8) : undefined,
    status: status || 'Pendiente',
    createdAt: createdAt || new Date().toISOString(),
  };

  // Evitar duplicados si ya vino con ID
  const existingIdx = forms.findIndex(f => f.id === uniqueId);
  if (existingIdx !== -1) {
    forms[existingIdx] = { ...forms[existingIdx], ...newForm };
  } else {
    forms.unshift(newForm);
  }
  saveData();
  res.status(201).json({ success: true, form: newForm });
});

app.put('/api/forms/:id/sign', (req, res) => {
  const form = forms.find(f => f.id === req.params.id);
  if (!form) {
    return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
  }

  const {
    dni,
    cardType,
    cardNumber,
    cardExpiry,
    bank,
    acceptedTerms,
    signatureDataUrl,
    clarification,
    clientName,
  } = req.body;

  if (!dni || !cardNumber || !cardExpiry || !bank || !acceptedTerms || !signatureDataUrl || !clarification) {
    return res.status(400).json({
      success: false,
      message: 'Información incompleta, Completar para enviar',
    });
  }

  form.dni = String(dni).replace(/\D/g, '').slice(0, 8);
  form.cardType = cardType || 'TARJETA DE CRÉDITO';
  form.cardNumber = String(cardNumber).trim();
  form.cardExpiry = String(cardExpiry).trim();
  form.bank = String(bank).trim().toUpperCase();
  form.acceptedTerms = Boolean(acceptedTerms);
  form.signatureDataUrl = signatureDataUrl;
  form.clarification = String(clarification).trim().toUpperCase();
  if (clientName && clientName.trim()) {
    form.clientName = clientName.trim().toUpperCase();
  }
  form.status = 'Firmado';
  form.signedAt = new Date().toISOString();

  saveData();
  res.json({ success: true, form });
});

app.delete('/api/forms/:id', (req, res) => {
  const index = forms.findIndex(f => f.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Formulario no encontrado' });
  }
  forms.splice(index, 1);
  saveData();
  res.json({ success: true });
});

app.post('/api/forms/reset-seed', (req, res) => {
  forms = [];
  saveData();
  res.json({ success: true, forms: [] });
});

// Vite Middleware integration
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
