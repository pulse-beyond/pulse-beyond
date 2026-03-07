/**
 * Transcribes an audio File using OpenAI's Whisper API.
 * Accepts a File object directly — no disk read/write needed.
 * Returns the transcript text, or null if transcription fails.
 */
export async function transcribeAudio(file: File): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Whisper: OPENAI_API_KEY not set, skipping transcription.");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("file", file, file.name);
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
        signal: AbortSignal.timeout(60000),
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
