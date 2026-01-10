import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

// POST - Send email to attendees
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

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

        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        const { eventId, subject, message, recipientType } = await req.json();

        if (!eventId || !subject || !message) {
            return NextResponse.json(
                { message: "Event ID, subject, and message are required" },
                { status: 400 }
            );
        }

        // Find event
        const event = await Event.findById(eventId);

        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Verify ownership
        if (user.role === 'organizer' && event.organizerId?.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: "Forbidden - You don't own this event" },
                { status: 403 }
            );
        }

        // Get attendees based on recipient type
        let bookings;
        if (recipientType === 'all') {
            bookings = await Booking.find({ eventId: event._id })
                .populate('userId', 'name email');
        } else if (recipientType === 'checked_in') {
            const Ticket = (await import("@/database/ticket.model")).default;
            const checkedInTickets = await Ticket.find({
                status: 'used',
                checkedInAt: { $exists: true }
            });
            const checkedInBookingIds = checkedInTickets.map(t => t.bookingId);
            bookings = await Booking.find({
                eventId: event._id,
                _id: { $in: checkedInBookingIds }
            }).populate('userId', 'name email');
        } else if (recipientType === 'not_checked_in') {
            const Ticket = (await import("@/database/ticket.model")).default;
            const allTickets = await Ticket.find({});
            const checkedInBookingIds = allTickets
                .filter(t => t.status === 'used')
                .map(t => t.bookingId.toString());
            bookings = await Booking.find({
                eventId: event._id,
                _id: { $nin: checkedInBookingIds }
            }).populate('userId', 'name email');
        } else {
            bookings = await Booking.find({ eventId: event._id })
                .populate('userId', 'name email');
        }

        // Send emails
        const emailResults = [];
        const emailModule = await import("@/lib/email");
        const emailService = emailModule.getEmailService();

        for (const booking of bookings) {
            const attendee = booking.userId as any;
            const email = attendee?.email || booking.email;

            if (!email) continue;

            // Personalize message
            const personalizedMessage = message
                .replace(/\{name\}/g, attendee?.name || 'Attendee')
                .replace(/\{event\}/g, event.title)
                .replace(/\{date\}/g, event.date)
                .replace(/\{time\}/g, event.time)
                .replace(/\{location\}/g, event.location);

            try {
                const result = await emailService.sendEmail({
                    to: email,
                    subject: subject.replace(/\{event\}/g, event.title),
                    html: personalizedMessage.replace(/\n/g, '<br>'),
                    text: personalizedMessage,
                });

                emailResults.push({
                    email,
                    success: result.success,
                    error: result.error,
                });
            } catch (error: any) {
                emailResults.push({
                    email,
                    success: false,
                    error: error.message,
                });
            }
        }

        const successCount = emailResults.filter(r => r.success).length;
        const failureCount = emailResults.filter(r => !r.success).length;

        return handleSuccessResponse("Emails sent successfully", {
            total: emailResults.length,
            success: successCount,
            failed: failureCount,
            results: emailResults,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

