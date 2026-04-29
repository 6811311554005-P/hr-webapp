/**
 * Main entry point for src/ utilities
 * Re-export commonly used types and utilities
 */

export * from "./types";
export { prisma } from "./lib/prisma";
export { authOptions } from "./lib/auth";
export { DashboardClient } from "./components/dashboard";
