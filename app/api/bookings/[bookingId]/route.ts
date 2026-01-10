import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import Transaction from "@/database/transaction.model";
import Ticket from "@/database/ticket.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { formatDateToReadable, formatDateTo12Hour } from "@/lib/formatters";

// DELETE - Cancel a booking
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
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

        const { bookingId } = await params;

        // Find booking
        const booking = await Booking.findById(bookingId)
            .populate('eventId');

        if (!booking) {
            return NextResponse.json(
                { message: "Booking not found" },
                { status: 404 }
            );
        }

        const event = booking.eventId as any;

        // Check if user owns this booking (or is admin)
        if (user.role !== 'admin' && booking.userId.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: "Forbidden - You don't have permission to cancel this booking" },
                { status: 403 }
            );
        }

        // Check if event has already passed
        const eventDate = new Date(event.date);
        const eventTime = event.time.split(':');
        eventDate.setHours(parseInt(eventTime[0]), parseInt(eventTime[1]));
        
        if (eventDate < new Date()) {
            return NextResponse.json(
                { message: "Cannot cancel booking for past events" },
                { status: 400 }
            );
        }

        // Find associated transaction
        const transaction = await Transaction.findOne({
            bookingId: booking._id,
            status: 'completed'
        });

        // Find associated ticket
        const ticket = await Ticket.findOne({
            bookingId: booking._id
        });

        // Handle refund if payment was made
        if (transaction && transaction.amount > 0) {
            // For now, we'll mark the transaction as refunded
            // In production, you'd want to actually process the refund through Stripe
            transaction.status = 'refunded';
            transaction.refundAmount = transaction.amount;
            transaction.refundedAt = new Date();
            await transaction.save();

            // TODO: Process actual refund through Stripe
            // if (transaction.stripePaymentIntentId) {
            //     const { stripe } = await import("@/lib/stripe");
            //     await stripe.refunds.create({
            //         payment_intent: transaction.stripePaymentIntentId,
            //     });
            // }
        }

        // Update ticket status
        if (ticket) {
            ticket.status = 'cancelled';
            await ticket.save();
        }

        // Update event capacity
        if (event.capacity) {
            event.availableTickets = Math.min(
                event.capacity,
                (event.availableTickets || 0) + 1
            );
            await event.save();
        }

        // Create notification
        const Notification = (await import("@/database/notification.model")).default;
        await Notification.create({
            userId: user._id,
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: `Your booking for ${event.title} has been cancelled${transaction && transaction.amount > 0 ? '. Refund will be processed.' : '.'}`,
            link: `/bookings`,
            metadata: {
                eventId: event._id.toString(),
                bookingId: booking._id.toString(),
            },
        });

        // Send email notification
        try {
            const { sendEmail, emailTemplates } = await import("@/lib/email");
            
            const emailContent = emailTemplates.bookingCancellation?.(
                event.title,
                formatDateToReadable(event.date),
                formatDateTo12Hour(event.time),
                transaction && transaction.amount > 0
            ) || {
                subject: `Booking Cancelled: ${event.title}`,
                html: `<p>Your booking for ${event.title} has been cancelled.</p>`
            };

            await sendEmail({
                to: user.email,
                subject: emailContent.subject,
                html: emailContent.html,
            });
        } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
        }

        // Delete booking (soft delete by removing it)
        // Or you could add a 'cancelled' status field to the booking model
        await Booking.findByIdAndDelete(booking._id);

        return handleSuccessResponse("Booking cancelled successfully", {
            bookingId: booking._id.toString(),
            refunded: transaction && transaction.amount > 0,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

