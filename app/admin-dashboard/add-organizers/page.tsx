"use client";

import { useState } from "react";
import { useCreateUser } from "@/lib/hooks/api/user.queries";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AddOrganizersPage() {
    const [formData, setFormData] = useState({
        organizerName: "",
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const createUserMutation = useCreateUser();

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Password validation: at least 8 characters, contains uppercase, lowercase, number, and special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        // Validate organizer name
        if (!formData.organizerName.trim()) {
            newErrors.organizerName = "Organizer name is required";
        } else if (formData.organizerName.trim().length > 100) {
            newErrors.organizerName = "Organizer name must be 100 characters or less";
        }

        // Validate name (auto-populated)
        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        } else if (formData.name.trim().length > 100) {
            newErrors.name = "Name must be 100 characters or less";
        }

        // Validate email
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        // Validate password
        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (!passwordRegex.test(formData.password)) {
            newErrors.password =
                "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (@$!%*?&)";
        }

        // Validate confirm password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrors({});

        if (!validateForm()) {
            return;
        }

        createUserMutation.mutate(
            {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
                role: "organizer",
            },
            {
                onSuccess: (data) => {
                    toast.success("Organizer Created Successfully!", {
                        description: data.message || `Organizer "${formData.name.trim()}" has been created.`,
                        duration: 5000,
                    });
                    // Reset form
                    setFormData({
                        organizerName: "",
                        name: "",
                        email: "",
                        password: "",
                        confirmPassword: "",
                    });
                },
                onError: (error) => {
                    toast.error("Failed to Create Organizer", {
                        description: error.message || "An error occurred while creating the organizer. Please try again.",
                        duration: 5000,
                    });
                },
            }
        );
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        
        // Auto-populate name field when organizer name changes
        if (name === "organizerName") {
            const autoName = value.trim() ? `${value.trim()} Admin` : "";
            setFormData((prev) => ({
                ...prev,
                [name]: value,
                name: autoName,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
        
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Add Organizers</h1>
                <p className="text-muted-foreground mt-2">
                    Add a new event organizer to the platform
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2">
                    <div className="border rounded-lg bg-card shadow-sm">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold">Organizer Information</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Fill in the details to create a new organizer account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Organizer Name Field */}
                                <FormInput
                                    id="organizerName"
                                    name="organizerName"
                                    type="text"
                                    label="Organizer Name"
                                    placeholder="Microsoft, Apple, Amazon, etc."
                                    value={formData.organizerName}
                                    onChange={handleChange}
                                    error={errors.organizerName}
                                    required
                                    containerClassName="md:col-span-2"
                                />

                                {/* Full Name Field (Auto-populated) */}
                                <FormInput
                                    id="name"
                                    name="name"
                                    type="text"
                                    label="Full Name"
                                    placeholder="Auto-populated from organizer name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    error={errors.name}
                                    required
                                    containerClassName="md:col-span-2"
                                    helperText="Automatically set to 'Organizer Name + Admin'"
                                />

                                {/* Email Field */}
                                <FormInput
                                    id="email"
                                    name="email"
                                    type="email"
                                    label="Email Address"
                                    placeholder="contact@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    error={errors.email}
                                    required
                                    containerClassName="md:col-span-2"
                                />

                                {/* Password Field */}
                                <FormInput
                                    id="password"
                                    name="password"
                                    type="password"
                                    label="Password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    error={errors.password}
                                    helperText={
                                        !errors.password
                                            ? "8+ chars, uppercase, lowercase, number, special char"
                                            : undefined
                                    }
                                    required
                                />

                                {/* Confirm Password Field */}
                                <FormInput
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    label="Confirm Password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    error={errors.confirmPassword}
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setFormData({
                                            organizerName: "",
                                            name: "",
                                            email: "",
                                            password: "",
                                            confirmPassword: "",
                                        });
                                        setErrors({});
                                    }}
                                    disabled={createUserMutation.isPending}
                                >
                                    Reset
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createUserMutation.isPending}
                                    size="lg"
                                >
                                    {createUserMutation.isPending
                                        ? "Creating Organizer..."
                                        : "Create Organizer"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Info Card Section */}
                <div className="lg:col-span-1">
                    <div className="border rounded-lg bg-card shadow-sm sticky top-4">
                        <div className="p-6 border-b">
                            <h2 className="text-lg font-semibold">Organizer Role</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Understanding organizer permissions
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Organizer Role */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <h3 className="font-semibold text-sm">Organizer</h3>
                                </div>
                                <p className="text-sm text-muted-foreground ml-4">
                                    Can create and manage events. Has access to event management tools and booking analytics.
                                </p>
                            </div>

                            <div className="pt-4 border-t space-y-3">
                                <h3 className="font-semibold text-sm">Quick Tips</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Ensure email addresses are unique and valid</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Passwords must meet all security requirements</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Organizers will receive a confirmation email</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        <span>Organizers can create and manage their own events</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="font-semibold text-sm mb-2">Password Requirements</h3>
                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Minimum 8 characters
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        One uppercase letter
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        One lowercase letter
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        One number
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        One special character (@$!%*?&)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
