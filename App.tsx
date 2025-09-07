import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { toPng } from 'html-to-image';
import { ChatMessage, FileNode, UploadedFile, ViewMode, ResponsiveMode } from './types';
import { generateCodeFromPrompt, generateFollowUpQuestion } from './services/geminiService';
import ChatPanel from './components/ChatPanel';
import CodePreviewToggle from './components/CodePreviewToggle';
import FileExplorerPanel from './components/FileExplorerPanel';
import ContentViewPanel from './components/ContentViewPanel';
import Resizer from './components/Resizer';
import ResponsiveViewToggle from './components/ResponsiveViewToggle';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ImageIcon } from './components/icons/ImageIcon';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [isMiddleColumnVisible, setIsMiddleColumnVisible] = useState(true);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! Describe the website you want to build. You can also upload a wireframe.' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(Math.min(500, window.innerWidth * 0.33));
  const [middlePanelWidth, setMiddlePanelWidth] = useState(256);
  const [responsiveMode, setResponsiveMode] = useState<ResponsiveMode>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);


  const handleToggleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setIsMiddleColumnVisible(mode === 'code');
  }, []);

  const handleSendPrompt = useCallback(async (prompt: string, imageFile: UploadedFile | null) => {
    if (!prompt && !imageFile) return;

    setIsLoading(true);
    const userMessage: ChatMessage = { role: 'user', text: prompt };
    if (imageFile) {
      userMessage.image = `data:${imageFile.type};base64,${imageFile.base64}`;
    }
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await generateCodeFromPrompt(files, updatedMessages);
      setFiles(response.files);
      
      const newFileNames = new Set(response.files.map(f => f.name));
      if (!selectedFileName || !newFileNames.has(selectedFileName)) {
          setSelectedFileName(response.files[0]?.name || null);
      }

      setMessages(prev => [...prev, { role: 'model', text: response.explanation }]);

      if (response.files.length > 0) {
        setViewMode('code');
        setIsMiddleColumnVisible(true);
      }

      const followUpQuestion = await generateFollowUpQuestion(prompt, response.explanation);
      if (followUpQuestion) {
          const followUpMessage: ChatMessage = { role: 'model', text: followUpQuestion };
          setMessages(prev => [...prev, followUpMessage]);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages(prev => [...prev, { role: 'error', text: `Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [files, messages, selectedFileName]);

  const handleSilentPrompt = useCallback(async (prompt: string, showExplanationInChat = true) => {
    if (!prompt) return;
    setIsLoading(true);

    const userMessage: ChatMessage = { role: 'user', text: prompt };
    const historyForAI = [...messages, userMessage];

    try {
        const response = await generateCodeFromPrompt(files, historyForAI);
        setFiles(response.files);
        
        const newFileNames = new Set(response.files.map(f => f.name));
        if (!selectedFileName || !newFileNames.has(selectedFileName)) {
            setSelectedFileName(response.files[0]?.name || null);
        }

        if (showExplanationInChat) {
          setMessages(prev => [...prev, { role: 'model', text: response.explanation }]);
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setMessages(prev => [...prev, { role: 'error', text: `Error: ${errorMessage}` }]);
    } finally {
        setIsLoading(false);
    }
  }, [files, messages, selectedFileName]);
  
  const handleResponsiveViewChange = useCallback((newMode: ResponsiveMode) => {
    if (newMode === responsiveMode) return;
    
    setResponsiveMode(newMode);

    if (files.length === 0) return;

    const prompt = newMode === 'mobile'
        ? `Please make the current design fully responsive and optimized for a mobile viewport (375px wide). Add CSS media queries where appropriate.`
        : `Please ensure the current design is optimized for a desktop viewport, while preserving the existing mobile-responsive styles.`;

    handleSilentPrompt(prompt, false);
  }, [responsiveMode, files, handleSilentPrompt]);

  const handleDownloadZip = useCallback(async () => {
    if (files.length === 0) return;

    const zip = new JSZip();
    files.forEach(file => {
        zip.file(file.name, file.content);
    });

    try {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'ui-project.zip');
    } catch (error) {
        console.error("Error creating ZIP file:", error);
        setMessages(prev => [...prev, { role: 'error', text: 'Error: Could not create ZIP file.' }]);
    }
  }, [files]);

  const handleDownloadImage = useCallback(async () => {
    if (viewMode !== 'preview' || !iframeRef.current || !iframeRef.current.contentWindow) {
      console.error("Preview iframe is not available for capture.");
      setMessages(prev => [...prev, { role: 'error', text: 'Error: Switch to Preview mode to capture an image.' }]);
      return;
    }

    try {
      const dataUrl = await toPng(iframeRef.current.contentWindow.document.documentElement, {
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = 'website-preview.png';
      link.href = dataUrl;
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setMessages(prev => [...prev, { role: 'error', text: `Error: Could not generate image. ${errorMessage}` }]);
    }
  }, [viewMode]);

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
        const { type, selector, transform } = event.data;

        if (type === 'element-dragged' && selector && transform) {
            const prompt = `The user dragged the element with CSS selector "${selector}". Please update the CSS to apply the style "transform: ${transform};". IMPORTANT: Only add or modify the 'transform' property for this specific selector, preserving all other styles. If a transform property already exists, update it.`;
            handleSilentPrompt(prompt, false);
        }
    };

    window.addEventListener('message', handleIframeMessage);

    return () => {
        window.removeEventListener('message', handleIframeMessage);
    };
  }, [handleSilentPrompt]);
  
  const selectedFile = useMemo(() => {
    if (!selectedFileName) return null;
    return files.find(f => f.name === selectedFileName) || null;
  }, [files, selectedFileName]);

  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        const minWidth = 320;
        const maxWidth = window.innerWidth - 300;
        setLeftPanelWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleUp = () => {
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [leftPanelWidth]);

  const handleMouseDownMiddle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    const startX = e.clientX;
    const startWidth = middlePanelWidth;

    const handleMove = (moveEvent: MouseEvent) => {
        const newWidth = startWidth + (moveEvent.clientX - startX);
        const minWidth = 150;
        const maxWidth = window.innerWidth - leftPanelWidth - 200;
        setMiddlePanelWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleUp = () => {
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [middlePanelWidth, leftPanelWidth]);

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800 font-sans overflow-hidden">
      <aside 
        style={{ width: `${leftPanelWidth}px` }}
        className="flex flex-col bg-white p-4 flex-shrink-0 border-r border-gray-200 shadow-md"
      >
        <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">UIX AI Builder</h1>
        </div>
        <ChatPanel 
            messages={messages} 
            onSendPrompt={handleSendPrompt} 
            isLoading={isLoading} 
            hasFiles={files.length > 0}
        />
      </aside>

      <Resizer onMouseDown={handleMouseDownLeft} />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-shrink-0 p-3 bg-white border-b border-gray-200 flex justify-between items-center">
            <div className="flex-1 flex justify-start items-center space-x-2">
              <button
                  onClick={handleDownloadZip}
                  disabled={files.length === 0}
                  className="p-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200 bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download project as .zip"
              >
                  <DownloadIcon className="h-5 w-5 mr-2" />
                  Download Code
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={files.length === 0 || viewMode !== 'preview'}
                className="p-2 rounded-md text-sm font-medium flex items-center transition-colors duration-200 bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download preview as .png"
              >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Download Image
              </button>
            </div>
            <div className="flex-1 flex justify-center">
              <CodePreviewToggle viewMode={viewMode} onToggle={handleToggleViewMode} />
            </div>
            <div className="flex-1 flex justify-end">
              {viewMode === 'preview' && files.length > 0 && (
                <ResponsiveViewToggle mode={responsiveMode} onToggle={handleResponsiveViewChange} />
              )}
            </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
            {isMiddleColumnVisible && (
              <>
                <nav 
                    style={{ width: `${middlePanelWidth}px`}}
                    className="bg-slate-50 overflow-y-auto flex-shrink-0"
                >
                    <FileExplorerPanel
                        files={files}
                        selectedFile={selectedFile}
                        onSelectFile={(file) => setSelectedFileName(file.name)}
                    />
                </nav>
                <Resizer onMouseDown={handleMouseDownMiddle} />
              </>
            )}
            <div className="flex-1 flex flex-col bg-white min-w-0">
              <ContentViewPanel
                ref={iframeRef}
                viewMode={viewMode}
                files={files}
                selectedFile={selectedFile}
                responsiveMode={responsiveMode}
              />
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;