import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from '../stocks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('StocksService', () => {
  let service: StocksService;

  const mockStock = {
    id: 'stock-001',
    code: '000001',
    name: '平安银行',
    market: 'sz',
    type: 'stock',
    createdAt: new Date('2026-05-01'),
  };

  const mockPrismaService = {
    stock: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    stockPeriodKline: {
      findMany: jest.fn(),
    },
    stockQuote: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    stockDaily: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
  });

  describe('getRealtimeQuote', () => {
    it('外部API成功时返回实时行情数据', async () => {
      // f43=1120 → price = 1120/100 = 11.2
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            f43: 1120,    // price * 100 = 11.2
            f44: 15,      // change * 100 = 0.15
            f45: 135,     // changePercent * 100 = 1.35
            f46: 50000000,
            f47: 5600000000,
            f48: 1130,
            f49: 1105,
            f50: 1100,
            f51: 1105,
            f57: '000001',
            f58: '平安银行',
          },
        }),
      });

      const result = await service.getRealtimeQuote('000001');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('000001');
      expect(result!.name).toBe('平安银行');
      expect(result!.price).toBe(11.2);
      expect(result!.change).toBe(0.15);
      expect(result!.changePercent).toBe(1.35);
    });

    it('外部API失败时从StockPeriodKline fallback返回日K数据', async () => {
      // 外部API失败
      mockFetch.mockResolvedValueOnce({ ok: false });

      // DB有日K数据
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockPrismaService.stockPeriodKline.findMany.mockResolvedValue([{
        id: 'bar-001',
        stockId: 'stock-001',
        period: 'day',
        date: new Date('2026-05-18'),
        open: 11.0,
        close: 11.2,
        high: 11.5,
        low: 10.9,
        volume: 500000,
        createdAt: new Date(),
      }]);

      const result = await service.getRealtimeQuote('000001');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('000001');
      expect(result!.name).toBe('平安银行');
      // 价格应来自日K的close
      expect(result!.price).toBe(11.2);
      expect(result!.open).toBe(11.0);
      expect(result!.high).toBe(11.5);
      expect(result!.low).toBe(10.9);
      // change/changePercent 来自stock表（无数据则为0）
      expect(result!.change).toBe(0);
      expect(result!.changePercent).toBe(0);
    });

    it('外部API失败且无日K数据时返回零值fallback', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockPrismaService.stockPeriodKline.findMany.mockResolvedValue([]);
      mockPrismaService.stockQuote.findFirst.mockResolvedValue(null);

      const result = await service.getRealtimeQuote('000001');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('000001');
      expect(result!.name).toBe('平安银行');
      expect(result!.price).toBe(0);
      expect(result!.volume).toBe(0);
      expect(result!.open).toBe(0);
      expect(result!.high).toBe(0);
      expect(result!.low).toBe(0);
    });

    it('外部API失败时从StockQuote快照返回完整行情数据', async () => {
      // 外部API失败
      mockFetch.mockResolvedValueOnce({ ok: false });
      // DB stock 存在
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      // StockPeriodKline 有数据但不是最新
      mockPrismaService.stockPeriodKline.findMany.mockResolvedValue([{
        id: 'bar-001', stockId: 'stock-001', period: 'day',
        date: new Date('2026-05-15'),
        open: 11.0, close: 11.2, high: 11.5, low: 10.9, volume: 500000,
        createdAt: new Date(),
      }]);
      // StockQuote 有最新快照（由 MarketSyncService 定时写入）
      mockPrismaService.stockQuote.findFirst.mockResolvedValue({
        id: 'quote-001', stockId: 'stock-001',
        price: 18100.50, change: 156.23, changePct: 0.87,
        open: 17950.00, high: 18150.00, low: 17900.00,
        volume: 3500000, amount: 628000000,
        turnover: 0.35, preClose: 17944.27,
        marketCap: 2270000000000, circulateCap: 2260000000000,
        netInflow: 5200000000, capturedAt: new Date('2026-05-19 10:30:00'),
      });

      const result = await service.getRealtimeQuote('000001');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('000001');
      expect(result!.name).toBe('平安银行');
      // StockQuote 优先于 StockPeriodKline
      expect(result!.price).toBe(18100.50);
      expect(result!.change).toBe(156.23);
      expect(result!.changePercent).toBe(0.87);
      expect(result!.volume).toBe(3500000);
      expect(result!.amount).toBe(628000000);
      expect(result!.open).toBe(17950.00);
      expect(result!.high).toBe(18150.00);
      expect(result!.low).toBe(17900.00);
      expect(result!.preClose).toBe(17944.27);
      expect(result!.totalCap).toBe(2270000000000);
      expect(result!.circulateCap).toBe(2260000000000);
      expect(result!.netInflow).toBe(5200000000);
    });

    it('股票不存在时返回null', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockPrismaService.stock.findUnique.mockResolvedValue(null);

      const result = await service.getRealtimeQuote('999999');

      expect(result).toBeNull();
    });

    it('外部API返回空data时走fallback逻辑', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockPrismaService.stockPeriodKline.findMany.mockResolvedValue([]);
      // stockQuote.findFirst 若未 reset 会残留上一个测试的 mock 实现
      mockPrismaService.stockQuote.findFirst.mockReset();
      mockPrismaService.stockQuote.findFirst.mockResolvedValue(null);

      const result = await service.getRealtimeQuote('000001');

      expect(result).not.toBeNull();
      expect(result!.price).toBe(0);
    });
  });

  describe('getByCode', () => {
    it('数据库存在的股票返回完整信息', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(mockStock);
      mockFetch.mockResolvedValueOnce({ ok: false }); // 外部API失败
      mockPrismaService.stock.upsert.mockResolvedValue(mockStock);

      const result = await service.getByCode('000001');

      expect(result.code).toBe('000001');
      expect(result.name).toBe('平安银行');
      // mockPrice 返回随机值，这里验证字段存在
      expect(typeof result.price).toBe('number');
    });

    it('数据库不存在抛出NotFoundException', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValue(null);

      await expect(service.getByCode('000001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('按代码模糊匹配返回股票列表', async () => {
      mockPrismaService.stock.findMany.mockResolvedValue([mockStock]);
      mockFetch.mockResolvedValue({ ok: false }); // 批量行情全部失败

      const result = await service.search('000001');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].code).toBe('000001');
    });

    it('空查询返回空数组', async () => {
      const result = await service.search('');
      expect(result).toEqual([]);
    });
  });
});
