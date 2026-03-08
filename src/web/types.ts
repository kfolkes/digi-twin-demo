export interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
}

export interface SdlcStatus {
  branch?: string
  prUrl?: string
  pipeline?: string
  releaseTag?: string
  lastAction?: string
  lastResult?: 'executing' | 'completed' | 'error'
  lastError?: string
  updatedAt?: string
}

export interface ToolCallEvent {
  name: string
  status: 'executing' | 'completed' | 'error'
  result?: {
    branch?: string
    prUrl?: string
    releaseUrl?: string
    tag?: string
    runs?: Array<{ name: string; status: string; conclusion: string | null }>
  }
  error?: string
}
