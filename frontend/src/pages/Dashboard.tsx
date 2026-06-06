import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, List, Progress, Space } from 'antd';
import {
  DashboardOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  UnorderedListOutlined,
  RiseOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import dayjs from 'dayjs';
import { supervisorApi } from '../services/api';
import {
  BatchStatusLabels,
  BatchStatusColors,
  formatCurrency,
  formatWeight,
  ReviewTypeLabels,
} from '../utils';
import type { DashboardData, BatchStatus } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await supervisorApi.getDashboard();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('获取看板数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statusChartData = data?.statusCounts.map((s) => ({
    name: BatchStatusLabels[s.status as BatchStatus] || s.status,
    value: s.count,
  }));

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="总回收批次"
              value={data?.overview.totalBatches || 0}
              prefix={<UnorderedListOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="总回收重量"
              value={data?.overview.totalWeight || 0}
              precision={2}
              suffix="kg"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="异常批次"
              value={data?.overview.anomalyCount || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="已发放补贴"
              value={data?.overview.paidAmount || 0}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="30天回收趋势" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="batchCount"
                  name="批次数量"
                  stroke="#1677ff"
                  fill="#1677ff"
                  fillOpacity={0.3}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalWeight"
                  name="重量(kg)"
                  stroke="#52c41a"
                  fill="#52c41a"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="批次状态分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="月度统计" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.monthlyStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="batchCount" name="批次数量" fill="#1677ff" />
                <Bar dataKey="totalWeight" name="重量(kg)" fill="#52c41a" />
                <Bar dataKey="anomalyCount" name="异常数" fill="#ff4d4f" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="乡镇回收统计" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.townStats || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="town" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalWeight" name="重量(kg)" fill="#1677ff" />
                <Bar dataKey="farmerCount" name="农户数" fill="#faad14" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="最近批次" loading={loading}>
            <List
              dataSource={data?.recentBatches?.slice(0, 8) || []}
              renderItem={(item: any) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={
                      <Space>
                        <strong>{item.batchNo}</strong>
                        <Tag color={BatchStatusColors[item.status as BatchStatus]}>
                          {BatchStatusLabels[item.status as BatchStatus]}
                        </Tag>
                        {item.isAnomaly && <Tag color="error">异常</Tag>}
                      </Space>
                    }
                    description={
                      <span>
                        {item.farmer?.name} | {formatWeight(item.weight)} |{' '}
                        {formatCurrency(item.subsidyAmount)} |{' '}
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近审核记录" loading={loading}>
            <List
              dataSource={data?.recentReviews?.slice(0, 8) || []}
              renderItem={(item: any) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    avatar={
                      item.isPassed ? (
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                      ) : (
                        <WarningOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                      )
                    }
                    title={
                      <Space>
                        <Tag>{ReviewTypeLabels[item.reviewType as any] || item.reviewType}</Tag>
                        <span>{item.reviewer?.name}</span>
                        <span>{item.isPassed ? '通过' : '退回'}</span>
                      </Space>
                    }
                    description={
                      <span>
                        {item.batch?.batchNo} | {item.opinion?.substring(0, 30)}... |{' '}
                        {dayjs(item.reviewedAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {data?.anomalyBatches && data.anomalyBatches.length > 0 && (
        <Card
          title="异常批次预警"
          style={{ marginTop: 16 }}
          loading={loading}
          extra={<Tag color="error">需要关注</Tag>}
        >
          <Table
            rowKey="id"
            size="small"
            dataSource={data.anomalyBatches}
            columns={[
              {
                title: '批次号',
                dataIndex: 'batchNo',
                render: (t) => <strong>{t}</strong>,
              },
              { title: '农户', dataIndex: ['farmer', 'name'] },
              {
                title: '重量',
                dataIndex: 'weight',
                render: (w) => (
                  <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatWeight(w)}</span>
                ),
              },
              { title: '补贴金额', dataIndex: 'subsidyAmount', render: (a) => formatCurrency(a) },
              {
                title: '状态',
                dataIndex: 'status',
                render: (s: BatchStatus) => (
                  <Tag color={BatchStatusColors[s]}>{BatchStatusLabels[s]}</Tag>
                ),
              },
              {
                title: '异常原因',
                dataIndex: 'anomalyReason',
                ellipsis: true,
                width: 300,
              },
            ]}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
