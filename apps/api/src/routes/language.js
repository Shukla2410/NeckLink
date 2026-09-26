import express from "express";
import { languageTask, bhashiniReady } from "../services/bhashiniService.js";
const router = express.Router();
const languages = ["en", "hi", "as", "kha", "lus", "mni", "brx"];
router.get("/status", (req, res) =>
  res.json({
    configured: bhashiniReady(),
    languages,
    notice:
      "Task and language availability is checked with the configured provider.",
  }),
);
router.post("/speak", async (req, res, next) => {
  try {
    const { text, language = "en" } = req.body;
    if (
      !languages.includes(language) ||
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 2000
    )
      return res
        .status(400)
        .json({
          message:
            "Enter a message under 2000 characters and a supported language",
        });
    const result = await languageTask("tts", language, null, {
      input: [{ source: text }],
    });
    const audio = result.audio?.[0]?.audioContent;
    if (!audio) throw new Error("No audio was returned");
    res.json({ audio, format: result.config?.audioFormat || "wav" });
  } catch (e) {
    next(e);
  }
});
router.post("/transcribe", async (req, res, next) => {
  try {
    const { audio, language = "en", format = "wav" } = req.body;
    if (
      !languages.includes(language) ||
      typeof audio !== "string" ||
      audio.length > 4000000 ||
      !["wav", "flac", "mp3", "webm", "ogg"].includes(format)
    )
      return res.status(400).json({ message: "Invalid recording" });
    const result = await languageTask(
      "asr",
      language,
      null,
      { audio: [{ audioContent: audio }] },
      { audioFormat: format, samplingRate: 16000 },
    );
    res.json({ text: result.output?.[0]?.source || "" });
  } catch (e) {
    next(e);
  }
});
export default router;
