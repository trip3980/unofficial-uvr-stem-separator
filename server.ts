import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  
  if (apiKey) {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.error("Failed to initialize server-side Gemini:", e);
    }
  }

  // API Route: Server-side Gemini Lyric & Prompt generator
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, isCustom, songIdea } = req.body;

    if (!apiKey || !ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured inside server environments.",
      });
    }

    try {
      let promptText = "";
      if (isCustom) {
        promptText = `You are a professional songwriting assistant. Based on this song idea: "${songIdea || prompt}", write:
1. **Title**: An evocative, concise song title.
2. **Lyrics**: Structured songwriting lyrics including [Verse 1], [Chorus], [Verse 2], [Bridge], [Chorus]. Keep them poetic, structured, and emotionally resonant.
3. **Style Tags**: A list of 4-6 style tags/descriptors (e.g., "dark synthwave, cyber-melancholic, retro synthesizer, 110 bpm, emotional, male vocal"). Keep them comma-separated, under 50 characters total, suitable for an AI music prompt.

Your response MUST be wrapped in a clean JSON structure:
{
  "title": "Song Title Here",
  "lyrics": "Lyrics content here with linebreaks",
  "tags": "style tags list here"
}`;
      } else {
        promptText = `You are an AI music producer. Based on this song vibe: "${prompt}", help me write a Suno-compatible prompt under 200 characters that captures this essence, plus style tags and a title.

Your response MUST be wrapped in a clean JSON structure:
{
  "title": "Song Title",
  "prompt": "Optimized Suno prompt",
  "tags": "style tags descriptor"
}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      try {
        const jsonResult = JSON.parse(responseText.trim());
        res.json(jsonResult);
      } catch (err) {
        // Fallback if parsing failed
        res.json({
          rawText: responseText,
          title: "Synthesized Soundscape",
          lyrics: responseText,
          tags: "ambient electronica",
        });
      }
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI lyrics" });
    }
  });

  // API Route: CORS-friendly Proxy to let frontend route to suno-api (e.g. running on local port 8000 or custom IP)
  app.post("/api/suno/proxy", async (req, res) => {
    const { targetUrl, method, headers, body } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: "Missing targetUrl parameter" });
    }

    try {
      const fetchHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(headers || {}),
      };

      const fetchOptions: any = {
        method: method || "POST",
        headers: fetchHeaders,
      };

      if (body && (method || "POST") !== "GET") {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const backendResponse = await fetch(targetUrl, fetchOptions);
      const isJson = backendResponse.headers.get("content-type")?.includes("application/json");
      
      const responseData = isJson 
        ? await backendResponse.json() 
        : await backendResponse.text();

      res.status(backendResponse.status).send(responseData);
    } catch (proxyError: any) {
      console.error("Suno API Proxy Error:", proxyError);
      res.status(502).json({
        error: "Failed to communicate with Suno API server.",
        details: proxyError.message,
      });
    }
  });

  // API Route: Check FFmpeg availability on host server system
  app.get("/api/batch-encoder/check-ffmpeg", (req, res) => {
    exec("ffmpeg -version", (error, stdout) => {
      if (error) {
        res.json({ available: false, version: null, path: "Not detected on host PATH" });
      } else {
        const firstLine = stdout.split("\n")[0];
        res.json({ available: true, version: firstLine, path: "System Environment PATH" });
      }
    });
  });

  // Vite development or production serving
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
    console.log(`[OpenStem Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
