import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Ticket from "@/database/ticket.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// POST - Transfer ticket to another user
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ ticketNumber: string }> }
): Promise<NextResponse> {
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

        const { ticketNumber } = await params;
        const { recipientEmail } = await req.json();

        if (!recipientEmail) {
            return NextResponse.json(
                { message: "Recipient email is required" },
                { status: 400 }
            );
        }

        // Find ticket by ticketNumber
        const ticket = await Ticket.findOne({ ticketNumber })
            .populate('bookingId');

        if (!ticket) {
            return NextResponse.json(
                { message: "Ticket not found" },
                { status: 404 }
            );
        }

        const booking = ticket.bookingId as any;

        // Verify ticket belongs to user
        if (booking.userId?.toString() !== user._id.toString() && booking.email !== user.email) {
            return NextResponse.json(
                { message: "Forbidden - You don't own this ticket" },
                { status: 403 }
            );
        }

        // Verify ticket is transferable
        if (ticket.status !== 'active') {
            return NextResponse.json(
                { message: `Ticket is ${ticket.status} and cannot be transferred` },
                { status: 400 }
            );
        }

        // Check if event has already passed
        const event = await Event.findById(booking.eventId);
        if (event) {
            const eventDate = new Date(event.date);
            const eventTime = event.time.split(':');
            eventDate.setHours(parseInt(eventTime[0]), parseInt(eventTime[1]));
            
            if (eventDate < new Date()) {
                return NextResponse.json(
                    { message: "Cannot transfer ticket for past events" },
                    { status: 400 }
                );
            }
        }

        // Find recipient user
        const recipient = await User.findOne({
            email: recipientEmail.toLowerCase().trim(),
            deleted: { $ne: true }
        });

        if (!recipient) {
            return NextResponse.json(
                { message: "Recipient not found. They must have an account on the platform." },
                { status: 404 }
            );
        }

        // Check if recipient already has a booking for this event
        const existingBooking = await Booking.findOne({
            eventId: booking.eventId,
            userId: recipient._id
        });

        if (existingBooking) {
            return NextResponse.json(
                { message: "Recipient already has a booking for this event" },
                { status: 400 }
            );
        }

        // Transfer booking to recipient
        booking.userId = recipient._id;
        booking.email = recipient.email;
        await booking.save();

        // Update ticket
        ticket.transferredTo = recipient._id;
        ticket.status = 'transferred';
        await ticket.save();

        // Create notifications
        const Notification = (await import("@/database/notification.model")).default;
        
        // Notify sender
        await Notification.create({
            userId: user._id,
            type: 'other',
            title: 'Ticket Transferred',
            message: `You transferred your ticket for ${event?.title || 'the event'} to ${recipient.email}`,
            link: `/bookings`,
        });

        // Notify recipient
        await Notification.create({
            userId: recipient._id,
            type: 'other',
            title: 'Ticket Received',
            message: `${user.name} transferred a ticket for ${event?.title || 'an event'} to you`,
            link: `/bookings`,
        });

        return handleSuccessResponse("Ticket transferred successfully", {
            ticket: {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                status: ticket.status,
                transferredTo: recipient._id.toString(),
            },
            recipient: {
                id: recipient._id.toString(),
                name: recipient.name,
                email: recipient.email,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

