'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message, Tabs, Form, Input, Button } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

interface ProfileForm {
  name?: string;
  bio?: string;
  avatar?: string;
  email?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm<ProfileForm>();

  const handleSaveProfile = async (values: ProfileForm) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('保存成功');
        router.refresh();
      } else {
        const data = await res.json();
        message.error(data.message || '保存失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">账户设置</h2>
          <p className="text-sm text-gray-400 mt-0.5">管理您的个人资料和账户安全</p>
        </div>
        <div className="p-6">
          <Tabs defaultActiveKey="profile" className="settings-tabs">
            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <UserOutlined /> 个人资料
                </span>
              }
              key="profile"
            >
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleSaveProfile}
                className="mt-4 max-w-md"
              >
                <Form.Item label="显示名称" name="name">
                  <Input placeholder="您的昵称" />
                </Form.Item>
                <Form.Item label="个人简介" name="bio">
                  <Input.TextArea
                    placeholder="介绍一下自己..."
                    rows={3}
                    maxLength={200}
                    showCount
                  />
                </Form.Item>
                <Form.Item label="头像 URL" name="avatar">
                  <Input placeholder="https://example.com/avatar.jpg" />
                </Form.Item>
                <Form.Item label="邮箱" name="email">
                  <Input type="email" placeholder="your@email.com" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    保存修改
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <LockOutlined /> 修改密码
                </span>
              }
              key="password"
            >
              <Form layout="vertical" className="mt-4 max-w-md">
                <Form.Item label="当前密码" required>
                  <Input.Password placeholder="输入当前密码" />
                </Form.Item>
                <Form.Item label="新密码" required>
                  <Input.Password placeholder="输入新密码" />
                </Form.Item>
                <Form.Item label="确认新密码" required>
                  <Input.Password placeholder="再次输入新密码" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane
              tab={
                <span className="flex items-center gap-2">
                  <MailOutlined /> 邮箱验证
                </span>
              }
              key="email"
            >
              <div className="mt-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700">
                    绑定邮箱后，可以使用邮箱找回密码和接收重要通知。
                  </p>
                </div>
                <Button type="primary">发送验证邮件</Button>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
