"use client";

import { useGetAllUsers } from "@/lib/hooks/api/user.queries";
import { useEffect } from "react";


export default function AddUsersPage() {
    const { data, isLoading, error, isError } = useGetAllUsers();

    useEffect(() => {
        if (data) {
            console.log(data);
        }
    }, [data]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Add Users</h1>
                <p className="text-muted-foreground mt-2">
                    Add a new user to the platform
                </p>
            </div>

            <div className="max-w-2xl">
                <div className="border rounded-lg p-6">
                    <p className="text-muted-foreground">
                        User form will be implemented here.
                    </p>
                </div>
            </div>
        </div>
    );
}