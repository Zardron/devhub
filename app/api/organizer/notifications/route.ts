import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Notification from "@/database/notification.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import mongoose from "mongoose";

// GET - Get notifications for events created by the logged organizer
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
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');

        console.log('🔔 [organizer/notifications] Fetching notifications for organizer:', {
            userId: user._id.toString(),
            unreadOnly,
            limit
        });

        // Step 1: Get all events associated with this organizer
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
            console.log("🔵 [organizer/notifications] Looking for events with organizerId (Organizer):", organizerId.toString());
        }
        
        // Also check for events where organizerId points directly to the User (backward compatibility)
        const userId = user._id instanceof mongoose.Types.ObjectId 
            ? user._id 
            : new mongoose.Types.ObjectId(user._id.toString());
        queryConditions.push({ organizerId: userId });
        console.log("🔵 [organizer/notifications] Looking for events with organizerId (User):", userId.toString());
        
        const events = await Event.find({
            $or: queryConditions
        }).select('_id').lean();

        const eventIds = events.map(event => event._id.toString());
        console.log(`🔵 [organizer/notifications] Found ${eventIds.length} events for organizer`);

        if (eventIds.length === 0) {
            // No events, return empty notifications
            return handleSuccessResponse("Notifications retrieved successfully", {
                notifications: [],
                unreadCount: 0,
                count: 0,
            });
        }

        // Step 2: Get all notifications where metadata.eventId matches any of the organizer's event IDs
        // Also include notifications where userId matches the organizer (for direct notifications)
        // Exclude user_book_pending and user_booking_confirmation notifications as those are user-specific
        const notificationQuery: any = {
            $or: [
                // Notifications for events created by this organizer
                { 'metadata.eventId': { $in: eventIds } },
                // Direct notifications to the organizer user
                { userId: userId }
            ],
            // Exclude user-specific notification types
            type: { $nin: ['user_book_pending', 'user_booking_confirmation'] }
        };

        if (unreadOnly) {
            notificationQuery.read = false;
        }

        console.log('🔔 [organizer/notifications] Query:', {
            eventIds: eventIds.slice(0, 5), // Log first 5 for debugging
            totalEventIds: eventIds.length,
            unreadOnly,
            query: notificationQuery
        });

        const notifications = await Notification.find(notificationQuery)
            .sort({ createdAt: -1 })
            .limit(limit);

        console.log(`🔔 [organizer/notifications] Found ${notifications.length} notifications`);

        // Count unread notifications (for events created by organizer or direct to organizer)
        // Exclude user_book_pending and user_booking_confirmation notifications as those are user-specific
        const unreadQuery: any = {
            $or: [
                { 'metadata.eventId': { $in: eventIds } },
                { userId: userId }
            ],
            read: false,
            // Exclude user-specific notification types
            type: { $nin: ['user_book_pending', 'user_booking_confirmation'] }
        };

        const unreadCount = await Notification.countDocuments(unreadQuery);
        console.log(`🔔 [organizer/notifications] Unread count: ${unreadCount}`);

        const formattedNotifications = notifications.map((notif: any) => ({
            id: notif._id.toString(),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            link: notif.link,
            read: notif.read,
            readAt: notif.readAt,
            createdAt: notif.createdAt,
            metadata: notif.metadata,
        }));

        return handleSuccessResponse("Notifications retrieved successfully", {
            notifications: formattedNotifications,
            unreadCount,
            count: formattedNotifications.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// Helper function to get organizer's event IDs
async function getOrganizerEventIds(user: any): Promise<string[]> {
    const queryConditions: any[] = [];
    
    if (user.organizerId) {
        const organizerId = user.organizerId instanceof mongoose.Types.ObjectId
            ? user.organizerId
            : new mongoose.Types.ObjectId(user.organizerId.toString());
        queryConditions.push({ organizerId: organizerId });
    }
    
    const userId = user._id instanceof mongoose.Types.ObjectId 
        ? user._id 
        : new mongoose.Types.ObjectId(user._id.toString());
    queryConditions.push({ organizerId: userId });
    
    const events = await Event.find({
        $or: queryConditions
    }).select('_id').lean();

    return events.map(event => event._id.toString());
}

// PATCH - Mark notifications as read
export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

        const { notificationIds, markAllAsRead } = await req.json();

        // Get organizer's event IDs
        const eventIds = await getOrganizerEventIds(user);
        const userId = user._id instanceof mongoose.Types.ObjectId 
            ? user._id 
            : new mongoose.Types.ObjectId(user._id.toString());

        // Build query to match notifications for this organizer's events or direct to organizer
        // Exclude user_book_pending and user_booking_confirmation notifications as those are user-specific
        const notificationQuery: any = {
            $or: [
                { 'metadata.eventId': { $in: eventIds } },
                { userId: userId }
            ],
            // Exclude user-specific notification types
            type: { $nin: ['user_book_pending', 'user_booking_confirmation'] }
        };

        if (markAllAsRead) {
            // Mark all as read
            await Notification.updateMany(
                { ...notificationQuery, read: false },
                { read: true, readAt: new Date() }
            );
        } else if (notificationIds && Array.isArray(notificationIds)) {
            // Mark specific notifications as read (only if they belong to organizer's events)
            await Notification.updateMany(
                { 
                    _id: { $in: notificationIds },
                    ...notificationQuery
                },
                { read: true, readAt: new Date() }
            );
        } else {
            return NextResponse.json(
                { message: "notificationIds array or markAllAsRead flag is required" },
                { status: 400 }
            );
        }

        return handleSuccessResponse("Notifications marked as read", {});
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE - Delete notifications
export async function DELETE(req: NextRequest): Promise<NextResponse> {
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
        const notificationId = searchParams.get('notificationId');
        const deleteAll = searchParams.get('deleteAll') === 'true';

        // Get organizer's event IDs
        const eventIds = await getOrganizerEventIds(user);
        const userId = user._id instanceof mongoose.Types.ObjectId 
            ? user._id 
            : new mongoose.Types.ObjectId(user._id.toString());

        // Build query to match notifications for this organizer's events or direct to organizer
        // Exclude user_book_pending and user_booking_confirmation notifications as those are user-specific
        const notificationQuery: any = {
            $or: [
                { 'metadata.eventId': { $in: eventIds } },
                { userId: userId }
            ],
            // Exclude user-specific notification types
            type: { $nin: ['user_book_pending', 'user_booking_confirmation'] }
        };

        if (deleteAll) {
            // Delete all notifications for the organizer
            await Notification.deleteMany(notificationQuery);
            return handleSuccessResponse("All notifications deleted", {});
        }

        if (!notificationId) {
            return NextResponse.json(
                { message: "Notification ID is required" },
                { status: 400 }
            );
        }

        // Delete specific notification (only if it belongs to organizer's events)
        const result = await Notification.deleteOne({
            _id: notificationId,
            ...notificationQuery
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { message: "Notification not found" },
                { status: 404 }
            );
        }

        return handleSuccessResponse("Notification deleted", {});
    } catch (error) {
        return handleApiError(error);
    }
}

