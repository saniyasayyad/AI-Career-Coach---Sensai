"use client";

import React, { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";

const CoverLetterPreview = ({ content, jobTitle, companyName }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState("preview");
  const [text, setText] = useState(content || "");
  const [pdfContent, setPdfContent] = useState(content || "");

  // keep local copy in sync if prop changes
  useEffect(() => {
    setText(content || "");
  }, [content]);

  const isLikelyJobDescription = (txt) => {
    const needles = ["Job Overview", "Responsibilities", "Skills", "Qualifications", "Job Type", "Location:"];
    return needles.some((n) => txt?.toLowerCase().includes(n.toLowerCase()));
  };

  const buildLetterFromJD = (txt) => {
    const title = jobTitle || "the role";
    const company = companyName || "your company";
    return [
      `Dear Hiring Manager,`,
      "",
      `I am writing to express my interest in the ${title} position at ${company}. With relevant experience and strong motivation, I am confident I can contribute immediately to your team.`,
      "",
      `Based on the job description, I bring hands-on experience with the core responsibilities and the required technical skills. I focus on writing clean, maintainable code, collaborating closely with stakeholders, and delivering measurable outcomes.`,
      "",
      `I would welcome the opportunity to discuss how my background aligns with your needs. Thank you for your time and consideration.`,
      "",
      `Sincerely,`,
      `\n`,
      `{Your Name}`,
    ].join("\n");
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js")).default;
      // Load shared PDF-safe styles (avoids oklch/lab colors)
      const loadPDFStyles = () => {
        return new Promise((resolve) => {
          const existingLink = document.querySelector('link[href="/pdf-styles.css"]');
          if (existingLink) return resolve();
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = '/pdf-styles.css';
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        });
      };
      await loadPDFStyles();
      const element = document.getElementById("cover-letter-pdf");
      if (!element) return;
      // If the user pasted a job description, convert to a formal letter for the PDF only
      const sourceMarkdown = isLikelyJobDescription(text) ? buildLetterFromJD(text) : text;
      setPdfContent(sourceMarkdown);
      // wait for React to render updated markdown before capturing
      await new Promise((r) => requestAnimationFrame(() => r()));
      // Normalize any unsupported color functions (oklch, lab, lch)
      // Apply base PDF-friendly styles
      element.style.fontFamily = 'Georgia, "Times New Roman", serif';
      element.style.lineHeight = '1.6';
      element.style.color = '#000000';
      element.style.background = '#ffffff';
      element.style.padding = '20px';
      element.style.maxWidth = '800px';
      element.style.margin = '0 auto';
      element.style.border = '2px solid #000';

      const all = element.querySelectorAll("*");
      all.forEach((el) => {
        const cs = window.getComputedStyle(el);
        const fix = (val, fallback) =>
          val && /(oklch|lab|lch)/i.test(val) ? fallback : val;
        el.style.color = fix(cs.color, "#000000");
        el.style.backgroundColor = fix(cs.backgroundColor, "#ffffff");
        el.style.borderColor = fix(cs.borderColor, "#000000");
      });

      const opt = {
        margin: [15, 15],
        filename: "cover-letter.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await html2pdf().set(opt).from(element).save();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="py-4 space-y-2">
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setMode(mode === "preview" ? "edit" : "preview")}
          className="text-sm underline"
        >
          {mode === "preview" ? "Edit" : "Show Preview"}
        </button>
        <button
          type="button"
          onClick={generatePDF}
          disabled={isGenerating}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm"
        >
          {isGenerating ? "Generating..." : "Download PDF"}
        </button>
      </div>
      <MDEditor value={text} onChange={setText} preview={mode} height={700} />
      {/* Off-screen (not display:none) container for html2pdf */}
      <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', width: '0', height: '0', overflow: 'hidden' }}>
        <div id="cover-letter-pdf" style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          lineHeight: '1.6',
          color: '#000000',
          background: '#ffffff',
          padding: '20px',
          maxWidth: '800px',
          margin: '0 auto',
          border: '2px solid #000'
        }}>
          <div data-cover-md>
            <MDEditor.Markdown source={pdfContent} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;