import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/database/user.model";
import Appeal from "@/database/appeal.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// Public route - Submit ban appeal (POST)
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const { email, reason } = await req.json();

        // Validate input
        if (!email || !reason) {
            return NextResponse.json(
                { message: "Email and reason are required" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { message: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if user exists and is banned
        const user = await User.findOne({ 
            email: email.toLowerCase().trim(),
            deleted: { $ne: true }
        });

        if (!user) {
            // Still allow appeal submission even if user doesn't exist
            // (in case email is incorrect or user was deleted)
        } else if (!user.banned) {
            return NextResponse.json(
                { message: "This account is not banned" },
                { status: 400 }
            );
        }

        // Save the appeal to the database
        const appeal = await Appeal.create({
            email: email.toLowerCase().trim(),
            reason: reason.trim(),
            userId: user?._id?.toString(),
            status: 'pending',
        });

        // TODO: Send email notification to admins about the new appeal

        return handleSuccessResponse("Appeal submitted successfully. We will review it and respond via email.", {
            id: appeal._id.toString(),
            email: appeal.email,
            status: appeal.status,
            submittedAt: appeal.createdAt.toISOString()
        });
    } catch (error) {
        return handleApiError(error);
    }
}

