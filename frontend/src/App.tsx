import { useState } from 'react'
import './App.css'
import type { FuelPack } from './types'

function App() {
  const [fuelPack, setFuelPack] = useState<FuelPack | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const generateFuelPack = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/fuel-pack')
      if (!response.ok) {
        throw new Error('Failed to generate fuel pack')
      }
      const data = await response.json()
      setFuelPack(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">✨ INSPIRE</h1>
        <p className="subtitle">Fuel Your Creativity</p>
      </header>

      <div className="main-content">
        <button 
          className="generate-btn"
          onClick={generateFuelPack}
          disabled={loading}
        >
          {loading ? 'Generating...' : '🎲 Generate Fuel Pack'}
        </button>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {fuelPack && (
          <div className="fuel-pack">
            <div className="pack-header">
              <h2>Your Fuel Pack</h2>
              <span className="pack-id">{fuelPack.id}</span>
            </div>

            <div className="section">
              <h3>🔥 Power Words</h3>
              <div className="words-grid">
                {fuelPack.words.map((word, idx) => (
                  <span key={idx} className="word-tag">{word}</span>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>😂 Meme Energy</h3>
              <ul className="meme-list">
                {fuelPack.memes.map((meme, idx) => (
                  <li key={idx}>{meme}</li>
                ))}
              </ul>
            </div>

            <div className="section">
              <h3>🎭 Emotional Arc</h3>
              <div className="emotional-arc">
                <div className="arc-step">
                  <span className="arc-label">Start</span>
                  <span className="arc-value">{fuelPack.emotionalArc.start}</span>
                </div>
                <span className="arc-arrow">→</span>
                <div className="arc-step">
                  <span className="arc-label">Middle</span>
                  <span className="arc-value">{fuelPack.emotionalArc.middle}</span>
                </div>
                <span className="arc-arrow">→</span>
                <div className="arc-step">
                  <span className="arc-label">End</span>
                  <span className="arc-value">{fuelPack.emotionalArc.end}</span>
                </div>
              </div>
            </div>

            <div className="section challenge-section">
              <h3>💪 Sample Challenge</h3>
              <div className="challenge-card">
                <div className="challenge-type">{fuelPack.sampleChallenge.type}</div>
                <p className="challenge-description">{fuelPack.sampleChallenge.description}</p>
                <p className="challenge-constraint">
                  <strong>Constraint:</strong> {fuelPack.sampleChallenge.constraint}
                </p>
              </div>
            </div>
          </div>
        )}

        {!fuelPack && !loading && (
          <div className="empty-state">
            <p>🎨 Click the button above to get your creative fuel pack!</p>
            <p className="empty-subtitle">
              Perfect for rappers, singers, and producers looking for fresh inspiration
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
