import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface TokenPayload {
    id: string;
}

/**
 * Verify JWT token from request headers
 * @param req - NextRequest object
 * @returns Token payload if valid, null otherwise
 */
export function verifyToken(req: NextRequest): TokenPayload | null {
    try {
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT secret not configured");
        }

        const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Get token from request headers
 * @param req - NextRequest object
 * @returns Token string or null
 */
export function getTokenFromRequest(req: NextRequest): string | null {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.substring(7);
}

