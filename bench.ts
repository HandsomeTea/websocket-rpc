import { WebSocketServer, WebSocketClient } from './src/index.js';
import os from 'os';

const PORT = 3999;

console.log('═══════════════════════════════════════');
console.log('  平台:         ', `${os.platform()} ${os.arch()}`);
console.log('  CPU:          ', `${os.cpus()[0].model} (${os.cpus().length} 核)`);
console.log('  内存:         ', `${(os.totalmem() / 1024 ** 3).toFixed(0)} GB`);
console.log('  Node.js:      ', process.version);
console.log('═══════════════════════════════════════\n');

interface BenchConfig {
    label: string;
    concurrent: number;
    requests: number;
    payload?: unknown;
}

const configs: BenchConfig[] = [
    { label: '轻量请求 × 1 连接', concurrent: 1, requests: 10000 },
    { label: '轻量请求 × 10 连接', concurrent: 10, requests: 1000 },
    { label: '轻量请求 × 100 连接', concurrent: 100, requests: 100 },
    { label: '中等负载 × 10 连接', concurrent: 10, requests: 500, payload: { data: 'x'.repeat(1024) } },
];

function percentile(sorted: number[], p: number) {
    const idx = Math.ceil(sorted.length * p / 100) - 1;
    return sorted[idx];
}

async function runBench(cfg: BenchConfig) {
    const server = new WebSocketServer({ port: PORT });
    server.register('echo', (params) => params);
    server.start();

    const connectStart = Date.now();
    const clients = await Promise.all(
        Array.from({ length: cfg.concurrent }, async () => {
            const c = new WebSocketClient(`ws://localhost:${PORT}`);

            await c.open();
            return c;
        })
    );
    const connectTime = (Date.now() - connectStart) / 1000;

    for (const c of clients) {
        await c.request('echo', { warmup: true });
    }

    const memBefore = process.memoryUsage().heapUsed / 1024 ** 2;
    const latencies: number[] = [];
    let errors = 0;
    let total = 0;
    const testStart = Date.now();

    await Promise.all(clients.map(async (client) => {
        for (let i = 0; i < cfg.requests; i++) {
            const t0 = Date.now();
            try {
                await client.request('echo', cfg.payload || { i });
                latencies.push(Date.now() - t0);
            } catch {
                errors++;
            }
            total++;
        }
        client.close();
    }));

    const elapsed = (Date.now() - testStart) / 1000;
    const memAfter = process.memoryUsage().heapUsed / 1024 ** 2;
    const sortedLat = [...latencies].sort((a, b) => a - b);

    console.log(`═══ ${cfg.label} ═══`);
    console.log(`  总请求数:     ${total}`);
    console.log(`  连接建立:     ${connectTime.toFixed(2)}s`);
    console.log(`  执行耗时:     ${elapsed.toFixed(1)}s`);
    console.log(`  QPS:          ${(total / elapsed).toFixed(0)}`);
    console.log(`  错误数:       ${errors}`);
    console.log(`  延迟 p50:     ${percentile(sortedLat, 50).toFixed(2)}ms`);
    console.log(`  延迟 p95:     ${percentile(sortedLat, 95).toFixed(2)}ms`);
    console.log(`  延迟 p99:     ${percentile(sortedLat, 99).toFixed(2)}ms`);
    console.log(`  延迟 min/max: ${sortedLat[0]}ms / ${sortedLat[sortedLat.length - 1]}ms`);
    console.log(`  内存增长:     ${(memAfter - memBefore).toFixed(1)} MB`);
    console.log('');

    server.close();
    await new Promise(r => setTimeout(r, 200));

    return {
        label: cfg.label,
        qps: Math.round(total / elapsed),
        p50: Math.round(percentile(sortedLat, 50) * 100) / 100,
        p95: Math.round(percentile(sortedLat, 95) * 100) / 100,
        p99: Math.round(percentile(sortedLat, 99) * 100) / 100,
        errors,
        mem: memAfter - memBefore,
    };
}

async function main() {
    const results: { label: string; qps: number; p50: number; p95: number; p99: number; errors: number; mem: number }[] = [];

    for (const cfg of configs) {
        const r = await runBench(cfg);
        results.push(r);
    }

    // ====== 汇总 ======
    console.log('═══════════════════════════════════════');
    console.log('              性  能  汇  总');
    console.log('───────────────────────────────────────');
    console.log('  场景              │ QPS  │ p50  │ p95  │ p99  │ 错误 │ 内存');
    console.log('───────────────────┼──────┼──────┼──────┼──────┼──────┼─────');
    for (const r of results) {
        const pad = (s: string, len: number) => {
            const chinese = (s.match(/[\u4e00-\u9fff]/g) || []).length;
            return s.padEnd(len - chinese);
        };
        console.log(`  ${pad(r.label, 18)}│ ${String(r.qps).padStart(4)} │ ${String(r.p50).padStart(4)} │ ${String(r.p95).padStart(4)} │ ${String(r.p99).padStart(4)} │ ${String(r.errors).padStart(4)} │ ${r.mem.toFixed(0)}MB`);
    }
    console.log('───────────────────────────────────────');

    const avgQps = results.reduce((s, r) => s + r.qps, 0) / results.length;
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    console.log(`  平均 QPS: ${avgQps.toFixed(0)} | 总错误: ${totalErrors} | 评价: ${avgQps > 5000 ? '🟢 优秀' : avgQps > 2000 ? '🟡 良好' : '🔴 需优化'
        }`);
    console.log('═══════════════════════════════════════');
    process.exit(0);
}

main();
