/**
 * Swagger Tag Definitions
 * Defines all API endpoint tags for organization
 */

export const tags = [
  {
    name: 'Health',
    description: 'Health check endpoints',
  },
  {
    name: 'Auth',
    description: 'Authentication and authorization endpoints',
  },
  {
    name: 'Sessions',
    description: 'Session management endpoints - create, list, update, delete sessions',
  },
  {
    name: 'Transcription',
    description: 'Audio transcription endpoints - upload audio chunks and retrieve transcripts',
  },
  {
    name: 'Notes',
    description: 'Note management endpoints - create, list, update, delete notes (auto and manual)',
  },
  {
    name: 'Summaries',
    description: 'Summary generation endpoints - generate and retrieve AI-powered summaries',
  },
  {
    name: 'Export',
    description: 'Export endpoints - export sessions to PDF, Markdown, or TXT formats',
  },
  {
    name: 'Users',
    description: 'User profile and settings endpoints - get profile, update watch platforms and preferences',
  },
];
