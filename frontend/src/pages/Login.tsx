import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Select, Typography } from 'antd';
import { UserOutlined, LockOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setAuthToken, setCurrentUser } from '../utils';
import { Role } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const roleAccounts: Record<Role, { username: string; password: string; name: string }> = {
  [Role.RECYCLER]: { username: 'recycler1', password: '123456', name: '张回收' },
  [Role.TOWN_AUDITOR]: { username: 'auditor1', password: '123456', name: '李审核' },
  [Role.FINANCE_REVIEWER]: { username: 'finance1', password: '123456', name: '王财政' },
  [Role.SUPERVISOR]: { username: 'supervisor1', password: '123456', name: '赵监管' },
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.RECYCLER);
  const [form] = Form.useForm();

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    form.setFieldsValue({
      username: roleAccounts[role].username,
      password: roleAccounts[role].password,
    });
  };

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const result = await authApi.login(values.username, values.password);
      if (result.success && result.data) {
        setAuthToken(result.data.token);
        setCurrentUser(result.data.user);
        message.success(`欢迎回来，${result.data.user.name}！`);
        navigate('/');
      } else {
        message.error(result.error || '登录失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" bordered={false}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <EnvironmentOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
          <Title level={3} style={{ margin: 0 }}>农膜回收补贴审核系统</Title>
          <Text type="secondary">Agricultural Film Subsidy Audit System</Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{
          username: roleAccounts[Role.RECYCLER].username,
          password: roleAccounts[Role.RECYCLER].password,
        }}>
          <Form.Item label="选择角色" name="role">
            <Select value={selectedRole} onChange={handleRoleChange} size="large">
              <Option value={Role.RECYCLER}>回收站 - 张回收</Option>
              <Option value={Role.TOWN_AUDITOR}>乡镇审核员 - 李审核</Option>
              <Option value={Role.FINANCE_REVIEWER}>财政复核员 - 王财政</Option>
              <Option value={Role.SUPERVISOR}>监管人员 - 赵监管</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          <p>测试账号密码均为：用户名见上方选项 / 123456</p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
