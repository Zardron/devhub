"use client";

import { useMemo } from "react";
import { PlusIcon, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { useGetAllUsers } from "@/lib/hooks/api/user.queries";
import { DataTable, type Column } from "@/components/DataTable";
import { IUser } from "@/database/user.model";
import { SAMPLE_ORGANIZERS, ORGANIZER_EMAILS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useDeleteUser } from "@/lib/hooks/api/user.queries";

interface OrganizerDisplay {
    name: string;
    email: string;
    createdAt: Date;
    isSample?: boolean;
    userId?: string; // For actual user accounts
}

export default function AllOrganizersPage() {
    const { data, isLoading, error, isError } = useGetAllUsers();
    const deleteUserMutation = useDeleteUser();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedOrganizer, setSelectedOrganizer] = useState<OrganizerDisplay | null>(null);

    // Combine actual organizer accounts with sample organizers
    const organizers = useMemo(() => {
        const result: OrganizerDisplay[] = [];

        // Add actual organizer user accounts from database
        if (data?.data) {
            const userOrganizers = data.data
                .filter((user: IUser) => user.role === 'organizer')
                .map((user: IUser) => ({
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                    isSample: false,
                    userId: user._id.toString(),
                }));
            result.push(...userOrganizers);
        }

        // Add sample organizers with their emails
        // Use a default date (e.g., 1 year ago) for sample organizers
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 1);

        const sampleOrganizers: OrganizerDisplay[] = SAMPLE_ORGANIZERS.map((name) => ({
            name,
            email: ORGANIZER_EMAILS[name] || `contact@${name.toLowerCase()}.com`,
            createdAt: defaultDate,
            isSample: true,
        }));

        // Only add sample organizers that don't already exist as user accounts
        const existingNames = new Set(result.map(org => org.name.toLowerCase()));
        sampleOrganizers.forEach(sample => {
            if (!existingNames.has(sample.name.toLowerCase())) {
                result.push(sample);
            }
        });

        // Sort by name
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);

    const handleDelete = (organizer: OrganizerDisplay) => {
        if (organizer.isSample) {
            toast.error("Cannot Delete Sample Organizer", {
                description: "Sample organizers cannot be deleted. They are part of the default organizer list.",
                duration: 5000,
            });
            return;
        }
        setSelectedOrganizer(organizer);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedOrganizer || !selectedOrganizer.userId) return;

        deleteUserMutation.mutate(selectedOrganizer.userId, {
            onSuccess: () => {
                toast.success("Organizer Deleted Successfully!", {
                    description: `Organizer "${selectedOrganizer.name}" has been deleted.`,
                    duration: 5000,
                });
                setDeleteDialogOpen(false);
                setSelectedOrganizer(null);
            },
            onError: (error) => {
                toast.error("Failed to Delete Organizer", {
                    description: error.message || "An error occurred while deleting the organizer.",
                    duration: 5000,
                });
            },
        });
    };

    const columns: Column<OrganizerDisplay>[] = [
        {
            key: "name",
            header: "Name",
            render: (value: string, row: OrganizerDisplay) => {
                return (
                    <div className="flex items-center gap-2">
                        <span>{value}</span>
                        {row.isSample && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Sample
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "email",
            header: "Email",
        },
        {
            key: "createdAt",
            header: "Created At",
            render: (value: Date) => {
                if (!value) return "-";
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            },
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">All Organizers</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all event organizers on the platform
                    </p>
                </div>
                <Link
                    href="/admin-dashboard/add-organizers"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add Organizer
                </Link>
            </div>

            <div className="border rounded-lg p-6">
                <DataTable
                    data={organizers}
                    columns={columns}
                    searchable={true}
                    searchPlaceholder="Search by name or email..."
                    searchKeys={["name", "email"]}
                    loading={isLoading}
                    emptyMessage="No organizers found"
                    actions={(row: OrganizerDisplay) => {
                        return (
                            <div className="flex items-center gap-2">
                                {!row.isSample && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(row)}
                                            disabled={deleteUserMutation.isPending}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Delete
                                        </Button>
                                    </>
                                )}
                                {row.isSample && (
                                    <span className="text-xs text-muted-foreground">Sample organizer</span>
                                )}
                            </div>
                        );
                    }}
                />
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Organizer</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedOrganizer?.name}</strong>? This action cannot be undone and will permanently remove the organizer account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
