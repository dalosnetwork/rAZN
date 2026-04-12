import { createServer } from "node:net";

const ports = [
  { port: 3000, label: "web (Next.js)" },
  { port: 3002, label: "api (Hono)" },
];

function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      resolve(true);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "0.0.0.0");
  });
}

const occupied = [];

for (const target of ports) {
  // eslint-disable-next-line no-await-in-loop
  const available = await canListen(target.port);
  if (!available) occupied.push(target);
}

if (occupied.length > 0) {
  const details = occupied
    .map((item) => `  - ${item.label}: port ${item.port}`)
    .join("\n");

  const portList = occupied.map((item) => item.port).join(" ");
  const killCommand = occupied
    .map((item) => `lsof -ti tcp:${item.port}`)
    .join(" ");

  console.error("\n[dev preflight] Required local ports are already in use:");
  console.error(details);
  console.error("\nFree them first, then run `pnpm run dev` again.");
  console.error("Useful commands:");
  console.error(`  lsof -nP -iTCP:${portList} -sTCP:LISTEN`);
  console.error(`  ${killCommand} | xargs kill -9`);
  process.exit(1);
}
