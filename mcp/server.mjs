import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { callTool, toolSchemas, WorkflowError } from '../system/workflow-core/index.mjs';
import { describeTool } from './tool-descriptions.mjs';
import { responseView, transportSchemas, transportArguments } from './response-view.mjs';

const runtime = await callTool('runtime_info', {});
const server = new Server(
  { name: 'pm-zero-workflow', version: runtime.package.version },
  { capabilities: { tools: {} } },
);

const tools = Object.entries(transportSchemas(toolSchemas)).map(([name, inputSchema]) => ({
  name,
  ...describeTool(name),
  inputSchema,
}));

function failure(error) {
  const code = typeof error?.code === 'string' ? error.code : 'INTERNAL_ERROR';
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: `${code}: ${message}` }],
    structuredContent: { ok: false, code, message, ...(error instanceof WorkflowError ? { details: error.details, retryable: error.retryable } : {}) },
    isError: true,
  };
}

function validateArguments(name, args) {
  if (!toolSchemas[name]) {
    const error = new Error(`Unknown pm-zero tool: ${name}`);
    error.code = 'E_TOOL_UNKNOWN';
    throw error;
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    const error = new Error('arguments must be an object');
    error.code = 'E_ARGS_INVALID';
    throw error;
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    validateArguments(request.params.name, request.params.arguments);
    const { args, detail } = transportArguments(request.params.name, request.params.arguments);
    const result = responseView(request.params.name, await callTool(request.params.name, args), detail);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    };
  } catch (error) {
    return failure(error);
  }
});

await server.connect(new StdioServerTransport());
