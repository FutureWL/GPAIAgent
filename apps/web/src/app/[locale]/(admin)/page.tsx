"use client";

import React from 'react';
import { useList } from "@refinedev/core";
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  StockOutlined,
  RobotOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

export default function AdminIndexPage() {
  const { data: usersData } = useList({ resource: "users", pagination: { current: 1, pageSize: 1 } });
  const { data: postsData } = useList({ resource: "posts", pagination: { current: 1, pageSize: 1 } });
  const { data: membershipsData } = useList({ resource: "memberships", pagination: { current: 1, pageSize: 1 } });
  const { data: stocksData } = useList({ resource: "stocks", pagination: { current: 1, pageSize: 1 } });
  const { data: aiData } = useList({ resource: "ai/generations", pagination: { current: 1, pageSize: 1 } });

  const cards = [
    { title: "用户总数", value: usersData?.data?.total ?? "-", icon: <UserOutlined />, color: "#1890ff" },
    { title: "博客文章", value: postsData?.data?.total ?? "-", icon: <FileTextOutlined />, color: "#52c41a" },
    { title: "会员数", value: membershipsData?.data?.total ?? "-", icon: <CreditCardOutlined />, color: "#faad14" },
    { title: "自选股", value: stocksData?.data?.total ?? "-", icon: <StockOutlined />, color: "#f5222d" },
    { title: "AI 生成记录", value: aiData?.data?.total ?? "-", icon: <RobotOutlined />, color: "#722ed1" },
  ];

  return (
    <>
      <Title level={3}>管理后台</Title>
      <Row gutter={[16, 16]}>
        {cards.map((card, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={<span style={{ color: card.color }}>{card.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
