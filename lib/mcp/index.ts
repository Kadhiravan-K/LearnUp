import { McpTool, McpResource } from '../types';

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'LearnUp_search_notes',
    description: 'Search user study notes by query keyword or video identifier.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term to find inside notes' },
        learningItemId: { type: 'string', description: 'Optional course UUID filter' }
      }
    }
  },
  {
    name: 'LearnUp_create_note',
    description: 'Create a new markdown note linked to a course and video timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        learningItemId: { type: 'string', description: 'Target course UUID' },
        youtubeVideoId: { type: 'string', description: 'YouTube video identifier' },
        content: { type: 'string', description: 'Markdown note content' }
      },
      required: ['learningItemId', 'youtubeVideoId', 'content']
    }
  },
  {
    name: 'LearnUp_get_courses',
    description: 'List user enrolled courses, syllabus progress, and video completion rates.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'LearnUp_get_telemetry',
    description: 'Fetch multi-dimensional study telemetry, focus hours, streak status, and retention metrics.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'LearnUp_sync_connector',
    description: 'Trigger synchronization for Obsidian, GitHub, Google Calendar, or Notion.',
    inputSchema: {
      type: 'object',
      properties: {
        connectorType: { type: 'string', description: 'obsidian | github | google_calendar | notion' }
      },
      required: ['connectorType']
    }
  }
];

export const MCP_RESOURCES: McpResource[] = [
  { uri: 'LearnUp://courses', name: 'User Courses & Syllabus Index', mimeType: 'application/json' },
  { uri: 'LearnUp://notes', name: 'User Study Notes Repository', mimeType: 'application/json' },
  { uri: 'LearnUp://telemetry', name: 'Performance & Study Telemetry', mimeType: 'application/json' }
];
