import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import { handleApiError } from "@/lib/utils";

// GET - Generate iCal file for event
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { bookingId } = await params;
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return NextResponse.json(
                { message: "Booking not found" },
                { status: 404 }
            );
        }

        // Verify booking belongs to user
        if (booking.userId?.toString() !== user._id.toString() && booking.email !== user.email) {
            return NextResponse.json(
                { message: "Forbidden - You don't have access to this booking" },
                { status: 403 }
            );
        }

        const event = await Event.findById(booking.eventId);
        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Generate iCal content
        const eventDate = new Date(event.date);
        const [hours, minutes] = event.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(eventDate);
        endDate.setHours(endDate.getHours() + 2); // Default 2-hour duration

        const formatDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const escapeText = (text: string) => {
            return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
        };

        const icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//TechEventX//Event Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${booking._id}@techeventx.com`,
            `DTSTART:${formatDate(eventDate)}`,
            `DTEND:${formatDate(endDate)}`,
            `DTSTAMP:${formatDate(new Date())}`,
            `SUMMARY:${escapeText(event.title)}`,
            `DESCRIPTION:${escapeText(event.description || '')}`,
            `LOCATION:${escapeText(event.location || '')}`,
            `URL:${process.env.NEXT_PUBLIC_APP_URL || 'https://techeventx.com'}/events/${event.slug}`,
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'BEGIN:VALARM',
            'TRIGGER:-PT1H',
            'ACTION:DISPLAY',
            `DESCRIPTION:Reminder: ${event.title}`,
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');

        // Return iCal file
        return new NextResponse(icalContent, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="event-${event.slug}.ics"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

