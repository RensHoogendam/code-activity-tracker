import { ErrorSeverity } from '../services/errorService'

export class AppError extends Error {
  severity: ErrorSeverity
  code?: string

  constructor(message: string, severity: ErrorSeverity = ErrorSeverity.ERROR, code?: string) {
    super(message)
    this.name = this.constructor.name
    this.severity = severity
    this.code = code
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ApiError extends AppError {
  status?: number
  url?: string

  constructor(message: string, status?: number, url?: string) {
    super(message, ErrorSeverity.ERROR, 'API_ERROR')
    this.status = status
    this.url = url
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, ErrorSeverity.CRITICAL, 'AUTH_ERROR')
    this.name = 'AuthError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connection failed') {
    super(message, ErrorSeverity.CRITICAL, 'NETWORK_ERROR')
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}
