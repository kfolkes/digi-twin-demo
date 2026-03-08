import type { SdlcStatus } from '../types'

interface Props {
  status: SdlcStatus
}

function statusLabel(result?: SdlcStatus['lastResult']) {
  if (result === 'executing') return 'Running'
  if (result === 'completed') return 'Updated'
  if (result === 'error') return 'Error'
  return 'Idle'
}

export function SdlcStatusPanel({ status }: Props) {
  const hasAny = Boolean(status.branch || status.prUrl || status.pipeline || status.releaseTag || status.lastAction)

  if (!hasAny) {
    return (
      <div className="sdlc-status-panel">
        <div className="sdlc-header">
          <span className="sdlc-title">SDLC Status</span>
          <span className="sdlc-pill idle">Idle</span>
        </div>
        <p className="sdlc-empty">Run Commit, Open PR, Check CI, or Release to show live lifecycle status.</p>
      </div>
    )
  }

  return (
    <div className="sdlc-status-panel">
      <div className="sdlc-header">
        <span className="sdlc-title">SDLC Status</span>
        <span className={`sdlc-pill ${status.lastResult ?? 'idle'}`}>{statusLabel(status.lastResult)}</span>
      </div>
      <div className="sdlc-grid">
        <div><strong>Branch:</strong> {status.branch ?? '—'}</div>
        <div><strong>Pipeline:</strong> {status.pipeline ?? '—'}</div>
        <div><strong>Release:</strong> {status.releaseTag ?? '—'}</div>
        <div><strong>Last Tool:</strong> {status.lastAction ?? '—'}</div>
      </div>
      {status.prUrl && (
        <a className="sdlc-link" href={status.prUrl} target="_blank" rel="noopener noreferrer">
          Open Pull Request
        </a>
      )}
      {status.lastError && <div className="sdlc-error">{status.lastError}</div>}
      {status.updatedAt && <div className="sdlc-updated">Updated {status.updatedAt}</div>}
    </div>
  )
}
