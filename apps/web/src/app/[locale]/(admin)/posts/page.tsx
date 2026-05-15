"use client";

import React from "react";
import { List } from "@refinedev/antd";
import { Table, Space, Button, Typography } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { IResourceComponentsProps } from "@refinedev/core";

const { Title } = Typography;

export default function 博客管理ListPage() {
  return (
    <>
      <Title level={3}>博客管理</Title>
      <List>
        <Table dataSource={[]} rowKey="id">
          <Table.Column dataIndex="id" title="ID" width={80} />
          <Table.Column dataIndex="createdAt" title="创建时间" width={180} />
          <Table.Column
            title="操作"
            width={120}
            render={() => (
              <Space size="small">
                <Button icon=<EditOutlined /> size="small" />
                <Button icon=<DeleteOutlined /> size="small" danger />
              </Space>
            )}
          />
        </Table>
      </List>
    </>
  );
}
