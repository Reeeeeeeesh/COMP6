import { useState, useEffect } from 'react'; // Add useState, useEffect
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import './App.css';
import { BatchUploadContainer } from './components/batch/BatchUploadContainer';
import BatchResultsDisplay from './components/batch/BatchResultsDisplay';
import { CalculatorContainer } from './components/individual/CalculatorContainer';
import { ScenarioPlayground } from './components/scenario/ScenarioPlayground';
import UserGuide from './components/UserGuide';
import QuickStartDemo from './components/QuickStartDemo';
import { Dashboard } from './components/dashboard/Dashboard';
import { PageTransition } from './components/common/PageTransition';
import { API_BASE_URL } from './config'; // Import API_BASE_URL for consistent API calls
import RevenueBandingAdmin from './components/admin/RevenueBandingAdmin';
import PlanBuilderMain from './components/admin/PlanBuilderMain';
import { ExecutiveReporting } from './components/admin/ExecutiveReporting';
import { CalculationTapeViewer } from './components/admin/CalculationTapeViewer';

// Wrapper component for calculation tape viewer with URL parameters
const CalculationTapeViewerPage = () => {
  const { planId, runId } = useParams<{ planId: string; runId: string }>();
  
  if (!planId || !runId) {
    return <div className="p-8 text-center text-red-600">Invalid calculation tape URL - missing plan ID or run ID</div>;
  }
  
  return <CalculationTapeViewer planId={planId} runId={runId} />;
};

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
                      Calculate Employee Bonuses in Minutes
                    </h2>
                    <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                      Whether you need to calculate bonuses for one employee or hundreds, 
                      our tool makes it simple and accurate. No complex formulas required.
                    </p>
                  
                  {/* Quick Start Section - Most Prominent */}
                  <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-blue-900 mb-3">👋 First time here?</h3>
                      <p className="text-blue-700 mb-4">Let us show you how easy it is with a quick demo</p>
                      <Link to="/user-guide">
                        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                          🚀 Start Quick Tour (2 minutes)
                        </button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="text-center mb-8">
                    <p className="text-gray-600 font-medium">Or choose what you need to do:</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        📊 View Previous Results
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        See summaries, charts, and reports from your recent bonus calculations.
                      </p>
                      <div className="text-sm text-gray-500 mb-4 font-medium">
                        ⏱️ Instant access • Best for: Reviewing past work
                      </div>
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
                        📄 Process Employee Spreadsheet
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Got an Excel/CSV file with employee data? Upload it and get everyone's bonuses calculated automatically.
                      </p>
                      <div className="text-sm text-gray-500 mb-4 font-medium">
                        ⏱️ ~3 minutes • Best for: 10+ employees
                      </div>
                      <Link to="/batch">
                        <button
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          Upload Spreadsheet
                        </button>
                      </Link>
                    </div>
                    
                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        🧮 Single Employee Calculator
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Need to calculate a bonus for just one person? Enter their details and get instant results.
                      </p>
                      <div className="text-sm text-gray-500 mb-4 font-medium">
                        ⏱️ ~1 minute • Best for: Quick one-off calculations
                      </div>
                      <Link to="/calculator">
                        <button
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          Calculate Single Bonus
                        </button>
                      </Link>
                    </div>

                    <div className="group border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 transform hover:-translate-y-2">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        🔍 What-If Analysis
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        Want to see "what would happen if we changed the bonus percentage?" Test different scenarios instantly.
                      </p>
                      <div className="text-sm text-gray-500 mb-4 font-medium">
                        ⏱️ ~2 minutes • Best for: Testing bonus strategies
                      </div>
                      <Link to="/scenarios">
                        <button
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform group-hover:scale-105"
                        >
                          Try What-If Analysis
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Hidden for novice users - session info moved to footer or admin area if needed */}
                {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Session Information
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Session ID: <code className="bg-blue-100 px-3 py-1 rounded-md text-xs font-mono">{sessionId}</code>
                  </p>
                  <p className="text-blue-600 text-sm mt-2">
                    Your session will automatically expire after 24 hours of inactivity.
                  </p>
                </div> */}
                
                {/* Help section for novice users */}
                <div className="mt-8 text-center">
                  <p className="text-gray-500 text-sm">
                    Need help? Check our <Link to="/user-guide" className="text-blue-600 hover:text-blue-800 underline">User Guide</Link> or start with the Quick Tour above
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
            <Route path="/user-guide" element={<PageTransition><QuickStartDemo /></PageTransition>} />
            <Route path="/advanced-guide" element={<PageTransition><UserGuide /></PageTransition>} />
            <Route path="/admin/revenue-banding" element={<PageTransition><RevenueBandingAdmin /></PageTransition>} />
            <Route path="/admin/plan-builder" element={<PageTransition><PlanBuilderMain /></PageTransition>} />
            <Route path="/admin/executive-reporting" element={<PageTransition><ExecutiveReporting tenantId="default" /></PageTransition>} />
            <Route path="/admin/calculation-tape/:planId/:runId" element={<PageTransition><CalculationTapeViewerPage /></PageTransition>} />
          </Routes>
        </Router>

      </div>
    </div>
  );
}

export default App;
