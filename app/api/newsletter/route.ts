import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Newsletter from "@/database/newsletter.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { email } = await req.json();

        if (!email || !email.trim()) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase().trim() });

        if (existingSubscriber) {
            return NextResponse.json(
                { message: 'You are already subscribed to our newsletter!' },
                { status: 200 }
            );
        }

        const subscriber = await Newsletter.create({
            email: email.toLowerCase().trim(),
        });

        return handleSuccessResponse('Successfully subscribed to newsletter!', { subscriber }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

