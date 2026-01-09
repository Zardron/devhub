"use client";

import SideBar from "@/components/admin-dashboard/SideBar";
import Navbar from "@/components/admin-dashboard/Navbar";
import BreadCrumbs from "@/components/admin-dashboard/BreadCrumbs";
import Footer from "@/components/admin-dashboard/Footer";
import { useAuth } from "@/lib/hooks/use-auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sideBarCollapsed, setSideBarCollapsed] = useState(true); // Start collapsed on mobile
    const [isInitialized, setIsInitialized] = useState(false);
    const { user, isAuthenticated, isInitializing } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Wait for auth initialization to complete before redirecting
        if (!isInitializing && (!isAuthenticated || !user || user.role !== "admin")) {
            router.push("/sign-in");
        }
    }, [user, isAuthenticated, isInitializing, router]);

    // Set initial sidebar state based on screen size (only once on mount)
    useEffect(() => {
        if (!isInitialized) {
            // On desktop (md and up), sidebar should be expanded by default
            if (window.innerWidth >= 768) {
                setSideBarCollapsed(false);
            }
            setIsInitialized(true);
        }
    }, [isInitialized]);

    // Prevent horizontal scroll on body
    useEffect(() => {
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.maxWidth = '100vw';
        document.body.style.maxWidth = '100vw';
        
        return () => {
            document.documentElement.style.overflowX = '';
            document.body.style.overflowX = '';
            document.documentElement.style.maxWidth = '';
            document.body.style.maxWidth = '';
        };
    }, []);

    // Show loading state while initializing auth
    if (isInitializing) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated || !user || user.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Redirecting...</div>
            </div>
        );
    }

    return (
        <div className="flex overflow-x-hidden w-full max-w-full">
                {/* Mobile backdrop overlay */}
                {!sideBarCollapsed && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity duration-300"
                        onClick={() => setSideBarCollapsed(true)}
                    />
                )}

            {/* Sidebar - overlay on mobile, fixed on desktop */}
            <div
                className={`fixed left-0 top-0 h-screen z-40 transition-all duration-300 overflow-hidden
                    ${sideBarCollapsed 
                        ? "w-0 -translate-x-full md:translate-x-0" 
                        : "w-64 translate-x-0"
                    }
                    md:translate-x-0
                `}
            >
                <SideBar />
            </div>

            {/* Main content area */}
            <div className={`flex-1 w-full min-w-0 max-w-full transition-all duration-300 overflow-x-hidden ${sideBarCollapsed ? "md:ml-0" : "md:ml-64"}`}>
                {/* Navbar - full width on mobile, adjusted on desktop */}
                <div className={`fixed top-0 z-30 transition-all duration-300 w-full max-w-full right-0 ${sideBarCollapsed ? "md:left-0" : "md:left-64"}`}>
                    <Navbar
                        sideBarCollapsed={sideBarCollapsed}
                        setSideBarCollapsed={setSideBarCollapsed}
                    />
                </div>
                
                {/* Content */}
                <div className="p-3 sm:p-4 pt-20 md:pt-20 overflow-x-hidden max-w-full">
                    <BreadCrumbs />
                    <div className="my-4 overflow-x-hidden max-w-full">{children}</div>
                    <Footer />
                </div>
            </div>
        </div>
    );
}

