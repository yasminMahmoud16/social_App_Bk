"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandling = exports.ForbiddenException = exports.UnauthorizeException = exports.ConflictException = exports.NotFoundException = exports.BadRequestException = exports.ApplicationException = void 0;
class ApplicationException extends Error {
    message;
    statusCode;
    cause;
    constructor(message, statusCode = 400, cause) {
        super();
        this.message = message;
        this.statusCode = statusCode;
        this.cause = cause;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApplicationException = ApplicationException;
;
class BadRequestException extends ApplicationException {
    message;
    cause;
    constructor(message, cause) {
        super(message, 400, cause);
        this.message = message;
        this.cause = cause;
    }
}
exports.BadRequestException = BadRequestException;
;
class NotFoundException extends ApplicationException {
    message;
    cause;
    constructor(message, cause) {
        super(message, 404, cause);
        this.message = message;
        this.cause = cause;
    }
}
exports.NotFoundException = NotFoundException;
;
class ConflictException extends ApplicationException {
    message;
    cause;
    constructor(message, cause) {
        super(message, 409, cause);
        this.message = message;
        this.cause = cause;
    }
}
exports.ConflictException = ConflictException;
;
class UnauthorizeException extends ApplicationException {
    message;
    cause;
    constructor(message, cause) {
        super(message, 401, cause);
        this.message = message;
        this.cause = cause;
    }
}
exports.UnauthorizeException = UnauthorizeException;
;
class ForbiddenException extends ApplicationException {
    message;
    cause;
    constructor(message, cause) {
        super(message, 403, cause);
        this.message = message;
        this.cause = cause;
    }
}
exports.ForbiddenException = ForbiddenException;
;
const globalErrorHandling = (error, req, res, next) => {
    return res.status(error.statusCode || 500).json({
        err_message: error.message || "something went wrong",
        stack: process.env.MOOD === "development" ? error.stack : undefined,
        error,
    });
};
exports.globalErrorHandling = globalErrorHandling;
