import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import OrganizerApplication from "@/database/organizer-application.model";
import Organizer from "@/database/organizer.model";
import Plan from "@/database/plan.model";
import Notification from "@/database/notification.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import mongoose from "mongoose";

// GET - Get organizer applications (for users: their own, for admins: all)
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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        // Build query
        const query: any = {};
        if (user.role !== 'admin') {
            // Regular users can only see their own applications
            query.userId = user._id;
        }
        if (status) {
            query.status = status;
        }

        // Debug logging
        console.log('🔍 Organizer Applications API - Debug Info:');
        console.log('  User role:', user.role);
        console.log('  Query:', JSON.stringify(query, null, 2));
        console.log('  Status filter:', status || 'none');

        // Get applications and preserve original userId ObjectIds
        const applicationsRaw = await OrganizerApplication.find(query)
            .lean()
            .sort({ createdAt: -1 });

        console.log('  Found applications (raw):', applicationsRaw.length);

        // Extract all userIds and reviewedBy IDs (convert to ObjectIds for querying)
        const userIdStrings = applicationsRaw
            .map((app: any) => {
                if (!app.userId) return null;
                // Convert to string first, then to ObjectId
                const idStr = typeof app.userId === 'string' 
                    ? app.userId 
                    : (app.userId.toString ? app.userId.toString() : String(app.userId));
                return mongoose.Types.ObjectId.isValid(idStr) ? idStr : null;
            })
            .filter((id: any) => id != null);
        
        const reviewedByStrings = applicationsRaw
            .map((app: any) => {
                if (!app.reviewedBy) return null;
                // Convert to string first, then to ObjectId
                const idStr = typeof app.reviewedBy === 'string' 
                    ? app.reviewedBy 
                    : (app.reviewedBy.toString ? app.reviewedBy.toString() : String(app.reviewedBy));
                return mongoose.Types.ObjectId.isValid(idStr) ? idStr : null;
            })
            .filter((id: any) => id != null);

        // Convert to ObjectIds for MongoDB query
        const userIds = userIdStrings.map((id: string) => new mongoose.Types.ObjectId(id));
        const reviewedByIds = reviewedByStrings.map((id: string) => new mongoose.Types.ObjectId(id));

        // Fetch users (excluding deleted ones)
        const users = userIds.length > 0
            ? await User.find({ 
                _id: { $in: userIds },
                deleted: { $ne: true }
            }).select('name email')
            : [];
        const reviewers = reviewedByIds.length > 0
            ? await User.find({
                _id: { $in: reviewedByIds },
                deleted: { $ne: true }
            }).select('name email')
            : [];

        // Create maps for quick lookup (use string IDs as keys)
        const userMap = new Map(users.map((user: any) => [user._id.toString(), user]));
        const reviewerMap = new Map(reviewers.map((reviewer: any) => [reviewer._id.toString(), reviewer]));

        console.log('  Users found:', users.length);
        console.log('  Reviewers found:', reviewers.length);

        // Manually populate planId to avoid strictPopulate issues
        const planIds = applicationsRaw
            .map((app: any) => app.planId)
            .filter((id: any) => id != null);
        
        const plans = planIds.length > 0 
            ? await Plan.find({ _id: { $in: planIds } }).select('name price')
            : [];
        
        const planMap = new Map(plans.map((plan: any) => [plan._id.toString(), plan]));

        const formattedApplications = applicationsRaw.map((app: any) => {
            // Get user info from map - convert userId to string
            let userIdStr = 'Unknown';
            if (app.userId) {
                userIdStr = typeof app.userId === 'string' 
                    ? app.userId 
                    : (app.userId.toString ? app.userId.toString() : String(app.userId));
            }
            const user = userIdStr !== 'Unknown' ? userMap.get(userIdStr) : null;
            const userName = user ? user.name : 'Unknown User';
            const userEmail = user ? user.email : 'Unknown Email';

            // Get reviewer info from map - convert reviewedBy to string
            let reviewerIdStr: string | null = null;
            if (app.reviewedBy) {
                reviewerIdStr = typeof app.reviewedBy === 'string' 
                    ? app.reviewedBy 
                    : (app.reviewedBy.toString ? app.reviewedBy.toString() : String(app.reviewedBy));
            }
            const reviewer = reviewerIdStr ? reviewerMap.get(reviewerIdStr) : null;

            return {
                id: app._id.toString(),
                userId: userIdStr,
                userName: userName,
                userEmail: userEmail,
                organizerName: app.organizerName,
                companyName: app.companyName,
                description: app.description,
                website: app.website,
                phone: app.phone,
                address: app.address,
                planId: app.planId ? (typeof app.planId === 'string' ? app.planId : (app.planId.toString ? app.planId.toString() : String(app.planId))) : null,
                plan: app.planId ? planMap.get(app.planId.toString()) || null : null,
                status: app.status,
                reviewedBy: reviewer ? {
                    id: reviewer._id.toString(),
                    name: reviewer.name,
                    email: reviewer.email,
                } : null,
                reviewedAt: app.reviewedAt,
                rejectionReason: app.rejectionReason,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt,
            };
        });

        console.log('  Formatted applications:', formattedApplications.length);
        console.log('✅ Organizer Applications API - Success');

        // Return response in the format expected by frontend: { message, data: { applications, count } }
        return NextResponse.json({
            message: "Applications retrieved successfully",
            data: {
                applications: formattedApplications,
                count: formattedApplications.length,
            }
        }, { status: 200 });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Submit organizer application
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

        // Check if user is already an organizer
        if (user.role === 'organizer') {
            return NextResponse.json(
                { message: "You are already an organizer" },
                { status: 400 }
            );
        }

        // Check if user has a pending application
        const existingApplication = await OrganizerApplication.findOne({
            userId: user._id,
            status: 'pending',
        });

        if (existingApplication) {
            return NextResponse.json(
                { message: "You already have a pending application" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { organizerName, companyName, description, website, phone, address, planId } = body;

        // Debug: Log received data
        console.log('Received request body:', {
            organizerName,
            planId,
            planIdType: typeof planId,
            planIdValue: planId
        });

        // Validate required fields
        if (!organizerName || !organizerName.trim()) {
            return NextResponse.json(
                { message: "Organizer name is required" },
                { status: 400 }
            );
        }

        if (!description || !description.trim()) {
            return NextResponse.json(
                { message: "Description is required" },
                { status: 400 }
            );
        }

        // Validate and convert planId if provided
        let planIdObjectId: mongoose.Types.ObjectId | undefined = undefined;
        if (planId && typeof planId === 'string' && planId.trim() !== '') {
            console.log('Processing planId:', planId);
            try {
                planIdObjectId = new mongoose.Types.ObjectId(planId.trim());
                console.log('Converted planId to ObjectId:', planIdObjectId.toString());
                
                // Validate that the plan exists and is active (but don't fail if it doesn't)
                const plan = await Plan.findById(planIdObjectId);
                console.log('Plan found:', plan ? { id: plan._id.toString(), name: plan.name, isActive: plan.isActive } : 'not found');
                
                if (!plan) {
                    console.warn('Plan not found for planId:', planIdObjectId.toString(), '- but will save planId anyway');
                } else if (!plan.isActive) {
                    console.warn('Plan is inactive for planId:', planIdObjectId.toString(), '- but will save planId anyway');
                } else {
                    console.log('Plan validation passed for planId:', planIdObjectId.toString());
                }
                // Always save the planId if conversion was successful, even if plan validation fails
            } catch (error) {
                console.error('Error converting planId to ObjectId:', error);
                return NextResponse.json(
                    { message: "Invalid plan ID format" },
                    { status: 400 }
                );
            }
        } else {
            console.log('No planId provided or planId is empty. planId value:', planId, 'type:', typeof planId);
        }

        // Check if organizer name is already taken
        const existingOrganizer = await Organizer.findOne({
            name: organizerName.trim(),
            deleted: { $ne: true }
        });

        if (existingOrganizer) {
            return NextResponse.json(
                { message: "Organizer name is already taken" },
                { status: 409 }
            );
        }

        // Create application
        const applicationData: any = {
            userId: user._id,
            organizerName: organizerName.trim(),
            description: description.trim(),
            status: 'pending',
        };

        // Add optional fields only if they have values
        if (companyName?.trim()) {
            applicationData.companyName = companyName.trim();
        }
        if (website?.trim()) {
            applicationData.website = website.trim();
        }
        if (phone?.trim()) {
            applicationData.phone = phone.trim();
        }
        if (address?.trim()) {
            applicationData.address = address.trim();
        }

        // Include planId if it was provided and validated
        if (planIdObjectId && planIdObjectId instanceof mongoose.Types.ObjectId) {
            applicationData.planId = planIdObjectId;
            console.log('Added planId to applicationData:', {
                planId: planIdObjectId.toString(),
                isValid: mongoose.Types.ObjectId.isValid(planIdObjectId),
                isObjectId: planIdObjectId instanceof mongoose.Types.ObjectId
            });
        } else {
            console.log('planIdObjectId is undefined or invalid, not adding to applicationData. planIdObjectId:', planIdObjectId);
        }

        // Debug: Log the data being saved (remove in production if needed)
        console.log('Creating application with data:', {
            ...applicationData,
            planId: applicationData.planId ? applicationData.planId.toString() : 'not provided',
            planIdType: applicationData.planId ? typeof applicationData.planId : 'undefined',
            planIdIsObjectId: applicationData.planId instanceof mongoose.Types.ObjectId
        });

        // Use constructor and save() instead of create() to ensure all fields are saved
        const application = new OrganizerApplication(applicationData);
        
        // Explicitly mark planId as modified if it exists to ensure it's saved
        if (applicationData.planId) {
            application.markModified('planId');
        }
        
        await application.save();
        
        // Verify planId was saved - reload from DB to be sure
        const savedApplication = await OrganizerApplication.findById(application._id);
        console.log('Application created and retrieved from DB:', {
            id: savedApplication?._id.toString(),
            planId: savedApplication?.planId ? savedApplication.planId.toString() : 'NOT SAVED',
            planIdExists: !!savedApplication?.planId,
            allFields: Object.keys(savedApplication?.toObject() || {})
        });

        // Create notifications for all admins
        try {
            // Find all admin users
            const adminUsers = await User.find({
                role: 'admin',
                deleted: { $ne: true }
            }).select('_id');

            console.log(`Found ${adminUsers.length} admin users to notify`);
            if (adminUsers.length > 0) {
                console.log('Admin user IDs:', adminUsers.map(admin => admin._id.toString()));
            }

            // Create notifications for each admin
            if (adminUsers.length > 0) {
                const notifications = adminUsers.map((admin) => {
                    // Ensure userId is properly formatted as ObjectId
                    const adminUserId = admin._id instanceof mongoose.Types.ObjectId 
                        ? admin._id 
                        : new mongoose.Types.ObjectId(admin._id.toString());
                    
                    return {
                        userId: adminUserId,
                        type: 'organizer_application_submitted',
                        title: 'New Organizer Application',
                        message: `${user.name} (${user.email}) has submitted an application to become "${organizerName.trim()}". Please review it.`,
                        link: `/admin-dashboard/organizer-applications`,
                        metadata: {
                            applicationId: application._id.toString(),
                            applicantId: user._id.toString(),
                            organizerName: organizerName.trim(),
                        },
                    };
                });

                const createdNotifications = await Notification.insertMany(notifications);
                console.log(`Successfully created ${createdNotifications.length} notifications for admins`);
                console.log('Created notification IDs:', createdNotifications.map(n => ({
                    id: n._id.toString(),
                    userId: n.userId.toString()
                })));
            } else {
                console.warn('No admin users found to notify about organizer application');
            }
        } catch (notificationError) {
            // Log error but don't fail the application submission
            console.error('Failed to create admin notifications:', notificationError);
            console.error('Notification error details:', {
                message: notificationError instanceof Error ? notificationError.message : 'Unknown error',
                stack: notificationError instanceof Error ? notificationError.stack : undefined
            });
        }

        return handleSuccessResponse("Application submitted successfully", {
            application: {
                id: application._id.toString(),
                organizerName: application.organizerName,
                status: application.status,
                createdAt: application.createdAt,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

