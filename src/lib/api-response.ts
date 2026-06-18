import { NextResponse } from "next/server";

export const ok = (data: unknown, status = 200) =>
  NextResponse.json({ data }, { status });

export const created = (data: unknown) =>
  NextResponse.json({ data }, { status: 201 });

export const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const unauthorized = (message = "Unauthorized") => err(message, 401);
export const forbidden = (message = "Forbidden") => err(message, 403);
export const notFound = (message = "Not found") => err(message, 404);
export const conflict = (message: string) => err(message, 409);
export const gone = (message: string) => err(message, 410);
export const serverError = (e: unknown) => {
  console.error(e);
  return err("Internal server error", 500);
};
