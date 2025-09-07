import React, { useMemo, forwardRef } from 'react';
import { FileNode, ViewMode, ResponsiveMode } from '../types';
import { draggabilityScript } from '../services/draggability';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ContentViewPanelProps {
  viewMode: ViewMode;
  files: FileNode[];
  selectedFile: FileNode | null;
  responsiveMode: ResponsiveMode;
}

const buildPreviewHtml = (files: FileNode[]): string => {
  const htmlFile = files.find(f => f.name.endsWith('.html'));
  if (!htmlFile) {
    return '<html><body><h1 style="font-family: sans-serif; color: #333;">No index.html file found.</h1></body></html>';
  }

  let htmlContent = htmlFile.content;

  const cssFiles = files.filter(f => f.name.endsWith('.css'));
  const styleTags = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
  htmlContent = htmlContent.replace('</head>', `${styleTags}</head>`);

  const jsFiles = files.filter(f => f.name.endsWith('.js'));
  const scriptTags = jsFiles.map(f => `<script>${f.content}</script>`).join('\n');
  
  const draggabilityTag = `<script>${draggabilityScript}</script>`;

  htmlContent = htmlContent.replace('</body>', `${scriptTags}${draggabilityTag}</body>`);
  

  htmlContent = htmlContent.replace(/<link\s+rel="stylesheet"\s+href=".*?\.css">/g, '');
  htmlContent = htmlContent.replace(/<script\s+src=".*?\.js"\s*(defer|async)*><\/script>/g, '');

  return htmlContent;
};

const getLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return 'markup';
        case 'css': return 'css';
        case 'js': return 'javascript';
        case 'jsx': return 'jsx';
        case 'ts': return 'typescript';
        case 'tsx': return 'tsx';
        case 'json': return 'json';
        case 'md': return 'markdown';
        default: return 'plaintext';
    }
};

const WelcomeScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8 grid-background">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Welcome to the Content Viewer</h2>
        <p>Your generated code and website preview will appear here.</p>
        <p className="mt-4">Use the chat on the left to tell Gemini what you want to build.</p>
    </div>
);

const ContentViewPanel = forwardRef<HTMLIFrameElement, ContentViewPanelProps>(
  ({ viewMode, files, selectedFile, responsiveMode }, ref) => {
    const previewHtml = useMemo(() => {
        // Only enable draggability in preview mode
        return viewMode === 'preview' ? buildPreviewHtml(files) : buildPreviewHtml(files).replace(draggabilityScript, '');
    }, [files, viewMode]);

    if (files.length === 0) {
        return <WelcomeScreen />;
    }

    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
        {viewMode === 'code' && selectedFile && (
            <>
              <div className="flex-shrink-0 p-3 bg-gray-100 border-b border-gray-200">
                  <p className="text-sm font-mono text-gray-600">{selectedFile.name}</p>
              </div>
              <div className="flex-1 overflow-auto text-sm">
                  <SyntaxHighlighter
                      language={getLanguage(selectedFile.name)}
                      style={vscDarkPlus}
                      showLineNumbers
                      wrapLines={true}
                      customStyle={{
                          margin: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#1e1e1e',
                      }}
                      codeTagProps={{
                          style: {
                              fontFamily: 'Consolas, "Courier New", monospace',
                              fontSize: '14px',
                          },
                      }}
                  >
                      {String(selectedFile.content).replace(/\n$/, '')}
                  </SyntaxHighlighter>
              </div>
            </>
        )}
        {viewMode === 'preview' && (
          <div className="w-full h-full flex justify-center items-start bg-slate-200 p-4 overflow-auto">
              <iframe
                  ref={ref}
                  key={previewHtml}
                  srcDoc={previewHtml}
                  title="Website Preview"
                  className={`h-full border-0 bg-white shadow-xl rounded-lg transition-all duration-300 ease-in-out transform-gpu ${responsiveMode === 'mobile' ? 'w-[375px]' : 'w-full'}`}
                  sandbox="allow-scripts allow-same-origin"
              />
          </div>
        )}
      </div>
    );
  }
);

ContentViewPanel.displayName = 'ContentViewPanel';

export default ContentViewPanel;