import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import Transaction from "@/database/transaction.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import mongoose from "mongoose";

export async function GET(req: NextRequest): Promise<NextResponse> {
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

        const { searchParams } = new URL(req.url);
        const timeRange = searchParams.get('timeRange') || '6months';
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // Logic: Get user's organizerId, then find events where event.organizerId matches
        // Handle both cases:
        // 1. Events where organizerId = user.organizerId (events pointing to Organizer - current data structure)
        // 2. Events where organizerId = user._id (events pointing to User - backward compatibility)
        
        const queryConditions: any[] = [];
        
        // If user has organizerId, find events where organizerId matches the Organizer
        if (user.organizerId) {
            const organizerId = user.organizerId instanceof mongoose.Types.ObjectId
                ? user.organizerId
                : new mongoose.Types.ObjectId(user.organizerId.toString());
            queryConditions.push({ organizerId: organizerId });
        }
        
        // Also check for events where organizerId points directly to the User (backward compatibility)
        const userId = user._id instanceof mongoose.Types.ObjectId 
            ? user._id 
            : new mongoose.Types.ObjectId(user._id.toString());
        queryConditions.push({ organizerId: userId });

        // Get organizer's events
        const events = await Event.find({
            $or: queryConditions
        });

        const eventIds = events.map(e => e._id);

        // Get bookings
        const bookings = await Booking.find({
            eventId: { $in: eventIds }
        });

        // Get transactions
        const transactions = await Transaction.find({
            eventId: { $in: eventIds },
            status: 'completed'
        });

        // Calculate time range
        let startDate = new Date(0); // Default: all time
        let endDate = new Date(); // Default: now

        if (startDateParam && endDateParam) {
            // Custom date range
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999); // End of day
        } else {
            // Preset time range
            const now = new Date();
            switch (timeRange) {
                case '1month':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    break;
                case '3months':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                    break;
                case '6months':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                    break;
                case '1year':
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                    break;
                default:
                    startDate = new Date(0); // All time
            }
        }

        // Filter transactions by time range
        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.createdAt);
            return tDate >= startDate && tDate <= endDate;
        });

        // Revenue analytics
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);
        const periodRevenue = filteredTransactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);

        // Bookings over time
        const bookingsByMonth = new Map<string, number>();
        bookings.forEach(booking => {
            const month = new Date(booking.createdAt).toISOString().slice(0, 7);
            bookingsByMonth.set(month, (bookingsByMonth.get(month) || 0) + 1);
        });

        // Revenue over time
        const revenueByMonth = new Map<string, number>();
        transactions.forEach(transaction => {
            const month = new Date(transaction.createdAt).toISOString().slice(0, 7);
            const current = revenueByMonth.get(month) || 0;
            revenueByMonth.set(month, current + (transaction.organizerRevenue || 0));
        });

        // Events by status
        const eventsByStatus = events.reduce((acc: any, event) => {
            acc[event.status] = (acc[event.status] || 0) + 1;
            return acc;
        }, {});

        // Events by mode
        const eventsByMode = events.reduce((acc: any, event) => {
            acc[event.mode] = (acc[event.mode] || 0) + 1;
            return acc;
        }, {});

        // Top performing events
        const eventPerformance = events.map(event => {
            const eventBookings = bookings.filter(b => b.eventId.toString() === event._id.toString());
            const eventTransactions = transactions.filter(t => t.eventId.toString() === event._id.toString());
            const eventRevenue = eventTransactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);

            return {
                eventId: event._id.toString(),
                title: event.title,
                bookings: eventBookings.length,
                revenue: eventRevenue,
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Filter bookings by time range
        const filteredBookings = bookings.filter(b => {
            const bDate = new Date(b.createdAt);
            return bDate >= startDate && bDate <= endDate;
        });

        const analytics = {
            totalRevenue,
            periodRevenue,
            totalBookings: bookings.length,
            periodBookings: filteredBookings.length,
            bookingsOverTime: Array.from(bookingsByMonth.entries())
                .filter(([month]) => {
                    const monthDate = new Date(month + '-01');
                    return monthDate >= startDate && monthDate <= endDate;
                })
                .map(([month, count]) => ({
                    month,
                    count,
                })),
            revenueOverTime: Array.from(revenueByMonth.entries())
                .filter(([month]) => {
                    const monthDate = new Date(month + '-01');
                    return monthDate >= startDate && monthDate <= endDate;
                })
                .map(([month, revenue]) => ({
                    month,
                    revenue,
                })),
            eventsByStatus,
            eventsByMode,
            topEvents: eventPerformance,
            monthlyRevenue: Array.from(revenueByMonth.entries())
                .filter(([month]) => {
                    const monthDate = new Date(month + '-01');
                    return monthDate >= startDate && monthDate <= endDate;
                })
                .map(([month, revenue]) => ({
                    month,
                    revenue,
                })),
        };

        return handleSuccessResponse("Analytics retrieved successfully", analytics);
    } catch (error) {
        return handleApiError(error);
    }
}

