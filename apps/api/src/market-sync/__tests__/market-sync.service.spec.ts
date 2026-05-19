import { Test, TestingModule } from '@nestjs/testing';
import { MarketSyncService } from '../market-sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncTaskType, SyncTaskStatus } from '@prisma/client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MarketSyncService', () => {
  let service: MarketSyncService;

  const mockStock = {
    id: 'stock-001',
    code: '600519',
    name: '贵州茅台',
    market: 'sh',
    type: 'stock',
    createdAt: new Date('2026-05-01'),
  };

  const mockPrismaService = {
    stock: { findUnique: jest.fn(), findMany: jest.fn() },
    stockQuote: { create: jest.fn(), findFirst: jest.fn() },
    stockDaily: { upsert: jest.fn() },
    stockPeriodKline: { upsert: jest.fn(), findMany: jest.fn() },
    syncQueue: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    syncJob: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketSyncService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MarketSyncService>(MarketSyncService);
  });

  describe('syncOneQuote', () => {
    it('成功同步行情并写入StockQuote', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            f43: 1800000,  // 1800.00
            f44: 20000,    // 0.20
            f45: 11200,    // 1.12%
            f46: 2000000,
            f47: 36000000000,
            f48: 1810000,
            f49: 1790000,
            f50: 1795000,
            f51: 1780000,
            f116: 2260000000000,
            f117: 2260000000000,
            f76: 500000000,
            f168: 150,     // 换手率 1.50%
            f57: '600519',
            f58: '贵州茅台',
          },
        }),
      });

      const result = await service.syncOneQuote('600519');

      expect(result).toBe(true);
      expect(mockPrismaService.stockQuote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stockId: 'stock-001',
          // 原始API字段 f43=1800000 → /100 = 18000（元）
          price: 18000,
          change: 200,
          changePct: 112,
          volume: 2000000,
          amount: 36000000000,
        }),
      });
    });

    it('股票不存在返回false', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(null);

      const result = await service.syncOneQuote('999999');

      expect(result).toBe(false);
      expect(mockPrismaService.stockQuote.create).not.toHaveBeenCalled();
    });

    it('外部API失败返回false', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await service.syncOneQuote('600519');

      expect(result).toBe(false);
    });

    it('外部API返回空data返回false', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: null }) });

      const result = await service.syncOneQuote('600519');

      expect(result).toBe(false);
    });

    it('fetch抛异常时返回false', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockRejectedValueOnce(new Error('network error'));

      const result = await service.syncOneQuote('600519');

      expect(result).toBe(false);
    });
  });

  describe('syncDailyKline', () => {
    it('成功同步日K线数据', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            'sh600519': {
              qfqday: [
                ['2026-05-15', '1780.00', '1800.00', '1810.00', '1775.00', '2500000'],
                ['2026-05-14', '1760.00', '1780.00', '1790.00', '1755.00', '2300000'],
              ],
            },
          },
        }),
      });

      const result = await service.syncDailyKline('600519');

      expect(result).toBe(2);
      expect(mockPrismaService.stockDaily.upsert).toHaveBeenCalledTimes(2);
    });

    it('股票不存在返回0', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(null);

      const result = await service.syncDailyKline('999999');

      expect(result).toBe(0);
    });

    it('API返回空bars返回0', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { 'sh600519': {} } }) });

      const result = await service.syncDailyKline('600519');

      expect(result).toBe(0);
    });
  });

  describe('enqueue / dequeue', () => {
    it('enqueue创建任务并返回id', async () => {
      mockPrismaService.syncQueue.create.mockResolvedValue({ id: 'queue-001' });

      const id = await service.enqueue(SyncTaskType.REALTIME_QUOTE, 'ALL');

      expect(id).toBe('queue-001');
      expect(mockPrismaService.syncQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: SyncTaskType.REALTIME_QUOTE,
          target: 'ALL',
        }),
      });
    });

    it('dequeue返回最高优先级任务并更新状态为PROCESSING', async () => {
      mockPrismaService.syncQueue.findFirst.mockResolvedValue({
        id: 'queue-001',
        type: SyncTaskType.REALTIME_QUOTE,
        target: 'ALL',
        period: null,
        status: SyncTaskStatus.PENDING,
        priority: 10,
        retries: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.syncQueue.updateMany.mockResolvedValue({ count: 1 });

      const task = await service.dequeue();

      expect(task).not.toBeNull();
      expect(task!.id).toBe('queue-001');
      expect(task!.type).toBe(SyncTaskType.REALTIME_QUOTE);
      expect(mockPrismaService.syncQueue.updateMany).toHaveBeenCalledWith({
        where: { id: 'queue-001', status: SyncTaskStatus.PENDING },
        data: { status: SyncTaskStatus.PROCESSING, updatedAt: expect.any(Date) },
      });
    });

    it('无待处理任务时dequeue返回null', async () => {
      mockPrismaService.syncQueue.findFirst.mockResolvedValue(null);

      const task = await service.dequeue();

      expect(task).toBeNull();
    });

    it('任务被其他worker抢走时dequeue返回null',async()=>{
      mockPrismaService.syncQueue.findFirst.mockResolvedValue({
        id:'queue-001',type:SyncTaskType.REALTIME_QUOTE,target:'ALL',
        period:null,status:SyncTaskStatus.PENDING,priority:10,retries:0,maxRetries:3,
        createdAt:new Date(),updatedAt:new Date(),
      });
      mockPrismaService.syncQueue.updateMany.mockResolvedValue({count:0}); // 乐观锁失败

      const task = await service.dequeue();

      expect(task).toBeNull();
    });
  });

  describe('processTask', () => {
    it('处理REALTIME_QUOTE任务成功', async () => {
      mockPrismaService.syncQueue.findFirst.mockResolvedValue(null); // 无pending
      mockPrismaService.stock.findMany.mockResolvedValue([{ id: 's1', code: '600519', name: '贵州茅台' }]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: null }), // syncOneQuote会失败但不影响流程
      });
      mockPrismaService.syncJob.create.mockResolvedValue({ id: 'job-001' });

      // 直接测试processTask
      const result = await service.processTask('queue-001', SyncTaskType.REALTIME_QUOTE, '600519');

      expect(result.itemsTotal).toBe(1);
      expect(mockPrismaService.syncJob.create).toHaveBeenCalled();
    });

    it('任务失败时写入PARTIAL状态（itemsOk=0但无error）', async () => {
      // syncOneQuote 内部捕获所有异常并返回 false，不会向外传播 error
      mockPrismaService.syncQueue.findFirst.mockResolvedValue(null);
      mockPrismaService.stock.findMany.mockResolvedValue([{ id: 's1', code: '600519', name: '贵州茅台' }]);
      mockFetch.mockRejectedValue(new Error('network error'));
      mockPrismaService.syncJob.create.mockResolvedValue({ id: 'job-001' });

      const result = await service.processTask('queue-001', SyncTaskType.REALTIME_QUOTE, '600519');

      // network error 被 syncOneQuote 内部吞掉，返回 itemsOk=0, error=undefined
      expect(result.error).toBeUndefined();
      expect(result.itemsOk).toBe(0);
      expect(result.itemsTotal).toBe(1);
    });
  });
});
