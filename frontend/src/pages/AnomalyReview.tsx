import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, message, Statistic, Row, Col } from 'antd';
import { EyeOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { supervisorApi } from '../services/api';
import { BatchStatusLabels, BatchStatusColors, formatWeight, formatCurrency } from '../utils';
import type { Batch, BatchStatus } from '../types';

const AnomalyReview: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Batch[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    byWeight: 0,
    byThreshold: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await supervisorApi.getAnomalies();
      if (result.success && result.data) {
        setData(result.data.batches);
        const byWeight = result.data.batches.filter(
          (b: any) => b.anomalyReason?.includes('历史均值')
        ).length;
        const byThreshold = result.data.batches.filter(
          (b: any) => b.anomalyReason?.includes('单批次阈值')
        ).length;
        setStats({
          total: result.data.totalCount,
          byWeight,
          byThreshold: result.data.totalCount - byWeight,
        });
      }
    } catch (error) {
      message.error('获取异常数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      title: '批次编号',
      dataIndex: 'batchNo',
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '农户',
      dataIndex: ['farmer', 'name'],
      width: 100,
    },
    {
      title: '所在村镇',
      width: 150,
      render: (_: any, record: Batch) => `${record.farmer.town} ${record.farmer.village}`,
    },
    {
      title: '回收重量',
      dataIndex: 'weight',
      width: 120,
      render: (w: number) => (
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatWeight(w)}</span>
        </Space>
      ),
    },
    {
      title: '补贴金额',
      dataIndex: 'subsidyAmount',
      width: 110,
      render: (a: number) => formatCurrency(a),
    },
    {
      title: '异常原因',
      dataIndex: 'anomalyReason',
      width: 300,
      ellipsis: true,
    },
    {
      title: '回收日期',
      dataIndex: 'collectionDate',
      width: 120,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: BatchStatus) => (
        <Tag color={BatchStatusColors[status]}>{BatchStatusLabels[status]}</Tag>
      ),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_: any, record: Batch) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/batches/${record.id}`)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="异常批次总数"
              value={stats.total}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="超历史均值"
              value={stats.byWeight}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="超单批次阈值"
              value={stats.byThreshold}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="异常批次列表"
        extra={<Button onClick={fetchData}>刷新</Button>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default AnomalyReview;
