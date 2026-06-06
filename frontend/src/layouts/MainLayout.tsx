import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, Button, message } from 'antd';
import {
  DashboardOutlined,
  UnorderedListOutlined,
  AuditOutlined,
  DollarOutlined,
  UserOutlined,
  LogoutOutlined,
  FileAddOutlined,
  WarningOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { clearAuth, getCurrentUser, RoleLabels } from '../utils';
import { Role } from '../types';
import Dashboard from '../pages/Dashboard';
import BatchList from '../pages/BatchList';
import BatchDetail from '../pages/BatchDetail';
import BatchCreate from '../pages/BatchCreate';
import ReviewList from '../pages/ReviewList';
import PaymentList from '../pages/PaymentList';
import AnomalyReview from '../pages/AnomalyReview';
import SubsidyRule from '../pages/SubsidyRule';
import type { User } from '../types';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  const handleLogout = () => {
    clearAuth();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const getMenuItems = () => {
    if (!currentUser) return [];

    const allItems = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '监管看板',
        roles: [Role.SUPERVISOR, Role.FINANCE_REVIEWER, Role.TOWN_AUDITOR],
      },
      {
        key: '/batches',
        icon: <UnorderedListOutlined />,
        label: '批次列表',
        roles: [Role.RECYCLER, Role.TOWN_AUDITOR, Role.FINANCE_REVIEWER, Role.SUPERVISOR],
      },
      {
        key: '/batches/create',
        icon: <FileAddOutlined />,
        label: '录入称重',
        roles: [Role.RECYCLER],
      },
      {
        key: '/reviews',
        icon: <AuditOutlined />,
        label: '审核复核',
        roles: [Role.TOWN_AUDITOR, Role.FINANCE_REVIEWER],
      },
      {
        key: '/anomalies',
        icon: <WarningOutlined />,
        label: '异常复核',
        roles: [Role.FINANCE_REVIEWER, Role.SUPERVISOR],
      },
      {
        key: '/payments',
        icon: <DollarOutlined />,
        label: '补贴发放',
        roles: [Role.FINANCE_REVIEWER, Role.SUPERVISOR],
      },
      {
        key: '/subsidy-rules',
        icon: <SettingOutlined />,
        label: '补贴规则',
        roles: [Role.FINANCE_REVIEWER, Role.SUPERVISOR],
      },
    ];

    return allItems.filter((item) => item.roles.includes(currentUser.role));
  };

  if (!currentUser) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {!collapsed && (
            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1677ff' }}>
              农膜补贴系统
            </span>
          )}
          {collapsed && <DashboardOutlined style={{ fontSize: 24, color: '#1677ff' }} />}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div>
            <span style={{ fontSize: 18, fontWeight: 500 }}>农膜回收补贴审核管理系统</span>
          </div>
          <Space>
            <Button type="text" onClick={() => navigate('/login')}>
              切换角色
            </Button>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>
                  {currentUser.name} ({RoleLabels[currentUser.role]})
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/batches" element={<BatchList />} />
            <Route path="/batches/create" element={<BatchCreate />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            <Route path="/reviews" element={<ReviewList />} />
            <Route path="/anomalies" element={<AnomalyReview />} />
            <Route path="/payments" element={<PaymentList />} />
            <Route path="/subsidy-rules" element={<SubsidyRule />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
