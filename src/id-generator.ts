
/**
 * jsonrpc id生成器，适用于客户端/服务端
 * - 示例:
 * ```
 *      const idGenerator = new JsonRPCIdGenerator();
 * ```
 * - 生成id:
 * ```
 *      const id = idGenerator.id();
 * ```
 * @class JsonRPCIdGenerator
 */
export class JsonRPCIdGenerator {
    private static readonly EPOCH = 1704067200000n; // 2024-01-01 00:00:00 UTC

    private static readonly MACHINE_BITS = 10n;  // 支持1024个实例
    private static readonly SEQUENCE_BITS = 12n; // 每毫秒4096个ID

    // private static readonly MAX_MACHINE_ID = (1n << JsonRPCIdGenerator.MACHINE_BITS) - 1n;
    private static readonly MAX_SEQUENCE = (1n << JsonRPCIdGenerator.SEQUENCE_BITS) - 1n;

    private static readonly MACHINE_SHIFT = JsonRPCIdGenerator.SEQUENCE_BITS;
    private static readonly TIMESTAMP_SHIFT =
        JsonRPCIdGenerator.SEQUENCE_BITS + JsonRPCIdGenerator.MACHINE_BITS;

    private machineId: bigint;
    private sequence: bigint = 0n;
    private lastTimestamp: bigint = -1n;

    private readonly machineIdShifted: bigint;

    private generatedCount = 0;
    private collisionRetries = 0;

    constructor() {
        // if (machineId < 0 || BigInt(machineId) > JsonRPCIdGenerator.MAX_MACHINE_ID) {
        //     throw new Error(`Machine ID must be between 0 and ${JsonRPCIdGenerator.MAX_MACHINE_ID}`);
        // }
        this.machineId = BigInt(Math.floor(Math.random() * 1000));
        this.machineIdShifted = this.machineId << JsonRPCIdGenerator.MACHINE_SHIFT;
    }

    private randomPrefix(): string {
        return Math.floor(Math.random() * 2176782336)
            .toString(36)
            .padStart(6, '0');
    }

    /**
     * 生成jsonrpc id
     * @returns {string}
     */
    id(): string {
        const timestamp = BigInt(Date.now());

        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1n) & JsonRPCIdGenerator.MAX_SEQUENCE;

            // 序列号耗尽
            if (this.sequence === 0n) {
                this.collisionRetries++;
                return this.nextWithSpin(timestamp);
            }
        } else {
            this.sequence = 0n;
            this.lastTimestamp = timestamp;
        }

        this.generatedCount++;

        const id = ((timestamp - JsonRPCIdGenerator.EPOCH) << JsonRPCIdGenerator.TIMESTAMP_SHIFT) |
            this.machineIdShifted |
            this.sequence;

        return `${this.randomPrefix()}-${id.toString()}`;
    }

    /**
     * 自旋等待（序列号耗尽时）
     */
    private nextWithSpin(previousTimestamp: bigint): string {
        let timestamp = previousTimestamp;

        while (timestamp <= previousTimestamp) {
            timestamp = BigInt(Date.now());
        }

        this.sequence = 0n;
        this.lastTimestamp = timestamp;
        this.generatedCount++;

        const id = ((timestamp - JsonRPCIdGenerator.EPOCH) << JsonRPCIdGenerator.TIMESTAMP_SHIFT) |
            this.machineIdShifted |
            this.sequence;

        return `${this.randomPrefix()}-${id.toString()}`;
    }
};
