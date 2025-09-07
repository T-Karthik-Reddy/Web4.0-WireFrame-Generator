
export type ViewMode = 'code' | 'preview';
export type ResponsiveMode = 'desktop' | 'mobile';

export interface FileNode {
  name: string;
  content: string;
}

export interface UploadedFile {
    name: string;
    type: string;
    base64: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'error';
  text: string;
  image?: string;
}

export interface GeminiCodeResponse {
  files: FileNode[];
  explanation: string;
}