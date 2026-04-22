import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="text-6xl">🏸</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white uppercase italic tracking-tight mb-2">
              Something went wrong
            </h2>
            <p className="text-ink-500 text-sm max-w-xs">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {this.state.error?.message && (
              <p className="text-ink-700 text-[10px] font-mono mt-3 px-4 py-2 bg-white/5 rounded-xl">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest"
            style={{ background: '#c8ff00', color: '#0a0a0f' }}
          >
            Reload App
          </button>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-ink-600 hover:text-ink-400 transition-colors font-bold uppercase tracking-widest"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
