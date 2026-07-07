import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ''
  });

  // API Routes
  app.post("/api/ai/generate-questions", async (req, res) => {
    const { material, count, image } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    }

    try {
      const promptText = `Buatkan ${count || 5} soal pilihan ganda berdasarkan materi berikut: ${material || 'Materi ada pada gambar'}. 
        Setiap soal harus memiliki 5 pilihan jawaban (A, B, C, D, E) dan kunci jawaban yang benar.`;

      let input: any = promptText;

      if (image) {
        input = [
          {
            type: "text",
            text: promptText
          },
          {
            type: "image",
            data: image.split(',')[1],
            mime_type: "image/jpeg"
          }
        ];
      }

      const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash",
        input,
        response_format: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Teks pertanyaan" },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Daftar 5 pilihan jawaban (A, B, C, D, E)"
              },
              correctAnswer: { 
                type: Type.INTEGER, 
                description: "Index kunci jawaban (0 untuk A, 1 untuk B, dst)" 
              }
            },
            required: ["text", "options", "correctAnswer"]
          }
        }
      });

      const lastStep = interaction.steps.at(-1);
      let jsonStr = '';
      if (lastStep && lastStep.type === 'model_output') {
        const textContent = lastStep.content?.find(c => c.type === 'text');
        if (textContent) {
          jsonStr = textContent.text.trim();
        }
      }
      
      if (!jsonStr) {
        throw new Error("No response from AI");
      }

      const questions = JSON.parse(jsonStr);
      res.json({ questions });
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate questions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
