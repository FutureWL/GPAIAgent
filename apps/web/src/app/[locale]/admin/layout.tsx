'use client';

import 'antd/dist/reset.css';
import React from 'react';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  StockOutlined,
  RobotOutlined,
  CommentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const { Header, Sider, Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    document.cookie = 'gpai_access_token=; Max-Age=0; path=/';
    router.push('/zh/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/zh/admin">仪表盘</Link>,
    },
    { type: 'divider' },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: <Link href="/zh/admin/users">用户管理</Link>,
    },
    {
      key: 'posts',
      icon: <FileTextOutlined />,
      label: <Link href="/zh/admin/posts">博客管理</Link>,
    },
    {
      key: 'comments',
      icon: <CommentOutlined />,
      label: <Link href="/zh/admin/comments">评论管理</Link>,
    },
    {
      key: 'memberships',
      icon: <CreditCardOutlined />,
      label: <Link href="/zh/admin/memberships">会员管理</Link>,
    },
    {
      key: 'stocks',
      icon: <StockOutlined />,
      label: <Link href="/zh/admin/stocks">股票管理</Link>,
    },
    {
      key: 'ai-generations',
      icon: <RobotOutlined />,
      label: <Link href="/zh/admin/ai-generations">AI 生成记录</Link>,
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
          letterSpacing: 1,
        }}>
          {collapsed ? 'GP' : 'GPAI 管理后台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              style: { fontSize: 18, cursor: 'pointer' },
              onClick: () => setCollapsed(!collapsed),
            })}
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
          </Dropdown>
        </Header>
        <Content style={{ margin: '16px 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
