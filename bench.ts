import { WebSocketServer, WebSocketClient } from './src/index.js';
import os from 'os';

const PORT = 3999;

console.log('═══════════════════════════════════════');
console.log('  平台:         ', `${os.platform()} ${os.arch()}`);
console.log('  CPU:          ', `${os.cpus()[0]?.model ?? 'Unknown'} (${os.cpus().length} 核)`);
console.log('  内存:         ', `${(os.totalmem() / 1024 ** 3).toFixed(0)} GB`);
console.log('  Node.js:      ', process.version);
console.log('  GC 暴露状态:  ', typeof global.gc === 'function' ? '🟢 已启用' : '⚠️ 未启用 (建议加上 --expose-gc)');
console.log('═══════════════════════════════════════\n');

interface BenchConfig {
    label: string;
    concurrent: number;   // 并发连接数
    durationMs: number;   // 压测持续时间 (ms)
    payload?: unknown;    // 传输数据
}

const configs: BenchConfig[] = [
    { label: '轻量请求 × 1 连接 (5s)', concurrent: 1, durationMs: 5000 },
    { label: '轻量请求 × 10 连接 (5s)', concurrent: 10, durationMs: 5000 },
    { label: '轻量请求 × 100 连接 (5s)', concurrent: 100, durationMs: 5000 },
    { label: '高并发连接 × 500 连接 (5s)', concurrent: 500, durationMs: 5000 },
    { label: '中等负载(1KB) × 10 连接 (5s)', concurrent: 10, durationMs: 5000, payload: { data: 'x'.repeat(1024) } },
    { label: '大负载(64KB) × 10 连接 (5s)', concurrent: 10, durationMs: 5000, payload: { data: 'x'.repeat(64 * 1024) } },
];

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((sorted.length * p) / 100) - 1));
    return sorted[idx] ?? 0;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 主动强制触发 GC 并获取当前 Heap 内存使用（MB）
function getCleanMemoryMB(): number {
    if (global.gc) {
        global.gc();
    }
    return process.memoryUsage().heapUsed / 1024 / 1024;
}

async function runBench(cfg: BenchConfig) {
    const server = new WebSocketServer({ port: PORT });
    server.register('echo', (params) => params);
    await server.start?.();

    // 建立连接
    const connectStart = performance.now();
    const clients = await Promise.all(
        Array.from({ length: cfg.concurrent }, async () => {
            const c = new WebSocketClient(`ws://localhost:${PORT}`);
            await c.open();
            return c;
        })
    );
    const connectTime = (performance.now() - connectStart) / 1000;

    // 预热
    for (const c of clients) {
        await c.request('echo', { warmup: true });
    }

    // 压测前的内存基准（触发 GC 后）
    const memBefore = getCleanMemoryMB();

    let errors = 0;
    let totalRequests = 0;
    const testStart = performance.now();
    const deadline = testStart + cfg.durationMs;

    // 持续按时间压测
    const clientLatencies = await Promise.all(
        clients.map(async (client) => {
            const latencies: number[] = [];
            let i = 0;
            while (performance.now() < deadline) {
                const t0 = performance.now();
                try {
                    await client.request('echo', cfg.payload || { i: i++ });
                    latencies.push(performance.now() - t0);
                } catch {
                    errors++;
                }
                totalRequests++;
            }
            await client.close?.();
            return latencies;
        })
    );

    const actualElapsed = (performance.now() - testStart) / 1000;

    // 压测后清理并再次触发 GC，测量真实的净内存增长
    const sortedLat = clientLatencies.flat().sort((a, b) => a - b);
    const memAfter = getCleanMemoryMB();
    const memDiff = memAfter - memBefore;

    const qps = Math.round(totalRequests / actualElapsed);
    const p50 = percentile(sortedLat, 50);
    const p95 = percentile(sortedLat, 95);
    const p99 = percentile(sortedLat, 99);
    const minLat = sortedLat[0] ?? 0;
    const maxLat = sortedLat[sortedLat.length - 1] ?? 0;

    const formatMs = (ms: number) => (ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`);

    console.log(`═══ ${cfg.label} ═══`);
    console.log(`  完成请求:     ${totalRequests}`);
    console.log(`  连接耗时:     ${connectTime.toFixed(2)}s`);
    console.log(`  实际耗时:     ${actualElapsed.toFixed(2)}s`);
    console.log(`  QPS:          ${qps}`);
    console.log(`  错误数:       ${errors}`);
    console.log(`  延迟 p50:     ${formatMs(p50)}`);
    console.log(`  延迟 p95:     ${formatMs(p95)}`);
    console.log(`  延迟 p99:     ${formatMs(p99)}`);
    console.log(`  延迟 min/max: ${formatMs(minLat)} / ${formatMs(maxLat)}`);
    console.log(`  净内存变动:   ${memDiff >= 0 ? '+' : ''}${memDiff.toFixed(2)} MB`);
    console.log('');

    await server.close?.();
    await sleep(300);

    return {
        label: cfg.label,
        qps,
        p50,
        p95,
        p99,
        errors,
        mem: memDiff,
    };
}

async function main() {
    const results = [];

    for (const cfg of configs) {
        const r = await runBench(cfg);
        results.push(r);
    }

    // ====== 汇总输出 ======
    console.log('══════════════════════════════════════════════════════════════════════════════════════════');
    console.log('                            性  能  汇  总');
    console.log('──────────────────────────────────────────────────────────────────────────────────────────');
    console.log('  场景                           │ QPS     │ p50    │ p95    │ p99    │ 错误  │ 净内存变动');
    console.log('─────────────────────────────────┼─────────┼────────┼────────┼────────┼───────┼───────────');

    for (const r of results) {
        const pad = (s: string, len: number) => {
            const chinese = (s.match(/[\u4e00-\u9fff]/g) || []).length;
            return s.padEnd(len - chinese);
        };
        const formatMs = (ms: number) => (ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(1)}ms`);
        const memStr = `${r.mem >= 0 ? '+' : ''}${r.mem.toFixed(1)}MB`;

        console.log(
            `  ${pad(r.label, 30)} │ ${String(r.qps).padStart(7)} │ ${formatMs(r.p50).padStart(6)} │ ${formatMs(r.p95).padStart(6)} │ ${formatMs(r.p99).padStart(6)} │ ${String(r.errors).padStart(5)} │ ${memStr.padStart(9)}`
        );
    }
    console.log('──────────────────────────────────────────────────────────────────────────────────────────');

    const avgQps = results.reduce((s, r) => s + r.qps, 0) / results.length;
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);
    const maxMemIncrease = Math.max(...results.map((r) => r.mem));

    let status = '🟢 优秀';
    if (totalErrors > 0 || maxMemIncrease > 50) {
        status = '🔴 存在风险（有报错或明显内存泄漏）';
    } else if (avgQps < 5000) {
        status = '🟡 性能中等';
    }

    console.log(`  平均QPS: [${Math.round(avgQps)}] | 总错误: [${totalErrors}] | 评估: ${status}`);
    console.log('══════════════════════════════════════════════════════════════════════════════════════════');
    process.exit(0);
}

main().catch((err) => {
    console.error('基准测试运行失败:', err);
    process.exit(1);
});
