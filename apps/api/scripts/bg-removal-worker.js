// Runs in a dedicated child process, deliberately kept OUT of the main API
// process. @imgly/background-removal-node pulls in onnxruntime-node and
// sharp — both native N-API addons that bundle their own OpenSSL/libvips.
// Loading them into the same long-lived process as Prisma's own native
// query engine corrupts its TLS handshake for every DB connection made
// afterward (observed as PrismaClientInitializationError P1011 "Error
// opening a TLS connection: OpenSSL error" on every boot once this
// dependency was added) — a known class of native-addon symbol conflict.
// Isolating it in its own process, invoked per-request via child_process,
// keeps the two native engines in separate address spaces entirely.
const { removeBackground } = require('@imgly/background-removal-node');

async function main() {
  const imageUrl = process.argv[2];
  if (!imageUrl) {
    process.stderr.write('bg-removal-worker: missing imageUrl argument\n');
    process.exit(1);
  }
  try {
    const blob = await removeBackground(imageUrl, {
      model: 'medium',
      output: { format: 'image/png', quality: 1 },
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    process.stdout.write(buffer);
  } catch (e) {
    process.stderr.write(`bg-removal-worker: ${e && e.message ? e.message : e}\n`);
    process.exit(1);
  }
}

main();
