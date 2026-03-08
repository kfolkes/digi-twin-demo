import { useState, useCallback } from 'react'
import './App.css'
import { ChatWindow } from './components/ChatWindow'
import { MessageInput } from './components/MessageInput'
import { QuickActions } from './components/QuickActions'
import { SdlcStatusPanel } from './components/SdlcStatusPanel'
import { ThemeToggle } from './components/ThemeToggle'
import { TwinGraphViewer } from './components/TwinGraphViewer'
import { ModelLibrary } from './components/ModelLibrary'
import { StarterPrompts } from './components/StarterPrompts'
import { LiveTelemetry } from './components/LiveTelemetry'
import { AlertPanel } from './components/AlertPanel'
import { PlanningDashboard } from './components/PlanningDashboard'
import KpiDashboard from './components/KpiDashboard'
import SupplyChainView from './components/SupplyChainView'
import { useService } from './hooks/useService'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { messages, isLoading, sdlcStatus, sendMessage } = useService()
  const { theme, toggleTheme } = useTheme()
  const [graphRefreshTrigger, setGraphRefreshTrigger] = useState(0)
  const [showLibrary, setShowLibrary] = useState(false)
  const [showTelemetry, setShowTelemetry] = useState(false)
  const [activePanel, setActivePanel] = useState<'monitor' | 'planning' | 'kpi' | 'supply' | null>(null)

  // After sending a message, trigger a graph refresh (agent may have modified twins)
  const handleSendMessage = useCallback((text: string) => {
    sendMessage(text)
    // Delayed refresh to give the agent time to execute tools
    setTimeout(() => setGraphRefreshTrigger((prev) => prev + 1), 3000)
  }, [sendMessage])

  // Model library sends prompts to the chat
  const handleLibraryMessage = useCallback((text: string) => {
    handleSendMessage(text)
    setShowLibrary(false)
  }, [handleSendMessage])

  const hasMessages = messages.length > 0

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>Digital Twin Builder</h1>
          <span className="header-badge">Copilot SDK + Azure Digital Twins</span>
        </div>
        <div className="header-right">
          <button
            className={`library-toggle${activePanel === 'monitor' ? ' active' : ''}`}
            onClick={() => { setActivePanel(activePanel === 'monitor' ? null : 'monitor'); setShowTelemetry(activePanel !== 'monitor') }}
            title="Live Telemetry & Alerts"
          >
            ⚡ Monitor
          </button>
          <button
            className={`library-toggle${activePanel === 'planning' ? ' active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'planning' ? null : 'planning')}
            title="Production Planning & Simulation"
          >
            📋 Planning
          </button>
          <button
            className={`library-toggle${activePanel === 'kpi' ? ' active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'kpi' ? null : 'kpi')}
            title="KPI Dashboards"
          >
            📈 KPIs
          </button>
          <button
            className={`library-toggle${activePanel === 'supply' ? ' active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'supply' ? null : 'supply')}
            title="Supply Chain"
          >
            🔗 Supply
          </button>
          <button
            className="library-toggle"
            onClick={() => setShowLibrary(!showLibrary)}
            title="Asset Library"
          >
            {showLibrary ? '✖' : '📦'} Assets
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Main content */}
      <div className="main-content">
        {/* Left panel: Chat */}
        <div className="chat-panel">
          <div className="chat-container">
            {!hasMessages ? (
              <div className="messages">
                <StarterPrompts onSelect={handleSendMessage} />
              </div>
            ) : (
              <ChatWindow messages={messages} isStreaming={isLoading} />
            )}
            <SdlcStatusPanel status={sdlcStatus} />
            <QuickActions onSelect={handleSendMessage} disabled={isLoading} />
            <MessageInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
        </div>

        {/* Right panel: Twin Graph + contextual panels */}
        <div className="graph-panel">
          <TwinGraphViewer refreshTrigger={graphRefreshTrigger} />
          {activePanel === 'monitor' && (
            <div className="monitoring-panels">
              <AlertPanel />
              <LiveTelemetry />
            </div>
          )}
          {activePanel === 'planning' && (
            <div className="monitoring-panels">
              <PlanningDashboard />
            </div>
          )}
          {activePanel === 'kpi' && (
            <div className="monitoring-panels">
              <KpiDashboard />
            </div>
          )}
          {activePanel === 'supply' && (
            <div className="monitoring-panels">
              <SupplyChainView />
            </div>
          )}
        </div>

        {/* Side panel: Model Library (overlay) */}
        {showLibrary && (
          <div className="library-overlay">
            <ModelLibrary onSendMessage={handleLibraryMessage} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        Built with{' '}
        <a href="https://github.com/github/copilot-sdk" target="_blank" rel="noopener noreferrer">
          Copilot SDK
        </a>
        {' + '}
        <a href="https://learn.microsoft.com/en-us/azure/digital-twins/" target="_blank" rel="noopener noreferrer">
          Azure Digital Twins
        </a>
      </footer>
    </div>
  )
}
