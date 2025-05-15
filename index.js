
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 10000;
const upload = multer({ dest: 'uploads/' });

app.post('/pdf/analyze', upload.fields([{ name: 'file' }, { name: 'image' }]), async (req, res) => {
  const pdfFile = req.files['file']?.[0];
  const imageFile = req.files['image']?.[0];

  if (!pdfFile && !imageFile) {
    return res.status(400).send('Keine Datei empfangen.');
  }

  let ocrText = '';

  if (pdfFile) {
    const dataBuffer = fs.readFileSync(pdfFile.path);
    try {
      const pdfData = await pdfParse(dataBuffer);
      ocrText = pdfData.text;
    } catch (e) {
      ocrText = 'Fehler beim PDF-Parsing: ' + e.message;
    }
    fs.unlinkSync(pdfFile.path);
  }

  // Falls PDF fehlgeschlagen ist, versuche Bild-OCR
  if (!ocrText.trim() && imageFile) {
    const worker = await createWorker('deu', 1, {
      logger: m => console.log(m)
    });
    await worker.loadLanguage('deu');
    await worker.initialize('deu');
    const { data: { text } } = await worker.recognize(imageFile.path);
    ocrText = text;
    await worker.terminate();
    fs.unlinkSync(imageFile.path);
  }

  const qty = req.body.qty || 1;
  const material = req.body.material || 'aluminium';
  const targetPrice = req.body.targetPrice || null;

  res.send(
    `📄 OCR-Textauszug:

${ocrText.substring(0, 1000)}...

` +
    `📦 Stückzahl: ${qty}
🧱 Material: ${material}
🎯 Zielpreis: ${targetPrice || '-'}`
  );
});

app.listen(port, () => {
  console.log(`📊 Backend läuft auf Port ${port}`);
});
