import { z } from "zod";

export const onboardingSchema = z.object({ 
    industry: z.string({
        required_error: "Please select an industry",
    }).min(1, "Please select an industry"),
    subIndustry: z.string({
        required_error: "Please select a specialization",
    }).min(1, "Please select a specialization"),
    bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
    experience: z 
    .string()
    .min(1, "Experience is required")
    .transform((val) => parseInt(val, 10 ))
    .pipe(
        z
            .number()
            .min(0, "Experience must be at least 0 years")
            .max(50, 
            "Experience must be at most 50 years")
    ),
    skills: z.string().min(1, "Skills are required").transform((val) =>
        val
            ? val
                .split(",")
                .map((skill) => skill.trim())
                .filter(Boolean)
        : []
    ),
        
});

// Schema for individual entries (experience, education, projects)
export const entrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  organization: z.string().min(1, "Organization is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  current: z.boolean().optional(),
  location: z.string().optional(),
  skills: z.array(z.string()).optional(),
  url: z.string().url().optional().or(z.literal("")),
});

// Schema for the complete resume form
export const resumeSchema = z.object({
  contactInfo: z.object({
    email: z.string().email("Invalid email address").optional(),
    mobile: z.string().optional(),
    linkedin: z.string().url("Invalid LinkedIn URL").optional().or(z.literal("")),
    twitter: z.string().url("Invalid Twitter URL").optional().or(z.literal("")),
  }).optional(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  experience: z.array(entrySchema).optional(),
  education: z.array(entrySchema).optional(),
  projects: z.array(entrySchema).optional(),
});