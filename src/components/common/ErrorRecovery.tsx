import { log } from '@/utils/logger';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  diagnoseDbConnection, 
  resetClientState, 
  performEmergencyReset 
} from '@/utils/errorRecovery';
import { motion } from 'framer-motion';
import { AuthError, PostgrestError } from '@supabase/supabase-js'; // Import error types

interface ErrorRecoveryProps {
  title?: string;
  description?: string;
  showDiagnose?: boolean;
  showResetState?: boolean;
  showEmergencyReset?: boolean;
  compact?: boolean;
  onClose?: () => void;
}

// Define a more specific type for the diagnosis result
type DiagnosisDetails =
  | PostgrestError
  | AuthError
  | { authenticated: false }
  | { authenticated: true; userId?: string }
  | { error: unknown }; // Error from local catch or from diagnoseDbConnection's catch

interface DiagnosisResultType {
  success: boolean;
  message: string;
  details?: DiagnosisDetails;
}

export function ErrorRecovery({
  title = "Error Recovery",
  description = "We're experiencing some technical issues. Try these options to restore functionality.",
  showDiagnose = true,
  showResetState = true,
  showEmergencyReset = true,
  compact = false,
  onClose
}: ErrorRecoveryProps) {
  const navigate = useNavigate();
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResultType | null>(null);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isEmergencyResetting, setIsEmergencyResetting] = useState(false);
  
  const handleDiagnose = async () => {
    setIsRunningDiagnosis(true);
    try {
      const result = await diagnoseDbConnection();
      setDiagnosisResult(result);
    } catch (error: unknown) {
      setDiagnosisResult({
        success: false,
        message: "Failed to run diagnosis",
        details: { error }
      });
    } finally {
      setIsRunningDiagnosis(false);
    }
  };
  
  const handleResetState = () => {
    setIsResetting(true);
    try {
      resetClientState();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      log.error('Component', "Reset failed:", error);
      setIsResetting(false);
    }
  };
  
  const handleEmergencyReset = () => {
    setIsEmergencyResetting(true);
    try {
      performEmergencyReset();
    } catch (error) {
      log.error('Component', "Emergency reset failed:", error);
      setIsEmergencyResetting(false);
    }
  };
  
  const returnToHome = () => {
    navigate('/');
  };
  
  // Styles based on compact mode
  const containerClass = compact 
    ? "bg-gray-50 rounded-lg border border-gray-200 p-4 my-3"
    : "bg-gray-50 rounded-lg border border-gray-200 p-6 my-6";
    
  const titleClass = compact
    ? "text-lg font-medium text-gray-900 mb-2"
    : "text-xl font-semibold text-gray-900 mb-3";
    
  const descriptionClass = compact
    ? "text-sm text-gray-500 mb-4"
    : "text-base text-gray-500 mb-5";
    
  const buttonClass = compact
    ? "text-sm py-1.5 px-3"
    : "text-base py-2 px-4";
    
  return (
    <motion.div 
      className={containerClass}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <h3 className={titleClass}>{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <p className={descriptionClass}>{description}</p>
      
      <div className="space-y-3">
        {showDiagnose && (
          <div>
            <Button
              onClick={handleDiagnose}
              disabled={isRunningDiagnosis}
              variant="outline"
              className={buttonClass}
            >
              {isRunningDiagnosis ? "Running..." : "Diagnose Connection"}
            </Button>
            
            {diagnosisResult && (
              <div className={`mt-2 p-3 rounded text-sm ${diagnosisResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <div className="font-medium">{diagnosisResult.message}</div>
                {!compact && diagnosisResult.details && (
                  <pre className="mt-1 text-xs overflow-x-auto">
                    {JSON.stringify(diagnosisResult.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
        
        {showResetState && (
          <div>
            <Button
              onClick={handleResetState}
              disabled={isResetting}
              variant="outline"
              className={`${buttonClass} border-amber-300 text-amber-700 hover:bg-amber-50`}
            >
              {isResetting ? "Resetting..." : "Reset Client State"}
            </Button>
            <span className="ml-2 text-xs text-gray-500">Clears cached space data</span>
          </div>
        )}
        
        {showEmergencyReset && (
          <div>
            <Button
              onClick={handleEmergencyReset}
              disabled={isEmergencyResetting}
              variant="destructive"
              className={buttonClass}
            >
              {isEmergencyResetting ? "Resetting..." : "Emergency Reset"}
            </Button>
            <span className="ml-2 text-xs text-gray-500">Signs out and clears all data</span>
          </div>
        )}
        
        <Button
          onClick={returnToHome}
          variant="default"
          className={`${buttonClass} bg-gray-900 hover:bg-gray-800 text-white`}
        >
          Return to Home
        </Button>
      </div>
    </motion.div>
  );
} 