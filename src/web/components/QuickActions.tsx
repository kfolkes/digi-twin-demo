/**
 * QuickActions — persistent action chips shown above the message input.
 * Always visible so users can perform common operations with one click,
 * even in the middle of a conversation.
 */

interface Props {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

const ACTIONS = [
  { icon: '📊', label: 'Show graph', prompt: 'Show me the current twin graph and list all twins' },
  { icon: '➕', label: 'Add twin', prompt: 'I want to add a new twin — what model should it use?' },
  { icon: '🔗', label: 'Add relationship', prompt: 'Create a relationship between two twins' },
  { icon: '📡', label: 'Add sensor', prompt: 'Add a sensor to an existing twin' },
  { icon: '🏭', label: 'Deploy template', prompt: 'Show me the available factory templates I can deploy' },
  { icon: '🔍', label: 'Query twins', prompt: 'Run a query to find twins matching a criteria' },
  { icon: '📦', label: 'Browse models', prompt: 'What DTDL models are available in the built-in library?' },
  { icon: '⚡', label: 'Start telemetry', prompt: 'Start telemetry simulation for all equipment twins so I can monitor them live' },
  { icon: '🩺', label: 'Health check', prompt: 'Show me the health status of all twins and any active alerts' },
  { icon: '🚨', label: 'Setup alerts', prompt: 'Set up default manufacturing alert rules for temperature and vibration monitoring' },
  { icon: '�', label: 'Schedule', prompt: 'Show me the current production orders and generate an optimized schedule' },
  { icon: '🔮', label: 'Simulate', prompt: 'Run a what-if simulation — what happens if we increase conveyor speed by 20%?' },
  { icon: '📈', label: 'OEE Report', prompt: 'Calculate the OEE for all production lines and give me a manager summary' },
  { icon: '📦', label: 'Inventory', prompt: 'Check inventory levels and flag any materials that need replenishment' },
  { icon: '🔄', label: 'Bottlenecks', prompt: 'Identify bottlenecks in the current production setup and recommend improvements' },
  { icon: '�📝', label: 'Commit change', prompt: 'Commit the latest model/twin changes to GitHub on a new branch and propose a branch name.' },
  { icon: '🔀', label: 'Open PR', prompt: 'Open a pull request for the latest twin/model changes and include a clear summary.' },
  { icon: '✅', label: 'Check CI', prompt: 'Check pipeline status for my current feature branch and summarize results.' },
  { icon: '🚀', label: 'Release', prompt: 'Create a release tag for production deployment and draft release notes from recent twin changes.' },
  { icon: '🗑️', label: 'Delete twin', prompt: 'I want to delete a twin — show me the current twins first' },
]

export function QuickActions({ onSelect, disabled }: Props) {
  return (
    <div className="quick-actions">
      {ACTIONS.map((action, i) => (
        <button
          key={i}
          className="quick-chip"
          onClick={() => onSelect(action.prompt)}
          disabled={disabled}
          title={action.prompt}
        >
          <span className="quick-chip-icon">{action.icon}</span>
          <span className="quick-chip-label">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
