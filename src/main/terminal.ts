import { spawn, ChildProcess } from 'child_process';

export class TerminalManager {
  private pty: any | null = null;
  private proc: ChildProcess | null = null;
  private onDataCallback: ((data: string) => void) | null = null;
  private usingPty: boolean = false;
  private killTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Terminal manager initialized
  }

  spawn(cwd?: string): void {
    this.kill();

    // Use provided directory or fall back to home directory
    let workingDir = cwd || require('os').homedir();
    
    // Expand ~ to home directory
    if (workingDir.startsWith('~/') || workingDir === '~') {
      workingDir = workingDir.replace(/^~/, require('os').homedir());
    }

    // Ensure directory exists, if not, fall back to home
    const fs = require('fs');
    let finalWorkingDir = workingDir;
    try {
      if (!fs.existsSync(workingDir)) {
        console.log(`[Terminal] Directory ${workingDir} does not exist, using home directory`);
        finalWorkingDir = require('os').homedir();
      }
    } catch (error) {
      console.warn(`[Terminal] Error checking directory ${workingDir}:`, error);
      finalWorkingDir = require('os').homedir();
    }

    try {
      // Use system default shell instead of forcing bash
      const shell = process.platform === 'win32'
        ? (process.env.COMSPEC || 'cmd.exe')
        : (process.env.SHELL || '/bin/sh');

      // Try to use a real PTY if available
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pty = require('node-pty');
        const cols = 80;
        const rows = 24;
        // Use interactive shell
        const args = process.platform === 'win32' ? [] : ['-i'];
        this.pty = pty.spawn(shell, args, {
          name: 'xterm-color',
          cols,
          rows,
          cwd: finalWorkingDir,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            SHELL: shell,
            PS1: '$ ',
            BASH_SILENCE_DEPRECATION_WARNING: '1',
          },
        });
        this.usingPty = true;

        this.pty.onData((data: string) => {
          this.onDataCallback?.(data);
        });

        // Log PTY exit to help diagnose unexpected shell termination
        if (this.pty.onExit) {
          this.pty.onExit((e: { exitCode: number; signal?: number }) => {
            console.log(`[Terminal] PTY exited: code=${e.exitCode} signal=${e.signal}`);
          });
        }
      } catch (ptyErr) {
        // node-pty not available, falling back to pipes
        this.usingPty = false;

        // Try bash first, then fall back to sh if bash isn't available
        let fallbackShell = '/bin/bash';
        const fs = require('fs');
        if (process.platform === 'win32') {
          fallbackShell = process.env.COMSPEC || 'cmd.exe';
        } else if (!fs.existsSync('/bin/bash')) {
          fallbackShell = '/bin/sh';
        }
        
        // Fallback to plain child process (non-pty) without interactive flags to avoid job control issues
        this.proc = spawn(fallbackShell, [], {
          cwd: finalWorkingDir,
          env: {
            ...process.env,
            TERM: 'dumb', // Use dumb terminal to avoid control sequences
            PS1: '$ ', // Simple prompt
            BASH_SILENCE_DEPRECATION_WARNING: '1',
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
        });

        // Process spawned

        this.proc.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          this.onDataCallback?.(output);
        });

        this.proc.stderr?.on('data', (data: Buffer) => {
          const output = data.toString();
          this.onDataCallback?.(output);
        });

        this.proc.on('exit', (code: number | null) => {
          console.log(`[Terminal] Process exited with code ${code}`);
          this.proc = null;
        });

        this.proc.on('error', (error: Error) => {
          console.error('[Terminal] Process error:', error);
          this.onDataCallback?.(`Error: ${error.message}\r\n`);
        });

        // Initialize the shell properly
        setTimeout(() => {
          if (this.proc) {
            this.proc.stdin?.write('export PS1="$ "\n');
            this.proc.stdin?.write('printf "$ "\n');
          }
        }, 100);
      }
    } catch (error) {
      console.error('[Terminal] Failed to spawn process:', error);
      this.onDataCallback?.(`Failed to start terminal: ${(error as Error).message}\r\n`);
    }
  }

  write(data: string): void {
    if (!this.pty && !this.proc) {
      return;
    }

    if (this.usingPty && this.pty) {
      this.pty.write(data);
      return;
    }

    if (this.proc?.stdin) {
      // In fallback mode, convert carriage return to newline for bash
      const dataToWrite = data === '\r' ? '\n' : data;
      this.proc.stdin.write(dataToWrite);
      return;
    }

    // No suitable input stream found
  }

  onData(callback: (data: string) => void): void {
    this.onDataCallback = callback;
  }
kill(): void {
    
    // Clear any existing kill timeout
    if (this.killTimeout) {
      clearTimeout(this.killTimeout);
      this.killTimeout = null;
    }
    
    if (this.pty || this.proc) {
      try {
        if (this.usingPty && this.pty) {
          this.pty.kill();
          this.pty = null;
        } else if (this.proc) {
          this.proc.kill('SIGTERM');
          // Give process time to exit gracefully
          this.killTimeout = setTimeout(() => {
            if (this.proc && !this.proc.killed) {
              console.log('[Terminal] Force killing process');
              this.proc.kill('SIGKILL');
            }
            this.proc = null;
            this.killTimeout = null;
          }, 1000);
        }
      } catch (error) {
        console.error('[Terminal] Error killing process:', error);
      }
    }
  }

  resize(cols: number, rows: number): void {
    if (this.usingPty && this.pty?.resize) {
      try {
        this.pty.resize(cols, rows);
      } catch (err) {
        console.warn('[Terminal] PTY resize failed:', err);
      }
    }
  }

  isHealthy(): boolean {
    if (this.usingPty) return !!this.pty && !!this.pty.pid;
    return !!this.proc && this.proc.killed === false;
  }

  restart(cwd?: string): void {
    this.kill();
    setTimeout(() => {
      this.spawn(cwd);
    }, 500);
  }
}
