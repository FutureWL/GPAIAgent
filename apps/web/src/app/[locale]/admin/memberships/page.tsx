"use client";

import React from 'react';
import { CreditCard } from 'lucide-react';
import { Icon, icons } from '@/components/ui/icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MembershipsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">会员管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">会员列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Icon name={icons.CreditCard} className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">暂无会员数据</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
