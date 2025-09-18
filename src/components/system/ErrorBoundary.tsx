import React from 'react';

interface ErrorBoundaryState {
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('🚨 UI ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              画面の表示中にエラーが発生しました
            </h2>
            <p className="text-red-300 text-sm mb-4">
              {this.state.error?.message || '不明なエラーが発生しました'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
            >
              ページをリロードする
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}