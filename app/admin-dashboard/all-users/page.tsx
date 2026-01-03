"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useGetAllUsers } from "@/lib/hooks/api/user.queries";
import { DataTable, type Column } from "@/components/DataTable";
import { IUser } from "@/database/user.model";

export default function AllUsersPage() {
    const { data, isLoading, error, isError } = useGetAllUsers();

    const users = data?.data || [];

    const columns: Column<IUser>[] = [
        {
            key: "name",
            header: "Name",
        },
        {
            key: "email",
            header: "Email",
        },
        {
            key: "role",
            header: "Role",
            render: (value: string) => {
                const isAdmin = value === "admin";
                return (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAdmin
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                    >
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                    </span>
                );
            },
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
                    <h1 className="text-3xl font-bold">All Users</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all users on the platform
                    </p>
                </div>
                <Link
                    href="/admin-dashboard/add-users"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add User
                </Link>
            </div>

            <div className="border rounded-lg p-6">
                <DataTable
                    data={users}
                    columns={columns}
                    searchable={true}
                    searchPlaceholder="Search by name or email..."
                    searchKeys={["name", "email"]}
                    filters={[
                        {
                            key: "role",
                            label: "Role",
                            options: [
                                { value: "admin", label: "Admin" },
                                { value: "user", label: "User" },
                            ],
                        },
                    ]}
                    loading={isLoading}
                    emptyMessage="No users found"
                />
            </div>
        </div>
    );
}