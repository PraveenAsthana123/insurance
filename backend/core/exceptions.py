from __future__ import annotations


class AppError(Exception):
    """Base application error. All domain errors inherit from this."""

    def __init__(self, message: str, error_code: str = "APP_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.error_code = error_code

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message={self.message!r}, error_code={self.error_code!r})"


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, error_code="NOT_FOUND")


class ValidationError(AppError):
    """Raised when input data fails validation."""

    def __init__(self, message: str = "Validation failed") -> None:
        super().__init__(message, error_code="VALIDATION_ERROR")


class DataError(AppError):
    """Raised for data integrity or processing errors."""

    def __init__(self, message: str = "Data error") -> None:
        super().__init__(message, error_code="DATA_ERROR")


class ModelError(AppError):
    """Raised for ML model training, loading, or inference errors."""

    def __init__(self, message: str = "Model error") -> None:
        super().__init__(message, error_code="MODEL_ERROR")


class ExternalServiceError(AppError):
    """Raised when an external service (Ollama, MLflow, etc.) is unavailable or fails."""

    def __init__(self, message: str = "External service error") -> None:
        super().__init__(message, error_code="EXTERNAL_SERVICE_ERROR")
