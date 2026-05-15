"use client";

import React from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Space, Tag, Button, Typography } from "antd";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { IResourceComponentsProps } from "@refinedev/core";

const { Title } = Typography;

export default function 会员管理ListPage() {
  const { tableProps } = useTable({
    resource: "memberships",
  });

  return (
    <>
      <Title level={3}>会员管理</Title>
      <List>
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="id" title="ID" width={80} />
          <Table.Column dataIndex="createdAt" title="创建时间" width={180} />
          <Table.Column
            title="操作"
            width={120}
            render={(_, record: any) => (
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
