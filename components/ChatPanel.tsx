import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { ChatMessage, UploadedFile } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { XIcon } from './icons/XIcon';
import { TokenIcon } from './icons/TokenIcon';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendPrompt: (prompt: string, imageFile: UploadedFile | null) => void;
  isLoading: boolean;
  hasFiles: boolean;
}

const suggestionPrompts = [
    "Make the header sticky.",
    "Increase the font size of all paragraphs.",
    "Add a dark mode toggle.",
    "Change the primary color to a shade of green.",
    "Add a three-column layout for the services section.",
    "Make the hero image full-width.",
    "Add a contact form with name, email, and message fields.",
    "Animate the navigation links on hover.",
    "Make the website more mobile-friendly.",
    "Add a footer with social media icons.",
    "Increase the spacing between sections.",
    "Use a more modern font for the headings.",
    "Round the corners of all buttons.",
    "Add a gallery section with 6 placeholder images.",
    "Create a pricing table with three tiers.",
    "Add a hero section with a call-to-action button.",
    "Change the background color of the body.",
    "Increase the hero div height."
];

const defaultTokenJson = JSON.stringify({
    "colors": {
      "primary": "#5E35B1",
      "secondary": "#EC4899",
      "background": "#FFFFFF",
      "text": "#111827",
      "text-muted": "#6B7280"
    },
    "fonts": {
      "heading": "Georgia, serif",
      "body": "'Helvetica Neue', sans-serif"
    },
    "spacing": {
      "small": "8px",
      "medium": "16px",
      "large": "32px"
    },
    "radii": {
        "default": "8px",
        "full": "9999px"
    }
  }, null, 2);

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendPrompt, isLoading, hasFiles }) => {
  const [inputText, setInputText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenJson, setTokenJson] = useState(defaultTokenJson);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isTokenJsonValid = useMemo(() => {
    if (!tokenJson.trim()) return false;
    try {
        JSON.parse(tokenJson);
        return true;
    } catch {
        return false;
    }
  }, [tokenJson]);

  useEffect(() => {
    if (!hasFiles) {
      setSuggestions([]);
      return;
    }
    
    const shuffled = [...suggestionPrompts].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 5));
  }, [hasFiles, messages]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        setUploadedFile({ name: file.name, type: file.type, base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = () => {
    if (isLoading || (!inputText.trim() && !uploadedFile)) return;
    onSendPrompt(inputText, uploadedFile);
    setInputText('');
    setUploadedFile(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleApplyTokens = () => {
    if (isLoading || !isTokenJsonValid) return;
    const prompt = `Please apply the following design tokens to the website. Update the CSS files to use these values, preferably by creating CSS variables in a :root selector. Here are the tokens:\n\n\`\`\`json\n${tokenJson}\n\`\`\``;
    onSendPrompt(prompt, null);
    setShowTokenInput(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    textAreaRef.current?.focus();
  };
  
  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-xl p-3 rounded-2xl ${
                msg.role === 'user' ? 'btn-gradient text-white' : 
                msg.role === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 
                'bg-slate-100 text-gray-800'
            }`}>
              {msg.image && <img src={msg.image} alt="user upload" className="rounded-md mb-2 max-h-48" />}
              <p className="whitespace-pre-wrap text-base">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start">
                <div className="max-w-xl p-3 rounded-2xl bg-slate-100 text-gray-800 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mr-3"></div>
                    <span className="text-base">Generating...</span>
                </div>
            </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        {hasFiles && !isLoading && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 justify-start">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded-full text-base hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {showTokenInput && (
            <div className="mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg transition-all duration-300">
                <label className="block text-sm font-medium text-gray-700 mb-1">Design Tokens (JSON)</label>
                <textarea
                    value={tokenJson}
                    onChange={(e) => setTokenJson(e.target.value)}
                    className={`w-full h-32 p-2 border rounded-md font-mono text-xs shadow-inner ${isTokenJsonValid ? 'border-gray-300' : 'border-red-400 focus:ring-red-500'}`}
                    placeholder="Paste your design token JSON here..."
                    spellCheck="false"
                />
                <button
                    onClick={handleApplyTokens}
                    disabled={isLoading || !isTokenJsonValid}
                    className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:bg-indigo-400"
                >
                    Apply Tokens
                </button>
            </div>
        )}
        {uploadedFile && (
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 mb-2 flex items-center justify-between text-base">
                <div className="flex items-center text-gray-700">
                    <PaperClipIcon className="h-4 w-4 mr-2"/>
                    <span className="truncate">{uploadedFile.name}</span>
                </div>
                <button onClick={() => setUploadedFile(null)} className="text-gray-500 hover:text-gray-800" disabled={isLoading}>
                    <XIcon className="h-4 w-4"/>
                </button>
            </div>
        )}
        <div className="flex items-center w-full border border-gray-200 rounded-full bg-white focus-within:ring-2 focus-within:ring-indigo-400">
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:text-indigo-600 rounded-full transition-colors disabled:opacity-50"
                aria-label="Upload file"
                disabled={isLoading}
            >
                <PlusIcon className="h-6 w-6" />
            </button>
            <button
                onClick={() => setShowTokenInput(prev => !prev)}
                className={`p-3 rounded-full transition-colors disabled:opacity-50 ${showTokenInput ? 'text-indigo-600 bg-indigo-100' : 'text-gray-500 hover:text-indigo-600'}`}
                aria-label="Apply design tokens"
                disabled={isLoading || !hasFiles}
                title="Apply design tokens"
            >
                <TokenIcon className="h-5 w-5" />
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf"
                disabled={isLoading}
            />
            <textarea
                ref={textAreaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isLoading ? "Generating..." : "Message UIX AI Builder..."}
                className="flex-1 w-full resize-none bg-transparent py-3 pr-3 text-base text-gray-800 placeholder-gray-500 focus:outline-none"
                rows={1}
                style={{maxHeight: '120px'}}
                disabled={isLoading}
            />
            <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputText.trim() && !uploadedFile)}
                className="m-1.5 p-2.5 rounded-full text-white disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 btn-gradient disabled:bg-none"
                aria-label="Send message"
            >
                <ArrowUpIcon className="h-6 w-6" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;