type Task = () => Promise<void> | void;

export class TaskScheduler {
  private queue: Task[] = [];
  private running = false;
  private intervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(intervalMs = 5000) {
    this.intervalMs = intervalMs;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  enqueue(task: Task) {
    this.queue.push(task);
    this.tick();
  }

  private async tick() {
    if (this.running) return;
    const next = this.queue.shift();
    if (!next) return;
    this.running = true;
    try { await next(); } finally { this.running = false; }
  }
}

