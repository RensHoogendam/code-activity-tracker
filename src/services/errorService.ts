import { useToast } from '../stores/toastStore'

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'error'
}

export interface AppError extends Error {
  severity: ErrorSeverity
  code?: string
  originalError?: unknown
}

class ErrorService {
  private toast = useToast()

  /**
   * Report an error to the user and log it
   */
  report(error: unknown, severity: ErrorSeverity = ErrorSeverity.ERROR, customMessage?: string): void {
    const message = customMessage || this.getErrorMessage(error)
    
    // Log to console
    this.log(error, severity)

    // Notify user
    this.toast.addToast(message, severity === ErrorSeverity.CRITICAL ? 'error' : severity as any)
  }

  /**
   * Log error to console or external monitoring service
   */
  private log(error: unknown, severity: ErrorSeverity): void {
    const timestamp = new Date().toISOString()
    const logPrefix = `[${timestamp}] [${severity.toUpperCase()}]`

    if (severity === ErrorSeverity.ERROR || severity === ErrorSeverity.CRITICAL) {
      console.error(logPrefix, error)
    } else if (severity === ErrorSeverity.WARNING) {
      console.warn(logPrefix, error)
    } else {
      console.info(logPrefix, error)
    }
  }

  private getErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    return 'An unexpected error occurred'
  }

  // Helper methods for specific error types
  handleApiError(error: unknown, context: string): void {
    this.report(error, ErrorSeverity.ERROR, `API Error (${context}): ${this.getErrorMessage(error)}`)
  }

  handleAuthError(error: unknown): void {
    this.report(error, ErrorSeverity.CRITICAL, 'Authentication failed. Please check your credentials.')
  }
}

export const errorService = new ErrorService()
export default errorService
