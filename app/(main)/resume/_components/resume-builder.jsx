"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown, certificationsToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import { PDF_COLORS } from "@/app/lib/color-utils";

// html2pdf will be imported dynamically in the generatePDF function

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
      certifications: [],
    },
  });

  const {
    fields: certificationFields,
    append: appendCertification,
    remove: removeCertification,
  } = useFieldArray({ control, name: "certifications" });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  
  const formValues = watch();

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // Update preview content when form values change
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent ? newContent : initialContent);
    }
  }, [formValues, activeTab]);

  // Handle save result
  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues || {};
    const fullName = (user && user.fullName) ? user.fullName : "";
    const parts = [];
    if (contactInfo?.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo?.mobile) parts.push(`☏ ${contactInfo.mobile}`);

    // LinkedIn: show only the label as a clickable link (no username)
    if (contactInfo?.linkedin) {
      parts.push(`[ℹ️ LinkedIn](${contactInfo.linkedin})`);
    }

    // GitHub: use the stored field (twitter now used as GitHub URL); show icon + username clickable; no raw URL text
    if (contactInfo?.twitter) {
      try {
        // Always render only the label as clickable, without username
        new URL(contactInfo.twitter);
        parts.push(`[🔗 GitHub](${contactInfo.twitter})`);
      } catch {
        parts.push(`🔗 GitHub`);
      }
    }

    if (!fullName && parts.length === 0) return "";

    const contactLine = parts.join(" | ");
    // Use pure markdown so links render as clickable text. We'll center via PDF CSS.
    return contactLine
      ? `# ${fullName}\n\n${contactLine}`
      : `# ${fullName}`;
  };

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects, certifications } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
      certificationsToMarkdown(certifications),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Dynamically import html2pdf only on the client side
      const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js")).default;
      
      // Load PDF-compatible CSS
      const loadPDFStyles = () => {
        return new Promise((resolve) => {
          // Check if the CSS is already loaded
          const existingLink = document.querySelector('link[href="/pdf-styles.css"]');
          if (existingLink) {
            resolve();
            return;
          }
          
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/pdf-styles.css';
          link.onload = () => resolve();
          link.onerror = () => resolve(); // Continue even if CSS fails to load
          document.head.appendChild(link);
        });
      };

      await loadPDFStyles();
      
      const element = document.getElementById("resume-pdf");
      
      if (!element) {
        throw new Error("Resume element not found. Please ensure the resume is properly loaded.");
      }
      
      // Apply PDF-specific styling to the element
      element.style.fontFamily = 'Georgia, "Times New Roman", serif';
      element.style.lineHeight = '1.6';
      element.style.color = PDF_COLORS['--foreground'];
      element.style.background = PDF_COLORS['--background'];
      element.style.padding = '20px';
      element.style.maxWidth = '800px';
      element.style.margin = '0 auto';
      element.style.border = '2px solid #000000';
      
      // Apply PDF-compatible colors to all child elements
      const allElements = element.querySelectorAll('*');
      allElements.forEach(el => {
        // Reset any oklch colors to PDF-compatible values
        const computedStyle = window.getComputedStyle(el);
        if (computedStyle.color && computedStyle.color.includes('oklch')) {
          el.style.color = PDF_COLORS['--foreground'];
        }
        if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('oklch')) {
          el.style.backgroundColor = PDF_COLORS['--background'];
        }
        if (computedStyle.borderColor && computedStyle.borderColor.includes('oklch')) {
          el.style.borderColor = PDF_COLORS['--border'];
        }
      });

      // Enhance headings and lists for PDF readability
      element.querySelectorAll('h2').forEach(h2 => {
        h2.style.borderBottom = '1px solid #000000';
        h2.style.paddingBottom = '6px';
        h2.style.marginTop = '18px';
        h2.style.marginBottom = '10px';
      });
      // Center the name (first heading) and the following paragraph (contact line)
      const firstH1 = element.querySelector('h1');
      if (firstH1) {
        firstH1.style.textAlign = 'center';
        const next = firstH1.nextElementSibling;
        if (next) next.style.textAlign = 'center';
      }
      element.querySelectorAll('p').forEach(p => {
        p.style.margin = '6px 0';
      });
      element.querySelectorAll('ul').forEach(ul => {
        ul.style.listStyleType = 'disc';
        ul.style.paddingLeft = '20px';
        ul.style.margin = '6px 0 6px 16px';
      });
      
      const opt = {
        margin: [15, 15],
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: PDF_COLORS['--background'],
          logging: false,
          ignoreElements: (element) => {
            // Ignore elements that might cause issues
            return element.classList.contains('hidden') || 
                   element.style.display === 'none' ||
                   element.tagName === 'SCRIPT';
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      // Generate PDF with error handling
      try {
        await html2pdf().set(opt).from(element).save();
      } catch (pdfError) {
        console.error("PDF generation library error:", pdfError);
        throw new Error("PDF generation failed. Please try again.");
      }
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formattedContent = previewContent
        .replace(/\n/g, "\n") // Normalize newlines
        .replace(/\n\s*\n/g, "\n\n") // Normalize multiple newlines to double newlines
        .trim();

      console.log(previewContent, formattedContent);
      await saveResumeFn(previewContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  return (
    <div data-color-mode="light" className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <h1 className="font-bold gradient-title text-5xl md:text-6xl">
          Resume Builder
        </h1>
        <div className="space-x-2">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="bg-blue-700 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating} className="bg-green-600 hover:bg-green-700 text-white">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}  
      >
        <TabsList>
          <TabsTrigger value="edit">Form</TabsTrigger>
          <TabsTrigger value="preview">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-4">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                    error={errors.contactInfo?.email}
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <Input
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+1 234 567 8900"
                  />
                  {errors.contactInfo?.mobile && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.mobile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-6">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                  {errors.contactInfo?.linkedin && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    GitHub URL
                  </label>
                  <Input
                    {...register("contactInfo.twitter")}
                    type="url"
                    placeholder="https://github.com/your-username"
                  />
                  {errors.contactInfo?.twitter && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.twitter.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Professional Summary</h3>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="Write a compelling professional summary..."
                    error={errors.summary}
                  />
                )}
              />
              {errors.summary && (
                <p className="text-sm text-red-500">{errors.summary.message}</p>
              )}
            </div>

            {/* Skills */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Skills</h3>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    className="h-32"
                    placeholder="List your key skills..."
                    error={errors.skills}
                  />
                )}
              />
              {errors.skills && (
                <p className="text-sm text-red-500">{errors.skills.message}</p>
              )}
            </div>

            {/* Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <Controller
                name="experience"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Experience"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.experience && (
                <p className="text-sm text-red-500">
                  {errors.experience.message}
                </p>
              )}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Education</h3>
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Education"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.education && (
                <p className="text-sm text-red-500">
                  {errors.education.message}
                </p>
              )}
            </div>

            {/* Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Projects</h3>
              <Controller
                name="projects"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Project"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.projects && (
                <p className="text-sm text-red-500">
                  {errors.projects.message}
                </p>
              )}
            </div>

            {/* Certifications & Achievements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Certifications & Achievements</h3>
              <div className="space-y-3">
                {certificationFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Certificate Title</label>
                      <Input
                        {...register(`certifications.${index}.title`)}
                        type="text"
                        placeholder="e.g., AWS Certified Cloud Practitioner"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Organization/Foundation</label>
                      <Input
                        {...register(`certifications.${index}.organization`)}
                        type="text"
                        placeholder="e.g., Amazon Web Services"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="button" variant="outline" onClick={() => removeCertification(index)}>Remove</Button>
                    </div>
                  </div>
                ))}
                <Button type="button" onClick={() => appendCertification({ title: "", organization: "" })}>Add Certification</Button>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          {activeTab === "preview" && (
            <Button
              variant="link"
              type="button"
              className="mb-2"
              onClick={() =>
                setResumeMode(resumeMode === "preview" ? "edit" : "preview")
              }
            >
              {resumeMode === "preview" ? (
                <>
                  <Edit className="h-4 w-4" />
                  Edit Resume
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  Show Preview
                </>
              )}
            </Button>
          )}

          {activeTab === "preview" && resumeMode !== "preview" && (
            <div className="flex p-3 gap-2 items-center border-2 border-yellow-600 text-yellow-600 rounded mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                You will lose editied markdown if you update the form data.
              </span>
            </div>
          )}
          <div className="border rounded-lg">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
            />
          </div>
          {/* Removed old hidden container; a persistent off-screen container is rendered below */}
        </TabsContent>
      </Tabs>
      {/* Persistent off-screen PDF container so generation works regardless of tab */}
      <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', width: '0', height: '0', overflow: 'hidden' }}>
        <div id="resume-pdf" style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          lineHeight: '1.6',
          color: '#000000',
          background: '#ffffff',
          padding: '20px',
          maxWidth: '800px',
          margin: '0 auto',
          border: '2px solid #000'
        }}>
          <MDEditor.Markdown
            source={previewContent}
            style={{ background: 'transparent', color: 'black', fontFamily: 'inherit' }}
          />
        </div>
      </div>
    </div>
  );
}