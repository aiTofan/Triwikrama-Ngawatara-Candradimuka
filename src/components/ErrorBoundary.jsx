import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: 'var(--red)', fontSize: '24px' }}>Maaf, terjadi kesalahan tak terduga.</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
            Aplikasi mengalami kendala teknis saat memproses permintaan Anda.
          </p>
          <button 
            className="cd-btn" 
            onClick={() => window.location.reload()}
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
