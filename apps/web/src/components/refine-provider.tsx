'use client';

import React from 'react';
import { Refine } from '@refinedev/core';
import { RefineThemes, ThemedLayoutV2, notificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router-v6';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { dataProvider } from '@refinedev/simple-rest';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function RefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AntdApp>
        <Refine
          dataProvider={dataProvider(API_URL)}
          routerProvider={routerProvider}
          notificationProvider={notificationProvider}
          resources={[
            {
              name: 'users',
              list: '/zh/admin/users',
              show: '/zh/admin/users/show/:id',
            },
            {
              name: 'posts',
              list: '/zh/admin/posts',
              show: '/zh/admin/posts/show/:id',
            },
            {
              name: 'comments',
              list: '/zh/admin/comments',
            },
            {
              name: 'memberships',
              list: '/zh/admin/memberships',
            },
            {
              name: 'stocks',
              list: '/zh/admin/stocks',
            },
            {
              name: 'ai/generations',
              list: '/zh/admin/ai-generations',
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
        >
          {children}
        </Refine>
      </AntdApp>
    </BrowserRouter>
  );
}
