import { Z } from "zod";

export const onboardingSchema = Z.object({ 
    industry: Z.string({
        required_error: "please select an industry",
    }),
    subIndustry: Z.string({
        required_error: "Please select a specialization",
    }),
    bio: Z.string().max(500).optional(),
    experience: z 
    .string()
    .transform((val) => parseInt(val, 10 ))
    .pipe(
        Z
            .number()
            .min(0, "Experience must be at least 0 years")
            .max(50, 
            "Experience must be at most 50 years")
    ),
    skills: z.string().transform((val) =>
        val
            ? val
                .split(",")
                .map((skill) => skill.trim())
                .filter(Boolean)
        : undefined
    ),
        
});