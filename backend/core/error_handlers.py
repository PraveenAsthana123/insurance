from __future__ import annotations

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from core.exceptions import (
    AppError,
    DataError,
    ExternalServiceError,
    ModelError,
    NotFoundError,
    ValidationError,
)

logger = logging.getLogger(__name__)

# Mapping from error_code to HTTP status code
_ERROR_CODE_TO_STATUS: dict[str, int] = {
    "NOT_FOUND": 404,
    "VALIDATION_ERROR": 422,
    "DATA_ERROR": 400,
    "MODEL_ERROR": 500,
    "EXTERNAL_SERVICE_ERROR": 503,
    "APP_ERROR": 500,
}


def _get_correlation_id(request: Request) -> str:
    return request.state.correlation_id if hasattr(request.state, "correlation_id") else ""


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    status_code = _ERROR_CODE_TO_STATUS.get(exc.error_code, 500)
    correlation_id = _get_correlation_id(request)

    logger.error(
        "Application error",
        extra={
            "error_code": exc.error_code,
            "message": exc.message,
            "status_code": status_code,
            "correlation_id": correlation_id,
            "path": request.url.path,
        },
    )

    return JSONResponse(
        status_code=status_code,
        content={
            "detail": exc.message,
            "error_code": exc.error_code,
            "correlation_id": correlation_id,
        },
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = _get_correlation_id(request)

    logger.exception(
        "Unhandled exception",
        extra={"correlation_id": correlation_id, "path": request.url.path},
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
            "error_code": "INTERNAL_ERROR",
            "correlation_id": correlation_id,
        },
    )


def register_error_handlers(app: object) -> None:
    """Register all exception handlers on the FastAPI app."""
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[attr-defined]
    app.add_exception_handler(NotFoundError, app_error_handler)  # type: ignore[attr-defined]
    app.add_exception_handler(ValidationError, app_error_handler)  # type: ignore[attr-defined]
    app.add_exception_handler(DataError, app_error_handler)  # type: ignore[attr-defined]
    app.add_exception_handler(ModelError, app_error_handler)  # type: ignore[attr-defined]
    app.add_exception_handler(ExternalServiceError, app_error_handler)  # type: ignore[attr-defined]
    app.add_exception_handler(Exception, generic_error_handler)  # type: ignore[attr-defined]
