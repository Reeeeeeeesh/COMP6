export interface ErrorItem {
  message: string;
  context?: string;
  severity?: 'error' | 'warning' | 'info';
  suggestions?: string[];
}

export interface ParsedApiError {
  errors: ErrorItem[];
  summary: string;
}

/**
 * Parse API error responses and extract structured error information
 */
export function parseApiError(error: any): ParsedApiError {
  const errors: ErrorItem[] = [];
  let summary = 'An error occurred';

  try {
    // Handle different error response formats
    if (error?.response?.data) {
      const data = error.response.data;
      
      // Handle structured API responses
      if (data.error && data.message) {
        summary = data.message;
        
        // Parse individual errors if available
        if (data.data?.errors && Array.isArray(data.data.errors)) {
          data.data.errors.forEach((errorMsg: string) => {
            errors.push(parseErrorMessage(errorMsg));
          });
        } else {
          errors.push(parseErrorMessage(data.message));
        }
        
        // Add warnings if available
        if (data.data?.warnings && Array.isArray(data.data.warnings)) {
          data.data.warnings.forEach((warningMsg: string) => {
            errors.push(parseErrorMessage(warningMsg, 'warning'));
          });
        }
      }
      // Handle validation errors
      else if (data.detail && Array.isArray(data.detail)) {
        summary = 'Validation errors found';
        data.detail.forEach((item: any) => {
          const message = item.msg || item.message || String(item);
          const context = item.loc ? `Field: ${item.loc.join('.')}` : undefined;
          errors.push({ message, context, severity: 'error' });
        });
      }
      // Handle simple error messages
      else if (data.detail || data.message || data.error) {
        const message = data.detail || data.message || data.error;
        summary = message;
        errors.push(parseErrorMessage(message));
      }
    }
    // Handle network errors
    else if (error.message) {
      summary = error.message;
      if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
        errors.push({
          message: 'Unable to connect to the server',
          severity: 'error',
          suggestions: [
            'Check your internet connection',
            'Verify the server is running',
            'Try refreshing the page'
          ]
        });
      } else {
        errors.push(parseErrorMessage(error.message));
      }
    }
    // Handle string errors
    else if (typeof error === 'string') {
      summary = error;
      errors.push(parseErrorMessage(error));
    }
  } catch (parseError) {
    console.error('Error parsing API error:', parseError);
    errors.push({
      message: 'An unexpected error occurred',
      severity: 'error',
      suggestions: ['Please try again', 'Contact support if the problem persists']
    });
  }

  // Ensure we always have at least one error
  if (errors.length === 0) {
    errors.push({
      message: summary || 'An unknown error occurred',
      severity: 'error'
    });
  }

  return { errors, summary };
}

/**
 * Parse individual error messages and extract context and suggestions
 */
function parseErrorMessage(message: string, severity: 'error' | 'warning' | 'info' = 'error'): ErrorItem {
  // Extract context (e.g., "Row 5: " or "Employee ID 'EMP001': ")
  const contextMatch = message.match(/^(Row \d+|Employee ID '[^']+')[^:]*:\s*/);
  const context = contextMatch ? contextMatch[1] : undefined;
  const cleanMessage = contextMatch ? message.replace(contextMatch[0], '') : message;

  // Generate suggestions based on common error patterns
  const suggestions = generateSuggestions(cleanMessage);

  return {
    message: cleanMessage,
    context,
    severity,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
}

/**
 * Generate helpful suggestions based on error message content
 */
function generateSuggestions(message: string): string[] {
  const suggestions: string[] = [];
  const lowerMessage = message.toLowerCase();

  // File format issues
  if (lowerMessage.includes('file format') || lowerMessage.includes('csv')) {
    suggestions.push('Save your file as CSV from Excel or Google Sheets');
    suggestions.push('Ensure the file extension is .csv');
  }

  // Salary validation issues
  if (lowerMessage.includes('salary') && lowerMessage.includes('positive')) {
    suggestions.push('Enter salary as a number without currency symbols (e.g., 50000)');
    suggestions.push('Remove commas, dollar signs, or other formatting');
  }

  // Percentage issues
  if (lowerMessage.includes('percentage') || lowerMessage.includes('%')) {
    suggestions.push('Enter percentages as decimals (e.g., 0.4 for 40%)');
    suggestions.push('Alternatively, enter whole numbers (e.g., 40 for 40%)');
  }

  // Weight issues
  if (lowerMessage.includes('weight') && lowerMessage.includes('sum')) {
    suggestions.push('Ensure investment and qualitative weights add up to 1.0');
    suggestions.push('Example: Investment Weight 0.6, Qualitative Weight 0.4');
  }

  // Missing data issues
  if (lowerMessage.includes('missing') || lowerMessage.includes('required')) {
    suggestions.push('Check that all required columns have values');
    suggestions.push('Remove any empty rows from your CSV file');
  }

  // Number format issues
  if (lowerMessage.includes('valid number') || lowerMessage.includes('numeric')) {
    suggestions.push('Remove any text, spaces, or special characters from numeric fields');
    suggestions.push('Use decimal notation (e.g., 1.5 instead of 1,5)');
  }

  // File size issues
  if (lowerMessage.includes('size') || lowerMessage.includes('10mb')) {
    suggestions.push('Reduce the number of rows in your CSV file');
    suggestions.push('Remove unnecessary columns');
    suggestions.push('Split large files into smaller batches');
  }

  return suggestions;
}

/**
 * Format error for display in simple contexts (alerts, notifications)
 */
export function formatErrorForDisplay(error: any): string {
  const parsed = parseApiError(error);
  
  if (parsed.errors.length === 1) {
    return parsed.errors[0].message;
  } else {
    const errorCount = parsed.errors.filter(e => e.severity === 'error' || !e.severity).length;
    const warningCount = parsed.errors.filter(e => e.severity === 'warning').length;
    
    let summary = '';
    if (errorCount > 0) {
      summary += `${errorCount} error${errorCount > 1 ? 's' : ''}`;
    }
    if (warningCount > 0) {
      if (summary) summary += ', ';
      summary += `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    }
    
    return `${summary} found. Please review the details.`;
  }
}

export default {
  parseApiError,
  formatErrorForDisplay,
  parseErrorMessage
};