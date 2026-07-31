// Standalone MCP round-trip check — pure JSON-RPC over the real HTTP
// endpoint, no LLM involved. Run against a live `npm run start`/`start:dev`
// instance:
//   API_BASE_URL=http://localhost:3000 MCP_JWT=<bearer token> npx ts-node scripts/verify-mcp.ts
// (mint MCP_JWT the same way other scripts in this repo do — sign
// {sub: userId} with JWT_SECRET.)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const JWT = process.env.MCP_JWT;

async function main() {
  if (!JWT) {
    console.error('Set MCP_JWT to a valid app JWT before running this script.');
    process.exit(1);
  }

  const transport = new StreamableHTTPClientTransport(new URL(`${BASE_URL}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${JWT}` } },
  });

  const client = new Client({ name: 'verify-mcp-script', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  console.log('Connected to MCP server.');

  const { tools } = await client.listTools();
  console.log(`tools/list returned ${tools.length} tool(s):`);
  for (const t of tools) console.log(`  - ${t.name}: ${t.description}`);

  const readTool = tools.find(t => /read|list|browse|feed|mine|status|check/i.test(t.name));
  if (!readTool) {
    console.log('No obviously-safe read tool found to call — skipping tools/call check.');
  } else {
    console.log(`\nCalling tools/call on "${readTool.name}"...`);
    const result = await client.callTool({ name: readTool.name, arguments: {} });
    console.log('Result:', JSON.stringify(result, null, 2));
  }

  await client.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
