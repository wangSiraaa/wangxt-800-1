import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Input, Select, DatePicker, Card, message } from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { batchApi } from '../services/api';
import { BatchStatusLabels, BatchStatusColors, formatWeight, formatCurrency, getCurrentUser } from '../utils';
import type { Batch, BatchStatus, Role } from '../types';

const { RangePicker } = DatePicker;
const { Option } = Select;

const BatchList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Batch[]>([]);
  const [filters, setFilters] = useState({
    status: undefined as BatchStatus | undefined,
    keyword: '',
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  });
  const currentUser = getCurrentUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.dateRange) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }
      const result = await batchApi.getAll(params);
      if (result.success && result.data) {
        let filtered = result.data;
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          filtered = filtered.filter(
            (b) =>
              b.batchNo.toLowerCase().includes(kw) ||
              b.farmer.name.toLowerCase().includes(kw) ||
              b.plotNumber.toLowerCase().includes(kw)
          );
        }
        setData(filtered);
      }
    } catch (error) {
      message.error('获取批次列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

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
      dataIndex: ['farmer', 'town'],
      width: 120,
      render: (_: any, record: Batch) => `${record.farmer.town} ${record.farmer.village}`,
    },
    {
      title: '地块编号',
      dataIndex: 'plotNumber',
      width: 100,
    },
    {
      title: '回收重量',
      dataIndex: 'weight',
      width: 100,
      render: (w: number) => formatWeight(w),
    },
    {
      title: '补贴金额',
      dataIndex: 'subsidyAmount',
      width: 110,
      render: (a: number) => formatCurrency(a),
    },
    {
      title: '回收日期',
      dataIndex: 'collectionDate',
      width: 120,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD'),
    },
    {
      title: '照片',
      dataIndex: 'hasPhoto',
      width: 80,
      render: (has: boolean) => (has ? <Tag color="success">已上传</Tag> : <Tag color="warning">未上传</Tag>),
    },
    {
      title: '异常',
      dataIndex: 'isAnomaly',
      width: 80,
      render: (is: boolean) =>
        is ? <Tag color="error">异常</Tag> : <Tag color="default">正常</Tag>,
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
      width: 120,
      fixed: 'right',
      render: (_: any, record: Batch) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/batches/${record.id}`)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  const canCreate = currentUser?.role === 'RECYCLER';

  return (
    <div>
      <Card
        title="回收批次列表"
        extra={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/batches/create')}>
              录入称重
            </Button>
          )
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索批次号/农户/地块"
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
          <Select
            placeholder="选择状态"
            style={{ width: 160 }}
            allowClear
            value={filters.status}
            onChange={(v) => setFilters({ ...filters, status: v })}
          >
            {Object.entries(BatchStatusLabels).map(([key, label]) => (
              <Option key={key} value={key}>{label}</Option>
            ))}
          </Select>
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
          />
          <Button onClick={fetchData}>刷新</Button>
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
};

export default BatchList;
