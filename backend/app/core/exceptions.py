from typing import Any, Optional
from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        message: str,
        code: str = "ERROR",
        details: Optional[Any] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "success": False,
                "code": code,
                "message": message,
                "details": details,
            },
        )
        self.message = message
        self.code = code
        self.details = details


class NotFoundException(AppException):
    def __init__(
        self, message: str = "Resource not found", details: Optional[Any] = None
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=message,
            code="NOT_FOUND",
            details=details,
        )


class BadRequestException(AppException):
    def __init__(self, message: str = "Bad request", details: Optional[Any] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            code="BAD_REQUEST",
            details=details,
        )


class UnauthorizedException(AppException):
    def __init__(
        self, message: str = "Authentication required", details: Optional[Any] = None
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message=message,
            code="UNAUTHORIZED",
            details=details,
        )


class ForbiddenException(AppException):
    def __init__(
        self, message: str = "Access forbidden", details: Optional[Any] = None
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            message=message,
            code="FORBIDDEN",
            details=details,
        )


class ConflictException(AppException):
    def __init__(
        self, message: str = "Resource conflict", details: Optional[Any] = None
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            code="CONFLICT",
            details=details,
        )


class InsufficientFundsException(AppException):
    def __init__(
        self,
        message: str = "Insufficient available wallet balance",
        details: Optional[Any] = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message,
            code="INSUFFICIENT_FUNDS",
            details=details,
        )


class IdempotencyConflictException(AppException):
    def __init__(
        self,
        message: str = "Request with this idempotency key already processed or in progress",
        details: Optional[Any] = None,
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message,
            code="IDEMPOTENCY_CONFLICT",
            details=details,
        )
