const pty = require("node-pty");
const os = require("os");

console.log("Testing node-pty with Electron 27...\n");

try {
  // Get the appropriate shell for the platform
  const shell =
    process.platform === "win32"
      ? process.env.COMSPEC || "cmd.exe"
      : process.env.SHELL || "/bin/bash";

  console.log(`Using shell: ${shell}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Node version: ${process.version}`);
  console.log(
    `Electron version: ${process.versions.electron || "Not running in Electron"}`,
  );

  // Create a PTY process
  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: os.homedir(),
    env: process.env,
  });

  console.log(`\nPTY Process spawned successfully!`);
  console.log(`PID: ${ptyProcess.pid}`);

  // Handle data from PTY
  ptyProcess.onData((data) => {
    console.log("PTY Output:", data);
  });

  // Send a test command
  setTimeout(() => {
    console.log('\nSending test command: echo "PTY is working!"');
    ptyProcess.write('echo "PTY is working!"\r');
  }, 100);

  // Kill the process after 2 seconds
  setTimeout(() => {
    console.log("\nKilling PTY process...");
    ptyProcess.kill();
    console.log("Test completed successfully!");
    process.exit(0);
  }, 2000);
} catch (error) {
  console.error("Error testing node-pty:", error);
  process.exit(1);
}
