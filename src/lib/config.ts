/** Base URL of the Spring Boot API. Only read on the server (route handlers, server components). */
export const API_URL = (process.env.HRMS_API_URL ?? "http://localhost:8081").replace(/\/$/, "");

/** httpOnly cookies that hold the JWTs. Browser JavaScript never sees the tokens. */
export const TOKEN_COOKIE = "hrms_token";
/** Platform super user session, kept separate so both consoles can be open side by side. */
export const PLATFORM_TOKEN_COOKIE = "hrms_platform_token";

/** Set COOKIE_SECURE=true when the frontend is served over HTTPS. */
export const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
