"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const ticketNumber = searchParams.get("ticketNumber");
    
    const hideNavbar = 
        pathname.startsWith("/admin-dashboard") || 
        pathname.startsWith("/organizer-dashboard") ||
        pathname === "/appeal-ban" ||
        (pathname === "/bookings" && ticketNumber !== null);

    if (hideNavbar) {
        return null;
    }

    return (
        <Navbar />
    );
}

