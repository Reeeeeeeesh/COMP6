import { useState, useEffect } from 'react'; // Add useState, useEffect
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { BatchUploadContainer } from './components/batch/BatchUploadContainer';
import BatchResultsDisplay from './components/batch/BatchResultsDisplay';
import { CalculatorContainer } from './components/individual/CalculatorContainer';
import { ScenarioPlayground } from './components/scenario/ScenarioPlayground';
import UserGuide from './components/UserGuide';
import { Dashboard } from './components/dashboard/Dashboard';
import { PageTransition } from './components/common/PageTransition';
import { API_BASE_URL } from './config'; // Import API_BASE_URL for consistent API calls
import RevenueBandingAdmin from './components/admin/RevenueBandingAdmin';

function App() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on app load
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // For now, skip backend session creation and use temp ID immediately
        // TODO: Re-enable backend session creation once database issues are resolved
        const tempId = 'temp-' + Math.random().toString(36).substring(2, 15);
        setSessionId(tempId);
        console.log('Using temporary session ID:', tempId);
        setIsLoading(false);
        return;

        // Original session creation code (disabled for now)
        const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        
        if (result.success) {
          setSessionId(result.data.id);
          console.log('Session initialized successfully:', result.data.id);
        } else {
          console.error('Failed to create session:', result.error);
          // Generate a temporary session ID to allow the app to function
          const tempId = 'temp-' + Math.random().toString(36).substring(2, 15);
          setSessionId(tempId);
          console.log('Using temporary session ID:', tempId);
        }
      } catch (error) {
        console.error('Error creating session:', error);
        // Generate a temporary session ID to allow the app to function even if the API is down
        const tempId = 'temp-' + Math.random().toString(36).substring(2, 15);
        setSessionId(tempId);
        console.log('Using temporary session ID due to error:', tempId);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  const handleUploadComplete = (upload: any) => {
    console.log('Upload completed:', upload);
    // Potentially navigate to results page or show success message
    // For now, just log. We might use useNavigate() hook here later.
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Show error message to user
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-5xl font-bold text-center text-gray-900 mb-12 tracking-tight">
          <span className="gradient-text">Bonus Calculator</span>
        </h1>

        <Router>
          <Routes key={isLoading ? 'loading-routes' : 'loaded-routes'}>
            <Route path="/" element={
              <PageTransition>
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                      Welcome to the Bonus Calculator
                    </h2>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                      A comprehensive tool for calculating employee bonuses with batch processing,
                      real-time calculations, and scenario modeling.
                    </p>
                  
                  {/* User Guide Button - Prominent placement */}
                  <div className="mb-10 text-center">
                    <Link to="/user-guide">
                      <button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1">
                        📖 Complete User Guide
                      </button>
                    </Link>
                    <p className="text-sm text-gray-500 mt-3">
                      New to the system? Start here for comprehensive instructions
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        Dashboard
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        View analytics, charts, and insights from your bonus calculations.
                      </p>
                      <Link to="/dashboard">
                        <button
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          View Dashboard
                        </button>
                      </Link>
                    </div>
                    
                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        Batch Processing
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Upload CSV files to calculate bonuses for multiple employees at once.
                      </p>
                      <Link to="/batch">
                        <button
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          Start Batch Upload
                        </button>
                      </Link>
                    </div>
                    
                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        Individual Calculator
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Calculate bonuses for individual employees with real-time results.
                      </p>
                      <Link to="/calculator">
                        <button
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          Open Calculator
                        </button>
                      </Link>
                    </div>

                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        Scenario Playground
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Create "what-if" scenarios from existing batch data with real-time parameter adjustments.
                      </p>
                      <Link to="/scenarios">
                        <button
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          Create Scenario
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Session Information
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Session ID: <code className="bg-blue-100 px-3 py-1 rounded-md text-xs font-mono">{sessionId}</code>
                  </p>
                  <p className="text-blue-600 text-sm mt-2">
                    Your session will automatically expire after 24 hours of inactivity.
                  </p>
                </div>
                </div>
              </PageTransition>
            } />
            <Route path="/dashboard" element={<PageTransition><Dashboard sessionId={sessionId} /></PageTransition>} />
            <Route path="/batch" element={<PageTransition><BatchUploadContainer sessionId={sessionId} onUploadComplete={handleUploadComplete} onError={handleUploadError} /></PageTransition>} />
            <Route path="/batch/:uploadId/results" element={<PageTransition><BatchResultsDisplay /></PageTransition>} />
            <Route path="/batch/:uploadId/results/:resultId" element={<PageTransition><BatchResultsDisplay /></PageTransition>} />
            <Route path="/calculator" element={<PageTransition><div className="max-w-4xl mx-auto"><p className="text-center p-8 text-gray-500">Please select an employee from batch results to use the calculator.</p></div></PageTransition>} />
            <Route path="/calculator/:resultId" element={<PageTransition><CalculatorContainer /></PageTransition>} />
            <Route path="/scenarios" element={<PageTransition><ScenarioPlayground sessionId={sessionId} onError={handleUploadError} /></PageTransition>} />
            <Route path="/user-guide" element={<PageTransition><UserGuide /></PageTransition>} />
            <Route path="/admin/revenue-banding" element={<PageTransition><RevenueBandingAdmin /></PageTransition>} />
          </Routes>
        </Router>

      </div>
    </div>
  );
}

export default App;
