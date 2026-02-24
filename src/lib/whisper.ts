import { readFile } from "fs/promises";

/**
 * Transcribes an audio file using OpenAI's Whisper API.
 * Returns the transcript text, or null if transcription fails.
 */
export async function transcribeAudio(filepath: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Whisper: OPENAI_API_KEY not set, skipping transcription.");
    return null;
  }

  try {
    const fileBuffer = await readFile(filepath);

    // Determine the filename and mime type
    const ext = filepath.split(".").pop()?.toLowerCase() || "webm";
    const mimeTypes: Record<string, string> = {
      webm: "audio/webm",
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
      mp4: "audio/mp4",
      wav: "audio/wav",
      ogg: "audio/ogg",
      flac: "audio/flac",
    };
    const mimeType = mimeTypes[ext] || "audio/webm";

    // Build multipart form data
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, `audio.${ext}`);
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(60000), // 60s timeout for longer recordings
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Whisper API error:", response.status, error);
      return null;
    }

    const transcript = await response.text();
    return transcript.trim() || null;
  } catch (error) {
    console.error("Whisper transcription failed:", error);
    return null;
  }
}
