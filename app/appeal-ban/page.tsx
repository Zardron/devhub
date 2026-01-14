"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Mail, FileText, CheckCircle2, XCircle, ArrowLeft, MessageSquare } from "lucide-react";
import AnimateOnScroll from "@/components/AnimateOnScroll";

export default function AppealBanPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        reason: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitMessage(null);

        try {
            const response = await fetch('/api/appeals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit appeal');
            }

            setSubmitMessage({
                type: 'success',
                text: 'Your appeal has been submitted successfully. We will review it and get back to you via email.'
            });
            setFormData({ email: "", reason: "" });
        } catch (error) {
            setSubmitMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to submit appeal. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <section className="fixed inset-0 h-screen w-full z-10 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Back to Sign In Link - Upper Left */}
            <Link
                href="/sign-in"
                className="fixed top-6 left-6 z-50 flex items-center gap-2 text-light-200 hover:text-primary transition-all duration-200 group px-4 py-2 rounded-md hover:bg-dark-100/30 backdrop-blur-sm"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="text-sm font-medium">Back to Sign In</span>
            </Link>

            {/* Background Effects - Behind the container */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>

            {/* Main Glassmorphism Container */}
            <div className="w-full max-w-2xl mx-auto my-auto bg-dark-100/40 backdrop-blur-2xl border border-red-500/20 rounded-md shadow-2xl overflow-hidden relative z-10 animate-scale-in">
                {/* Subtle inner glow with red accent */}
                <div className="absolute inset-0 bg-linear-to-br from-red-500/5 via-primary/5 to-blue/5 pointer-events-none" />

                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-md bg-linear-to-r from-red-500/20 via-transparent to-primary/20 opacity-50 blur-xl pointer-events-none animate-pulse" />

                <div className="relative z-10 p-6 sm:p-8">
                    <AnimateOnScroll variant="fade">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="inline-block mb-4 relative">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-full bg-linear-to-br from-red-500/20 to-red-600/30 border-2 border-red-500/40 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
                                    <AlertCircle className="w-8 h-8 text-red-400" strokeWidth={2.5} />
                                </div>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground bg-linear-to-r from-foreground to-foreground/80 bg-clip-text">
                                Appeal Account Ban
                            </h1>
                            <div className="w-24 h-1 bg-linear-to-r from-transparent via-red-500/50 to-transparent mx-auto mb-3 rounded-full" />
                            <p className="text-light-200 text-xs max-w-md mx-auto leading-relaxed">
                                If you believe your account was banned in error, please submit an appeal. We'll review your case and respond via email.
                            </p>
                        </div>

                        {/* Appeal Form */}
                        <div className="bg-dark-200/60 backdrop-blur-xl border border-red-500/20 rounded-md shadow-lg px-5 py-5 relative overflow-hidden">
                            {/* Subtle glow effect inside card */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                            <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="text-light-100 text-sm font-medium flex items-center gap-2"
                                    >
                                        <Mail className="w-4 h-4 text-primary" />
                                        Email Address <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            placeholder="Enter your email address"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="bg-dark-100/80 backdrop-blur-sm rounded-md px-4 py-3 pl-11 w-full text-sm text-foreground placeholder:text-light-200/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 border border-border-dark/50 transition-all duration-300 hover:border-primary/40"
                                        />
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-200/40 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Reason Field */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="reason"
                                        className="text-light-100 text-sm font-medium flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4 text-primary" />
                                        Appeal Reason <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            id="reason"
                                            name="reason"
                                            placeholder="Please explain why you believe your account should be unbanned. Include any relevant details or context that may help us understand your situation better."
                                            value={formData.reason}
                                            onChange={handleChange}
                                            required
                                            rows={5}
                                            className="bg-dark-100/80 backdrop-blur-sm rounded-md px-4 py-2.5 pl-11 w-full text-sm text-foreground placeholder:text-light-200/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 border border-border-dark/50 transition-all duration-300 hover:border-primary/40 resize-none leading-relaxed"
                                        />
                                        <FileText className="absolute left-3 top-3 w-4 h-4 text-light-200/40 pointer-events-none" />
                                    </div>
                                    <div className="flex items-start gap-2 p-2.5 bg-primary/5 border border-primary/10 rounded-md">
                                        <MessageSquare className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                        <p className="text-light-200/70 text-xs leading-relaxed">
                                            Please provide a detailed explanation. This will help us review your case more effectively.
                                        </p>
                                    </div>
                                </div>

                                {/* Messages */}
                                {submitMessage && (
                                    <div className={`relative p-3 rounded-md border backdrop-blur-sm overflow-hidden ${submitMessage.type === 'success'
                                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                                        }`}>
                                        <div className={`absolute inset-0 opacity-10 ${submitMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                                            }`} />
                                        <div className="relative flex items-start gap-2.5">
                                            {submitMessage.type === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                            ) : (
                                                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            )}
                                            <p className="text-xs font-medium leading-relaxed">{submitMessage.text}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="group relative w-full bg-linear-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary cursor-pointer items-center justify-center rounded-md px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <span className="relative flex items-center justify-center gap-2">
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                                Submitting Appeal...
                                            </>
                                        ) : (
                                            <>
                                                <MessageSquare className="w-4 h-4" />
                                                Submit Appeal
                                            </>
                                        )}
                                    </span>
                                </button>
                            </form>
                        </div>

                        {/* Additional Information */}
                        <div className="mt-5 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-200/30 backdrop-blur-sm border border-blue/10 rounded-md">
                                <p className="text-light-200 text-xs">
                                    Need additional help?{" "}
                                    <Link
                                        href="/contact"
                                        className="group text-primary hover:text-primary/80 font-medium transition-colors duration-200 hover:underline inline-flex items-center gap-1 ml-1"
                                    >
                                        Contact Support
                                        <span className="text-primary/60 group-hover:translate-x-1 transition-transform duration-200">→</span>
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </AnimateOnScroll>
                </div>
            </div>
        </section>
    );
}

