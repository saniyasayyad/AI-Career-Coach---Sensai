// Helper function to convert entries to markdown
export function entriesToMarkdown(entries, type) {
  if (!entries?.length) return "";

  return (
    `## ${type}\n\n` +
    entries
      .map((entry) => {
        const dateRange = entry.current
          ? `${entry.startDate} - Present`
          : `${entry.startDate} - ${entry.endDate}`;
        return `### ${entry.title} @ ${entry.organization}\n${dateRange}\n\n${entry.description}`;
      })
      .join("\n\n")
  );
}

// Helper to convert certifications to markdown as bullet list
export function certificationsToMarkdown(entries) {
  if (!entries?.length) return "";
  const lines = entries.map((e) => `- ${e.title} — ${e.organization}`);
  return `## Certifications & Achievements\n\n${lines.join("\n")}`;
}