import type { NextFunction, Request, Response } from "express";
import type { ErrorRequestHandler } from "express";


type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler(controller: AsyncController) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(controller(req, res, next)).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  console.error("Unhandled request error", {
    method: req.method,
    path: req.path,
    error,
  });

  res.status(500).json({ message: "Internal server error" });
};