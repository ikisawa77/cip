const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.includes("pnpm/")) {
  console.error("");
  console.error("This repository uses pnpm only.");
  console.error("Please run: pnpm install");
  console.error("Do not use npm install or yarn install in C:\\cip.");
  console.error("");
  process.exit(1);
}
