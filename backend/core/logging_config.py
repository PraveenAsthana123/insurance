from __future__ import annotations

import logging
import logging.config
import traceback
from datetime import datetime, timezone
from typing import Any


class JsonFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON objects with:
      timestamp, level, logger, message, correlation_id, exception
    """

    def format(self, record: logging.LogRecord) -> str:
        import json

        log_entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", ""),
        }

        if record.exc_info:
            log_entry["exception"] = traceback.format_exception(*record.exc_info)

        # Include any extra fields attached to the record (excluding stdlib internals)
        _STDLIB_ATTRS = frozenset(
            {
                "name", "msg", "args", "created", "filename", "funcName", "levelname",
                "levelno", "lineno", "module", "msecs", "message", "pathname", "process",
                "processName", "relativeCreated", "stack_info", "thread", "threadName",
                "exc_info", "exc_text",
            }
        )
        for key, value in record.__dict__.items():
            if key not in _STDLIB_ATTRS and not key.startswith("_"):
                log_entry[key] = value

        return json.dumps(log_entry, default=str)


def setup_logging(level: str = "INFO", json_format: bool = True) -> None:
    """
    Configure application-wide logging.

    Args:
        level: Root log level (INFO, DEBUG, WARNING, ERROR).
        json_format: If True, use JsonFormatter; otherwise use plain text.
    """
    formatter_class = (
        "backend.core.logging_config.JsonFormatter"
        if json_format
        else "logging.Formatter"
    )
    fmt = None if json_format else "%(asctime)s %(levelname)s %(name)s %(message)s"

    config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": JsonFormatter if json_format else logging.Formatter,
                **({"fmt": fmt} if fmt else {}),
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stdout",
            }
        },
        "root": {"level": level, "handlers": ["console"]},
        "loggers": {
            # Quiet noisy third-party libraries
            "httpx": {"level": "WARNING", "propagate": True},
            "httpcore": {"level": "WARNING", "propagate": True},
            "uvicorn.access": {"level": "WARNING", "propagate": True},
            "celery": {"level": "WARNING", "propagate": True},
            "mlflow": {"level": "WARNING", "propagate": True},
            "prophet": {"level": "WARNING", "propagate": True},
        },
    }

    logging.config.dictConfig(config)
