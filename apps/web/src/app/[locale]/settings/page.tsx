'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message, Tabs, Form, Input, Button } from 'antd';
import { useLocale } from 'next-intl';

const { TabPane } = Tabs;

interface ProfileForm {
  name?: string;
  bio?: string;
  avatar?: string;
  email?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const locale = useLocale() as 'zh' | 'en';
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm<ProfileForm>();

  const t = (zh: string, en: string) => locale === 'zh' ? zh : en;

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
        message.success(t('保存成功', 'Saved'));
        router.refresh();
      } else {
        const data = await res.json();
        message.error(data.message || t('保存失败', 'Save failed'));
      }
    } catch {
      message.error(t('网络错误', 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-neutral-100">
            {t('账户设置', 'Account Settings')}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {t('管理您的个人资料和账户安全', 'Manage your profile and account security')}
          </p>
        </div>
        <div className="p-6">
          <Tabs defaultActiveKey="profile" className="settings-tabs">
            <TabPane
              tab={t('个人资料', 'Profile')}
              key="profile"
            >
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleSaveProfile}
                className="mt-4 max-w-md"
              >
                <Form.Item label={t('显示名称', 'Display Name')} name="name">
                  <Input placeholder={t('您的昵称', 'Your nickname')} />
                </Form.Item>
                <Form.Item label={t('个人简介', 'Bio')} name="bio">
                  <Input.TextArea
                    placeholder={t('介绍一下自己...', 'Tell us about yourself...')}
                    rows={3}
                    maxLength={200}
                    showCount
                  />
                </Form.Item>
                <Form.Item label={t('头像 URL', 'Avatar URL')} name="avatar">
                  <Input placeholder="https://example.com/avatar.jpg" />
                </Form.Item>
                <Form.Item label={t('邮箱', 'Email')} name="email">
                  <Input type="email" placeholder="your@email.com" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    {t('保存修改', 'Save Changes')}
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane
              tab={t('修改密码', 'Change Password')}
              key="password"
            >
              <Form layout="vertical" className="mt-4 max-w-md">
                <Form.Item label={t('当前密码', 'Current Password')} required>
                  <Input.Password placeholder={t('输入当前密码', 'Enter current password')} />
                </Form.Item>
                <Form.Item label={t('新密码', 'New Password')} required>
                  <Input.Password placeholder={t('输入新密码', 'Enter new password')} />
                </Form.Item>
                <Form.Item label={t('确认新密码', 'Confirm New Password')} required>
                  <Input.Password placeholder={t('再次输入新密码', 'Enter new password again')} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    {t('修改密码', 'Change Password')}
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane
              tab={t('邮箱验证', 'Email Verification')}
              key="email"
            >
              <div className="mt-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t(
                      '绑定邮箱后，可以使用邮箱找回密码和接收重要通知。',
                      'Bind your email to recover your password and receive important notifications.'
                    )}
                  </p>
                </div>
                <Button type="primary">
                  {t('发送验证邮件', 'Send Verification Email')}
                </Button>
              </div>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
