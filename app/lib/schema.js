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