import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { handleImageUpload } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const formData = await req.formData();

        let event;

        try {
            event = Object.fromEntries(formData.entries());
        } catch (error) {
            return handleApiError(error);
        }

        const imageSource = formData.get('imageSource') as string;
        let imageUrl: string;

        if (imageSource === 'url') {
            // Handle image URL
            const providedUrl = formData.get('imageUrl') as string;
            if (!providedUrl || typeof providedUrl !== 'string' || providedUrl.trim().length === 0) {
                return NextResponse.json(
                    { message: 'Image URL is required' },
                    { status: 400 }
                );
            }

            // Validate URL format
            try {
                new URL(providedUrl.trim());
                imageUrl = providedUrl.trim();
            } catch {
                return NextResponse.json(
                    { message: 'Invalid image URL format' },
                    { status: 400 }
                );
            }
        } else {
            // Handle file upload
            const file = formData.get('image') as File;
            
            if (!file || !(file instanceof File)) {
                return NextResponse.json(
                    { message: 'Image file is required' },
                    { status: 400 }
                );
            }

            const uploadResult = await handleImageUpload(file, 'TechEventX');

            if (!uploadResult.success) {
                return uploadResult.response;
            }

            imageUrl = uploadResult.url;
        }

        event.image = imageUrl;

        const tags = JSON.parse(formData.get('tags') as string);
        const agenda = JSON.parse(formData.get('agenda') as string);

        const createdEvent = await Event.create({
            ...event,
            tags: tags,
            agenda: agenda,
        });

        return handleSuccessResponse('Event Created Successfully', { event: createdEvent }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function GET() {
    try {
        await connectDB();

        const events = await Event.find().sort({ createdAt: -1 });

        return handleSuccessResponse('Events Fetched Successfully', { events });
    } catch (error) {
        return handleApiError(error);
    }
}
