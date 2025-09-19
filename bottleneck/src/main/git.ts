import { spawn } from 'child_process';

export function gitRun(args: string[], cwd?: string): Promise<{ code: number, stdout: string, stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export async function checkoutBranch(branch: string, cwd?: string) {
  const fetch = await gitRun(['fetch', '--all', '--prune'], cwd);
  if (fetch.code !== 0) return fetch;
  const checkout = await gitRun(['checkout', branch], cwd);
  if (checkout.code !== 0) return checkout;
  const pull = await gitRun(['pull', '--ff-only'], cwd);
  return pull;
}

