import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      let errorMessage = "Une erreur inattendue est survenue.";
      try {
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.error.includes('permission-denied')) {
            errorMessage = "Accès refusé. Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
          }
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
          <div className="glass p-12 rounded-3xl max-w-md border-red-500/20 border">
            <h2 className="text-3xl font-display uppercase mb-4 text-red-500">Oups !</h2>
            <p className="text-gray-400 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
