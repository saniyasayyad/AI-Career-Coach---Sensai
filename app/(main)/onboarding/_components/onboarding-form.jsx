"use client";

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema } from '../../../lib/schema';
import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { industries } from '../../../../components/data/industries'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Label } from '../../../../components/ui/label';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Button } from '../../../../components/ui/button';
import { toast } from 'sonner';
import useFetch from '../../../../hooks/use-fetch';
import { updateUser,debugDatabaseSave  } from '../../../../actions/user';
import { Loader2 } from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs'; 
// At the top of your onboarding form file


const OnboardingForm = () => {
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const router = useRouter();
  const { isSignedIn, userId } = useAuth(); // Get userId from auth
  const { user, isLoaded } = useUser(); // Add user loading state

  const {
    loading: updateLoading,
    fn: updateUserFn,
    data: updateResult,
    error: updateError,
  }= useFetch(updateUser)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      industry: "",
      subIndustry: "",
      experience: "",
      skills: "",
      bio: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      // Wait for user to be loaded
      if (!isLoaded) {
        toast.error("Loading user information...");
        return;
      }

      // Check authentication more thoroughly
      if (!isSignedIn || !userId || !user) {
        toast.error("Authentication expired. Please sign in again.");
        // Use window.location for a full page refresh to ensure auth state is reset
        window.location.href = '/sign-in';
        return;
      }

      // Validate required fields
      if (!values.industry || !values.subIndustry) {
        toast.error("Please select both industry and specialization.");
        return;
      }

      const formattedIndustry = `${values.industry} - ${values.subIndustry
      .toLowerCase()
      .replace(/ /g, "-")}`;

      // Process skills safely
      const processedSkills = values.skills && typeof values.skills === 'string' 
        ? values.skills.split(',').map(skill => skill.trim()).filter(Boolean)
        : Array.isArray(values.skills) ? values.skills : [];
      
      console.log("Skills before formatting:", values.skills);
      console.log("Skills after formatting:", processedSkills);

      // Ensure all required fields are present
      if (!formattedIndustry) {
        toast.error("Industry is required");
        return;
      }

      const dataToSend = {
        industry: formattedIndustry,
        experience: values.experience ? parseInt(values.experience) : 0,
        bio: values.bio || "",
        skills: processedSkills,
      };

      console.log("Submitting data:", dataToSend);
      console.log("User ID:", userId);

      // Add a loading toast to provide feedback during submission
      const loadingToast = toast.loading("Saving your profile...");
      
      console.log("Sending data to updateUser:", dataToSend);
      
      try {
        console.log("=== Testing database before submission ===");
        const debugResult = await debugDatabaseSave(dataToSend);
        console.log("Debug result:", debugResult);
        
         const result = await updateUserFn(dataToSend);
         console.log("Update result:", result);
         
         // Dismiss the loading toast
         toast.dismiss(loadingToast);
         
         if (result?.requiresAuth) {
           console.log("Authentication expired, redirecting to sign-in");
           toast.error("Your session has expired. Please sign in again.");
           setTimeout(() => {
             router.push('/sign-in');
           }, 1500);
           return;
         }

         if (result?.success) {
           toast.success("Profile completed successfully!");
           console.log("Success! Redirecting to dashboard...");
           setTimeout(() => {
             router.push('/dashboard');
             router.refresh();
           }, 1000); // Small delay to ensure toast is seen
           return;
         }

         if (result?.message) {
           console.error("Error message from server:", result.message);
           toast.error(result.message);
           return;
         }

         console.error("No success or error message in result:", result);
         toast.error("Unable to complete profile. Please try again.");
       } catch (error) {
         console.error("Error submitting form:", error);
         toast.dismiss(loadingToast);
         toast.error("An unexpected error occurred. Please try again.");
       } 
    } catch (error) {
      console.error("Onboarding error:", error);
      
      // Check if it's an authentication error
      if (error.message?.includes('auth') || error.message?.includes('sign')) {
        toast.error("Authentication expired. Please sign in again.");
        window.location.href = '/sign-in';
        return;
      }
      
      toast.error("An error occurred while saving your profile. Please try again.");
    }    
  };

  // Handle successful updates from useFetch
  useEffect(() => {
    if (updateResult?.success && !updateLoading) {
      toast.success("Profile completed successfully!");
      router.push('/dashboard');
      router.refresh();
    }
    
    // Handle authentication errors
    if (updateResult?.requiresAuth) {
      toast.error("Authentication expired. Please sign in again.");
      window.location.href = '/sign-in';
    }
  }, [updateResult, updateLoading, router]);

  // Handle errors from useFetch
  useEffect(() => {
    if (updateError && !updateLoading) {
      console.error("Update error:", updateError);
      
      // Check if it's an authentication error
      if (updateError.message?.includes('auth') || updateError.message?.includes('sign')) {
        toast.error("Authentication expired. Please sign in again.");
        window.location.href = '/sign-in';
        return;
      }
      
      toast.error("An error occurred while saving your profile. Please try again.");
    }
  }, [updateError, updateLoading]);

  // Show loading if user is not loaded yet
  if (!isLoaded) {
    return (
      <div className='flex justify-center items-center bg-background min-h-screen'>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  const watchIndustry = watch("industry");

  return (
    <div className='flex justify-center items-center bg-background'>
      <Card className={"w-full max-w-lg mt-10 mx-2"}>
        <CardHeader>
          <CardTitle className="gradient-title text-4xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Select your industry to get personalized career insights and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
            <div className='space-y-2'>
              <Label htmlFor="industry" className="block text-sm font-medium">
                Industry
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("industry", value, { shouldValidate: true, shouldDirty: true });
                  setSelectedIndustry(
                    industries.find((ind) => ind.id === value)
                  );
                  setValue("subIndustry", "", { shouldValidate: true, shouldDirty: true });
                }}
              >
                <SelectTrigger id='industry' className="w-full">
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => {
                    return (
                      <SelectItem value={ind.id} key={ind.id}>
                        {ind.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <input type="hidden" {...register("industry")} />
              {errors.industry && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.industry.message}
                </p>
              )}
            </div>

            {watchIndustry && (
              <div className='space-y-2'>
                <Label htmlFor="subIndustry" className="block text-sm font-medium">
                  Specialization
                </Label>
                <Select
                  onValueChange={(value) => setValue("subIndustry", value, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger id='subIndustry' className="w-full">
                    <SelectValue placeholder="Select a specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedIndustry?.subIndustries.map((ind) => {
                      return (
                        <SelectItem value={ind} key={ind}>
                          {ind}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <input type="hidden" {...register("subIndustry")} />
                {errors.subIndustry && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.subIndustry.message}
                  </p>
                )}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor="experience" className="block text-sm font-medium">
                Years of Experience
              </Label>
              <Input 
                id="experience"
                type="number" 
                min="0" 
                max="50"
                placeholder="Enter years of experience"
                {...register("experience")} 
              />
              {errors.experience && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.experience.message}
                </p>
              )}
            </div> 

            <div className='space-y-2'>
              <Label htmlFor="skills" className="block text-sm font-medium">
                Skills
              </Label>
              <Input 
                id="skills"
                placeholder="e.g., JavaScript, Project Management"
                {...register("skills")} 
              />
              <p className="text-sm text-muted-foreground mt-1">
                Separate multiple skills with commas.
              </p>
              {errors.skills && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.skills.message}
                </p>
              )}
            </div> 

            <div className='space-y-2'>
              <Label htmlFor="bio" className="block text-sm font-medium">
                Professional Bio
              </Label>
              <Textarea
                id="bio"
                placeholder="Tell us about your professional background"
                {...register("bio")} 
              />
              {errors.bio && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.bio.message}
                </p>
              )}
            </div> 

            <Button type="submit" className="w-full" disabled={updateLoading}>
              {updateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingForm;

