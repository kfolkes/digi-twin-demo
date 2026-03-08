/**
 * ModelLibrary — sidebar showing available DTDL models and factory templates.
 * Users can browse available asset types and deploy pre-built factory templates.
 */
import { useEffect, useState, useCallback } from 'react'

interface LibraryModel {
  displayName: string
  modelId: string
  source: string
}

interface FactoryTemplate {
  id: string
  name: string
  description: string
  twinCount: number
  relationshipCount: number
  modelCount: number
}

interface Props {
  onSendMessage: (message: string) => void
}

// Icon map for model types
function getModelIcon(displayName: string): string {
  const name = displayName.toLowerCase()
  if (name.includes('floor')) return '\ud83c\udfe2'
  if (name.includes('room')) return '\ud83d\udeaa'
  if (name.includes('thermostat')) return '\ud83c\udf21\ufe0f'
  if (name.includes('production') || name.includes('line')) return '\ud83c\udfed'
  if (name.includes('station')) return '\u2699\ufe0f'
  if (name.includes('motor')) return '\u26a1'
  if (name.includes('temperature')) return '\ud83c\udf21\ufe0f'
  if (name.includes('vibration')) return '\ud83d\udce1'
  if (name.includes('humidity')) return '\ud83d\udca7'
  if (name.includes('energy') || name.includes('meter')) return '\ud83d\udd0b'
  if (name.includes('conveyor')) return '\u27a1\ufe0f'
  if (name.includes('robot')) return '\ud83e\udd16'
  return '\ud83d\udce6'
}

export function ModelLibrary({ onSendMessage }: Props) {
  const [models, setModels] = useState<LibraryModel[]>([])
  const [templates, setTemplates] = useState<FactoryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'models' | 'templates'>('templates')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [modelsRes, templatesRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/templates'),
      ])
      if (modelsRes.ok) {
        const data = await modelsRes.json()
        setModels(data.libraryModels || [])
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setTemplates(data)
      }
    } catch {
      // Silent fail — library is supplementary
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDeployTemplate = (templateId: string) => {
    onSendMessage(`Deploy the "${templateId}" factory template`)
  }

  const handleAddModel = (modelName: string) => {
    onSendMessage(`Create a new ${modelName} twin and add it to the graph`)
  }

  return (
    <div className="model-library">
      <div className="library-header">
        <h3>Asset Library</h3>
      </div>

      <div className="library-tabs">
        <button
          className={`library-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
        <button
          className={`library-tab ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          Models ({models.length})
        </button>
      </div>

      {loading ? (
        <div className="library-loading">Loading...</div>
      ) : activeTab === 'templates' ? (
        <div className="library-list">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-name">{template.name}</div>
              <div className="template-desc">{template.description}</div>
              <div className="template-stats">
                <span>{template.twinCount} twins</span>
                <span>{template.relationshipCount} links</span>
              </div>
              <button
                className="template-deploy-btn"
                onClick={() => handleDeployTemplate(template.id)}
              >
                Deploy
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="library-list">
          {models.map((model) => (
            <div key={model.modelId} className="model-card" onClick={() => handleAddModel(model.displayName)}>
              <span className="model-icon">{getModelIcon(model.displayName)}</span>
              <div className="model-info">
                <div className="model-name">{model.displayName}</div>
                <div className="model-id">{model.modelId}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
