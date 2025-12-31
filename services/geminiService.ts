
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysis, Track } from "../types";

// Fixed: Always use direct process.env.API_KEY for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTrack = async (track: Track): Promise<GeminiAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the mood and musical properties of this song (based on title and artist): "${track.name}" by ${track.artist}. The album is "${track.album}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vibe: { type: Type.STRING, description: "A one-word mood for the track." },
            genres: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "A list of relevant sub-genres."
            },
            description: { type: Type.STRING, description: "A short, poetic description of what this song feels like." },
            suggestedActivities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Activities that match this song's energy."
            }
          },
          required: ["vibe", "genres", "description", "suggestedActivities"]
        }
      }
    });

    // Fixed: Accessed .text property directly (it's a getter, not a method)
    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      vibe: "Unknown",
      genres: ["Music"],
      description: "Unable to analyze track at this time.",
      suggestedActivities: ["Listening"]
    };
  }
};

export const generatePlaylistAdvice = async (history: Track[]): Promise<string> => {
  const titles = history.map(t => t.name).join(", ");
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on this listening history: [${titles}], provide a one-sentence recommendation for what the user might enjoy next from a similar aesthetic.`,
  });
  // Fixed: Accessed .text property directly
  return response.text || "Keep the vibes going!";
};
