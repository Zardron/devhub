import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export interface AppealWithUser {
    _id: string;
    email: string;
    reason: string;
    userId?: string;
    status: 'pending' | 'reviewed' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: string;
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    } | null;
}

export interface BannedUser {
    id: string;
    name: string;
    email: string;
    role: string;
    bannedAt: string;
}

export interface AppealsResponse {
    appeals: AppealWithUser[];
    bannedUsers: BannedUser[];
    totalAppeals: number;
    totalBannedUsers: number;
}

export const useGetAppeals = () => {
    const { token } = useAuthStore();
    const router = useRouter();

    return useQuery<AppealsResponse>({
        queryKey: ['admin', 'appeals'],
        queryFn: async () => {
            if (!token) {
                router.push('/sign-in');
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BASE_URL}/api/admin/appeals`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                useAuthStore.getState().clearAuth();
                router.push('/sign-in');
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error('Failed to fetch appeals');
            }

            const data = await response.json();
            // handleSuccessResponse spreads the data object, so the structure is already correct
            return {
                appeals: data.appeals || [],
                bannedUsers: data.bannedUsers || [],
                totalAppeals: data.totalAppeals || 0,
                totalBannedUsers: data.totalBannedUsers || 0,
            };
        },
        enabled: !!token,
    });
};

export const useUpdateAppeal = () => {
    const { token } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation<
        { appeal: AppealWithUser },
        Error,
        { appealId: string; status: 'pending' | 'reviewed' | 'approved' | 'rejected'; adminNotes?: string }
    >({
        mutationFn: async ({ appealId, status, adminNotes }) => {
            if (!token) {
                router.push('/sign-in');
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${BASE_URL}/api/admin/appeals`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ appealId, status, adminNotes }),
            });

            if (response.status === 401) {
                useAuthStore.getState().clearAuth();
                router.push('/sign-in');
                throw new Error('Unauthorized');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update appeal');
            }

            // handleSuccessResponse spreads the data object
            return {
                appeal: data.appeal,
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'appeals'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });
};

