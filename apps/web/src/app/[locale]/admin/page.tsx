"use client";

import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  StockOutlined,
  RobotOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

const cards = [
  { title: "用户总数", value: "-", icon: <UserOutlined />, color: "#1890ff" },
  { title: "博客文章", value: "-", icon: <FileTextOutlined />, color: "#52c41a" },
  { title: "会员数", value: "-", icon: <CreditCardOutlined />, color: "#faad14" },
  { title: "自选股", value: "-", icon: <StockOutlined />, color: "#f5222d" },
  { title: "AI 生成记录", value: "-", icon: <RobotOutlined />, color: "#722ed1" },
];

export default function AdminIndexPage() {
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
