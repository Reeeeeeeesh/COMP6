import { useState, useEffect } from 'react'; // Add useState, useEffect
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { BatchUploadContainer } from './components/batch/BatchUploadContainer';
import SimpleBatchResults from './components/batch/SimpleBatchResults'; // Reverted to default import
import { CalculatorContainer } from './components/individual/CalculatorContainer';
import { ScenarioPlayground } from './components/scenario/ScenarioPlayground';
import UserGuide from './components/UserGuide';
import { API_BASE_URL } from './config'; // Import API_BASE_URL for consistent API calls

function App() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on app load
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Try to create a session with the API - using API_BASE_URL for consistency
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          Bonus Calculator
        </h1>

        <Router>
          <Routes key={isLoading ? 'loading-routes' : 'loaded-routes'}>
            <Route path="/" element={
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    Welcome to the Bonus Calculator
                  </h2>
                  <p className="text-gray-600 mb-6">
                    A comprehensive tool for calculating employee bonuses with batch processing,
                    real-time calculations, and scenario modeling.
                  </p>
                  
                  {/* User Guide Button - Prominent placement */}
                  <div className="mb-8 text-center">
                    <Link to="/user-guide">
                      <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                        📖 Complete User Guide
                      </button>
                    </Link>
                    <p className="text-sm text-gray-500 mt-2">
                      New to the system? Start here for comprehensive instructions
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Batch Processing
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Upload CSV files to calculate bonuses for multiple employees at once.
                      </p>
                      <Link to="/batch">
                        <button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                          Start Batch Upload
                        </button>
                      </Link>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Individual Calculator
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Calculate bonuses for individual employees with real-time results.
                      </p>
                      <Link to="/calculator">
                        <button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                          Open Calculator
                        </button>
                      </Link>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Scenario Playground
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Create "what-if" scenarios from existing batch data with real-time parameter adjustments.
                      </p>
                      <Link to="/scenarios">
                        <button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                          Create Scenario
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    Session Information
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Session ID: <code className="bg-blue-100 px-2 py-1 rounded text-xs">{sessionId}</code>
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    Your session will automatically expire after 24 hours of inactivity.
                  </p>
                </div>
              </div>
            } />
            <Route path="/batch" element={<BatchUploadContainer sessionId={sessionId} onUploadComplete={handleUploadComplete} onError={handleUploadError} />} />
            <Route path="/batch/:uploadId/results/:resultId" element={<SimpleBatchResults />} />
            <Route path="/calculator" element={<div className="max-w-4xl mx-auto"><p className="text-center p-8 text-gray-500">Please select an employee from batch results to use the calculator.</p></div>} />
            <Route path="/calculator/:resultId" element={<CalculatorContainer />} />
            <Route path="/scenarios" element={<ScenarioPlayground sessionId={sessionId} onError={handleUploadError} />} />
            <Route path="/user-guide" element={<UserGuide />} />
          </Routes>
        </Router>

      </div>
    </div>
  );
}

export default App;
