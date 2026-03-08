/**
 * StarterPrompts — landing screen shown when the chat is empty.
 * Two clear entry points: manage existing twins or build from scratch.
 */

interface Props {
  onSelect: (prompt: string) => void
}

const FLOWS = [
  {
    icon: '🏢',
    title: 'Explore Existing Twins',
    description: 'View and extend twins already deployed in your Azure Digital Twins instance.',
    prompt: 'Show me the current twin graph. List all twins and their relationships so I can see what\'s already deployed.',
    color: 'var(--accent)',
  },
  {
    icon: '🏗️',
    title: 'Build From Scratch',
    description: 'Describe your environment and I\'ll create the entire digital twin for you.',
    prompt: 'I want to build a new digital twin from scratch. Show me the available factory templates and DTDL models so I can decide how to start.',
    color: 'var(--success)',
  },
]

const QUICK_STARTS = [
  {
    icon: '📋',
    label: 'Deploy building tutorial',
    prompt: 'Deploy the building-tutorial factory template (Floor → Room → Thermostat) to get started quickly.',
  },
  {
    icon: '🏭',
    label: 'Deploy bottling line',
    prompt: 'Deploy the bottling-line template with filler, capper, and labeler stations.',
  },
  {
    icon: '🤖',
    label: 'Deploy automotive cell',
    prompt: 'Deploy the automotive-cell template with robot arms and conveyors.',
  },
  {
    icon: '💬',
    label: 'Describe my factory',
    prompt: 'I have a production line with 3 CNC machines, each has a spindle temperature sensor and a vibration sensor. Build the digital twin for me.',
  },
]

export function StarterPrompts({ onSelect }: Props) {
  return (
    <div className="starter-prompts">
      <div className="starter-header">
        <h2>Digital Twin Builder</h2>
        <p>Create, modify, and visualize Azure Digital Twins using natural language.</p>
      </div>

      {/* Two main flow cards */}
      <div className="flow-cards">
        {FLOWS.map((flow, i) => (
          <button
            key={i}
            className="flow-card"
            onClick={() => onSelect(flow.prompt)}
          >
            <span className="flow-icon">{flow.icon}</span>
            <div className="flow-text">
              <span className="flow-title">{flow.title}</span>
              <span className="flow-desc">{flow.description}</span>
            </div>
            <span className="flow-arrow">→</span>
          </button>
        ))}
      </div>

      {/* Quick-start templates */}
      <div className="quickstart-section">
        <span className="quickstart-label">Quick start</span>
        <div className="quickstart-grid">
          {QUICK_STARTS.map((item, i) => (
            <button
              key={i}
              className="starter-card"
              onClick={() => onSelect(item.prompt)}
            >
              <span className="starter-icon">{item.icon}</span>
              <span className="starter-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
