/**
 * Transcribes an audio File using OpenAI's Whisper API.
 * Accepts a File object directly — no disk read/write needed.
 * Retries up to 3 times on server errors or empty responses.
 */
export async function transcribeAudio(file: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Whisper: OPENAI_API_KEY not set.");
  }

  const maxAttempts = 3;
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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

      // 4xx errors are client-side — no point retrying
      if (response.status >= 400 && response.status < 500) {
        const error = await response.text();
        throw new Error(`Whisper API error ${response.status}: ${error}`);
      }

      if (!response.ok) {
        const error = await response.text();
        lastError = new Error(`Whisper API error ${response.status}: ${error}`);
        if (attempt < maxAttempts) {
          await sleep(2 ** attempt * 1000); // 2s, 4s
          continue;
        }
        throw lastError;
      }

      const transcript = await response.text();
      if (!transcript.trim()) {
        lastError = new Error("Whisper returned an empty transcript.");
        if (attempt < maxAttempts) {
          await sleep(2 ** attempt * 1000);
          continue;
        }
        throw lastError;
      }

      return transcript.trim();
    } catch (e) {
      // Re-throw immediately for 4xx or if it's the last attempt
      if (
        e instanceof Error &&
        (e.message.includes("error 4") || attempt === maxAttempts)
      ) {
        throw e;
      }
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxAttempts) {
        await sleep(2 ** attempt * 1000);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
