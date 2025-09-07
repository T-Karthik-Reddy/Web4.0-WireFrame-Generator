import { GoogleGenAI, Type } from "@google/genai";
import { FileNode, ChatMessage, GeminiCodeResponse } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const codeGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    explanation: {
      type: Type.STRING,
      description: "A friendly, conversational summary of the changes made. Explain what you understood from the user's request and how you addressed it in the code."
    },
    files: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The full filename, e.g., 'index.html' or 'style.css'",
          },
          content: {
            type: Type.STRING,
            description: "The complete code content for the file.",
          },
        },
        required: ["name", "content"],
      },
    }
  },
  required: ["explanation", "files"],
};

const systemInstruction = `You are an expert web developer AI. Your task is to generate and modify code for a web project based on user requests. You will be given the user's prompt and the current project files, if any and Use web search and get/use latest layouts.

- If there are no existing files, your task is to act as a wireframe generator. You must output HTML and CSS code for a simple black-and-white wireframe layout of the website described by the user.
  - Use only boxes, div outlines, nav bars, and placeholders for text and images.
  - Do not use colors or actual content. Use labels like [Logo], [Nav], [Hero Image], [Text Box], etc.
  - Generate minimal and clean HTML + CSS.

- If there are existing files, modify them according to the user's request. You can add new files, update the content of existing ones, or remove files by omitting them from your response.

- If the user provides a JSON object of design tokens, you MUST update the CSS to use the values defined in the tokens (e.g., for colors, fonts, spacing). Prefer creating CSS variables in a \`:root\` selector.

CRITICAL: You MUST return the COMPLETE and UPDATED list of ALL project files in your response. This includes files that were not changed. The entire project state should be represented in your output.

The output format MUST be a single JSON object with two keys:
1. "explanation": A friendly, conversational summary of the changes you made. Briefly explain what you understood from the user's request and how you addressed it in the code.
2. "files": An array of file objects, where each object has 'name' and 'content' properties.

Ensure the HTML file correctly links to any CSS and JS files using relative paths.`;

const followUpSystemInstruction = `You are an expert web developer AI acting as a helpful assistant. Your goal is to help the user build out their wireframe step-by-step.
You will be given the user's most recent request and the explanation of the code you just generated to fulfill that request.
Based on this context, your task is to ask two single, concise, and relevant follow-up question.
This question should suggest a logical next step or a common feature related to the user's request.
For example, if the user just added a navigation bar, you could ask, "Great! Now, would you like me to add some navigation links like 'Home', 'About', and 'Contact' to the header?".
If the user just created a basic layout, you might ask, "Would you like to add a hero section with a call-to-action button to grab visitors' attention?".

IMPORTANT RULES:
- Only ask TWO question.
- Keep the question short and to the point.
- Dont ask static questions like " do you want to change text or nav links ", focus on layout and structure.
- Do NOT generate any code.
- Do NOT explain what you did before. The user has already seen the explanation.
- Frame the question as a helpful suggestion.
- Your entire response should be just the question itself, nothing else.`;


export const generateCodeFromPrompt = async (existingFiles: FileNode[], fullChatHistory: ChatMessage[]): Promise<GeminiCodeResponse> => {
  try {
    const contents = fullChatHistory
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .map((msg, index, arr) => {
            const isLastMessage = index === arr.length - 1;
            
            const parts: any[] = [];
            
            if (msg.image) {
                const match = msg.image.match(/^data:(.+);base64,(.+)$/);
                if (match) {
                    const [, mimeType, base64] = match;
                    parts.push({ inlineData: { mimeType, data: base64 } });
                }
            }
            
            let messageText = msg.text;
            // For the last user message, prepend the file context.
            if (isLastMessage && msg.role === 'user') {
                if (existingFiles.length > 0) {
                    const fileContext = `Here are the current files in the project:\n\n${JSON.stringify(existingFiles)}\n\nNow, please apply this change:\n\nUser request: "${msg.text}"`;
                    messageText = fileContext;
                } else {
                    messageText = `User request: "${msg.text}"`;
                }
            }

            if (messageText) {
                parts.push({ text: messageText });
            }
            
            return { role: msg.role, parts };
        });

    if (contents.length === 0) {
        throw new Error("no valid messages");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: codeGenerationSchema,
      },
    });

    let jsonString = response.text.trim();
    const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/s);
    if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
    }

    const result = JSON.parse(jsonString) as GeminiCodeResponse;
    
    if (!result || !Array.isArray(result.files) || typeof result.explanation !== 'string') {
        throw new Error("ai did not return the expected object");
    }

    return result;

  } catch (error) {
    console.error("error generating code from gemini:", error);
    if (error instanceof Error) {
        if (error.message.toLowerCase().includes('json')) {
            throw new Error('The ai returned an invalid response,please try modifying your prompt');
        }
        throw new Error(`Failed to generate code: ${error.message}`);
    }
    throw new Error("nknown error occurred");
  }
};

export const generateFollowUpQuestion = async (lastUserPrompt: string, lastModelExplanation: string): Promise<string> => {
    try {
        const contents = [
            {
                role: 'user',
                parts: [{ text: `CONTEXT:\n- The user's last request was: "${lastUserPrompt}"\n- The summary of the work I just completed is: "${lastModelExplanation}"\n\nBased on this context, provide one follow-up question.` }]
            }
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction: followUpSystemInstruction,
            },
        });

        return response.text.trim();

    } catch (error) {
        console.error("error generating followup question:", error);
        return "";
    }
};