"use client"

import { useEffect, useRef, useState } from "react"

interface AnimateOnScrollProps {
    children: React.ReactNode
    delay?: number
    className?: string
    variant?: "fade" | "scale" | "slide" | "glow"
}

const AnimateOnScroll = ({
    children,
    delay = 0,
    className = "",
    variant = "fade"
}: AnimateOnScrollProps) => {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const hasAnimatedRef = useRef(false) // Track if element has ever been animated

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimatedRef.current) {
                    // Only animate if it hasn't been animated before
                    // Clear any existing timeout
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current)
                    }
                    // Set visibility after delay
                    timeoutRef.current = setTimeout(() => {
                        setIsVisible(true)
                        hasAnimatedRef.current = true // Mark as animated
                    }, delay)
                } else if (entry.isIntersecting && hasAnimatedRef.current) {
                    // If already animated, keep it visible
                    setIsVisible(true)
                }
                // Don't reset visibility when leaving viewport if it has been animated
            },
            {
                threshold: 0.1,
                rootMargin: "0px 0px -50px 0px"
            }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
            if (ref.current) {
                observer.unobserve(ref.current)
            }
        }
    }, [delay])

    return (
        <div
            ref={ref}
            className={`animate-on-scroll animate-on-scroll-${variant} ${isVisible ? "visible" : ""} ${className}`}
        >
            {children}
        </div>
    )
}

export default AnimateOnScroll

