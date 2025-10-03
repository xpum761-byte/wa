export type ConnectionStatus = 'idle' | 'running' | 'finished' | 'error' | 'disconnected' | 'connecting' | 'qr' | 'connected';

export interface SendProgress {
  current: number;
  total: number;
  currentNumber: string;
}

export type ButtonType = 'reply' | 'url' | 'call';

export interface Button {
  type: ButtonType;
  displayText: string;
  payload?: string; // For URL or Phone Number
}

export interface Template {
  id: string;
  name: string;
  message: string;
  footer?: string;
  buttons: Button[];
}

// FIX: Add missing Contact interface
export interface Contact {
  id: number;
  name: string;
  avatarUrl: string;
}
