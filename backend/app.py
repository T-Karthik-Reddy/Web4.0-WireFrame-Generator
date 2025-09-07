import os
import json
import uvicorn
import re
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

# --- Pydantic Models for Data Validation (matching types.ts) ---
class FileNode(BaseModel):
    name: str
    content: str

class ChatMessage(BaseModel):
    role: str
    text: str
    image: Optional[str] = None

class GenerateRequest(BaseModel):
    existing_files: List[FileNode]
    chat_history: List[ChatMessage]

# --- FastAPI App Initialization ---
load_dotenv()
app = FastAPI()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Gemini API Configuration ---
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
except KeyError:
    raise RuntimeError("GEMINI_API_KEY not found in .env file. Please create a .env file.")

# --- The Intelligent System Prompt ---
system_instruction = """
You are an expert web developer AI. Your task is to generate and modify code for a web project based on user requests. You will be given the user's prompt and the current project files, if any.

- If there are no existing files, your task is to act as a wireframe generator. You must output HTML and CSS code for a simple black-and-white wireframe layout of the website described by the user.
  - Use only boxes, div outlines, nav bars, and placeholders for text and images.
  - Do not use colors or actual content. Use labels like [Logo], [Nav], [Hero Image], [Text Box], etc.
  - Generate minimal and clean HTML + CSS.

- If there are existing files, modify them according to the user's request. You can add new files, update the content of existing ones, or remove files by omitting them from your response.

CRITICAL: You MUST return the COMPLETE and UPDATED list of ALL project files in your response. This includes files that were not changed. The entire project state should be represented in your output.

The output format MUST be a single JSON object with two keys:
1. "explanation": A friendly, conversational summary of the changes you made. Briefly explain what you understood from the user's request and how you addressed it in the code.
2. "files": An array of file objects, where each object has 'name' and 'content' properties.

Ensure the HTML file correctly links to any CSS and JS files using relative paths.
"""

# --- API Endpoint ---
@app.post("/generate")
async def generate_code(request: GenerateRequest):
    if not request.chat_history:
        raise HTTPException(status_code=400, detail="Chat history cannot be empty.")

    try:
        latest_message = request.chat_history[-1]
        prompt_text = latest_message.text

        if request.existing_files:
            existing_files_dict = [file.dict() for file in request.existing_files]
            prompt_text = (
                "Here are the current project files:\n\n"
                f"{json.dumps(existing_files_dict, indent=2)}\n\n"
                f"Now, considering our conversation history, please apply this new request: '{latest_message.text}'"
            )

        content_parts = [{"text": prompt_text}]

        if latest_message.image:
            match = re.match(r"data:(.+);base64,(.+)", latest_message.image)
            if match:
                mime_type, base64_data = match.groups()
                content_parts.insert(0, {
                    "inline_data": {"mime_type": mime_type, "data": base64_data}
                })

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system_instruction
        )

        model_history = []
        for msg in request.chat_history[:-1]:
            role = "user" if msg.role == "user" else "model"
            parts = []
            if msg.image:
                match = re.match(r"data:(.+);base64,(.+)", msg.image)
                if match:
                    mime_type, base64_data = match.groups()
                    parts.append({"inline_data": {"mime_type": mime_type, "data": base64_data}})
            if msg.text:
                parts.append({"text": msg.text})
            
            if parts:
                 model_history.append({"role": role, "parts": parts})

        chat_session = model.start_chat(history=model_history)

        response = await chat_session.send_message_async(
            content_parts,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )

        parsed_response = json.loads(response.text)
        return parsed_response

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="The AI returned an invalid JSON response.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)