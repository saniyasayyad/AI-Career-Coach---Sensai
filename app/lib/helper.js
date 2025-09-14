/**
 * Converts an array of entries to markdown format
 * @param {Array} entries - Array of entry objects
 * @param {string} title - Section title
 * @returns {string} - Formatted markdown string
 */
export function entriesToMarkdown(entries, title) {
  if (!entries || entries.length === 0) return "";

  const entriesMarkdown = entries
    .map((entry) => {
      const parts = [];
      
      // Title/Position
      if (entry.title || entry.position) {
        parts.push(`### ${entry.title || entry.position}`);
      }
      
      // Company/Institution
      if (entry.company || entry.institution) {
        parts.push(`**${entry.company || entry.institution}**`);
      }
      
      // Date range
      if (entry.startDate || entry.endDate) {
        const startDate = entry.startDate ? new Date(entry.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
        const endDate = entry.endDate ? new Date(entry.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';
        const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate;
        if (dateRange) {
          parts.push(`*${dateRange}*`);
        }
      }
      
      // Location
      if (entry.location) {
        parts.push(`📍 ${entry.location}`);
      }
      
      // Description
      if (entry.description) {
        parts.push(entry.description);
      }
      
      // Bullet points for achievements/responsibilities
      if (entry.achievements && Array.isArray(entry.achievements)) {
        const achievements = entry.achievements
          .filter(achievement => achievement.trim())
          .map(achievement => `- ${achievement}`)
          .join('\n');
        if (achievements) {
          parts.push(achievements);
        }
      }
      
      // Skills (for projects)
      if (entry.skills && Array.isArray(entry.skills)) {
        const skills = entry.skills
          .filter(skill => skill.trim())
          .join(', ');
        if (skills) {
          parts.push(`**Technologies:** ${skills}`);
        }
      }
      
      // URL/Link (for projects)
      if (entry.url) {
        parts.push(`🔗 [View Project](${entry.url})`);
      }
      
      return parts.join('\n\n');
    })
    .join('\n\n');

  return `## ${title}\n\n${entriesMarkdown}`;
}
