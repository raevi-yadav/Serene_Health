import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set payload sizes to handle base64 image uploads
  app.use(express.json({ limit: "15mb" }));

  // API Route for Gemini-powered nutrition label OCR
  app.post("/api/meal-ocr", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing imageBase64 or mimeType representation" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on this server container." });
      }

      // Initialize GoogleGenAI SDK with headers setup as per instructions
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `You are a nutrition expert and OCR reader.
Analyze this uploaded food packaging, nutrition facts label, or nutritional table image.
Extract the relevant fields and structure them strictly into valid JSON format.
Ensure you find or calculate the parameters PER serving (or per 100g if serving size is unspecified):
1. name: A simple food/meal name (clean and short, e.g. "Chobani Blueberry Yogurt", "Organic Oats").
2. servingSizeGrams: The serving weights in grams (e.g., if one serving is 150g, return 150. If unnamed or only listed in fl oz/ml/pieces, convert/estimate in grams, or default to 100).
3. energyKcal: Estimated calories per serving (in kcal).
4. proteinGrams: Protein in grams per serving.
5. carbsGrams: Total carbohydrates in grams per serving.
6. fatGrams: Total fat in grams per serving.
7. sodiumMg: Sodium in milligrams (mg) per serving. Return 0 if not listed.
8. potassiumMg: Potassium in milligrams (mg) per serving. Return 0 if not listed.
9. fiberGrams: Dietary fiber in grams per serving. Return 0 if not listed.
10. sugarGrams: Total sugar in grams per serving. Return 0 if not listed.

Only return a clean JSON object containing these keys. Do not return markdown wraps other than pure JSON output format.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              servingSizeGrams: { type: Type.NUMBER },
              energyKcal: { type: Type.NUMBER },
              proteinGrams: { type: Type.NUMBER },
              carbsGrams: { type: Type.NUMBER },
              fatGrams: { type: Type.NUMBER },
              sodiumMg: { type: Type.NUMBER },
              potassiumMg: { type: Type.NUMBER },
              fiberGrams: { type: Type.NUMBER },
              sugarGrams: { type: Type.NUMBER },
            },
            required: ["name", "servingSizeGrams", "energyKcal", "proteinGrams", "carbsGrams", "fatGrams"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Received empty text response from Gemini model scanning process.");
      }

      const parsed = JSON.parse(text.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Meal OCR error in server endpoint:", error);
      res.status(500).json({ error: error.message || "Failed to scan and parse label information." });
    }
  });

  // Hot module and dev/prod serving setup
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
    console.log(`Express node container listening on port ${PORT}`);
  });
}

startServer();
