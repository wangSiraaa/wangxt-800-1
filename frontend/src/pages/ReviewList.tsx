import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Card, message, Modal, Form, Input, Radio, Select } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { reviewApi, receiptApi } from '../services/api';
import {
  BatchStatusLabels,
  BatchStatusColors,
  formatWeight,
  formatCurrency,
  getCurrentUser,
  ReviewTypeLabels,
  ReceiptTypeLabels,
} from '../utils';
import type { Batch, BatchStatus, ReviewType, Role, ReceiptType } from '../types';

const ReviewList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Batch[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [form] = Form.useForm();
  const [receiptForm] = Form.useForm();
  const currentUser = getCurrentUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await reviewApi.getPending();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      message.error('获取待审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (values: any) => {
    if (!selectedBatch) return;
    try {
      const reviewType: ReviewType =
        selectedBatch.status === BatchStatus.SECOND_REVIEW
          ? ReviewType.SECOND_REVIEW
          : currentUser?.role === Role.TOWN_AUDITOR
          ? ReviewType.TOWN_AUDIT
          : ReviewType.FINANCE_REVIEW;

      const result = await reviewApi.review({
        batchId: selectedBatch.id,
        opinion: values.opinion,
        isPassed: values.isPassed,
        reviewType,
      });

      if (result.success) {
        message.success(values.isPassed ? '审核通过' : '已退回');
        setModalVisible(false);
        form.resetFields();
        setSelectedBatch(null);
        fetchData();
      } else {
        message.error(result.error || '审核失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '审核失败');
    }
  };

  const openReviewModal = (record: Batch) => {
    setSelectedBatch(record);
    setModalVisible(true);
  };

  const handleReceiptSubmit = async (values: any) => {
    if (!selectedBatch) return;
    try {
      const result = await receiptApi.submit({
        batchId: selectedBatch.id,
        content: values.content,
        receiptType: values.receiptType,
      });

      if (result.success) {
        message.success('处理回执提交成功');
        setReceiptModalVisible(false);
        receiptForm.resetFields();
        setSelectedBatch(null);
        fetchData();
      } else {
        message.error(result.error || '提交失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    }
  };

  const openReceiptModal = (record: Batch) => {
    setSelectedBatch(record);
    setReceiptModalVisible(true);
  };

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
      render: (has: boolean) =>
        has ? <Tag color="success">已上传</Tag> : <Tag color="warning">未上传</Tag>,
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
      width: 280,
      fixed: 'right',
      render: (_: any, record: Batch) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/batches/${record.id}`)}>
            详情
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => openReviewModal(record)}
          >
            {record.status === BatchStatus.SECOND_REVIEW ? '二次复核' : '审核'}
          </Button>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => openReceiptModal(record)}
          >
            处理回执
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          currentUser?.role === Role.TOWN_AUDITOR
            ? '待乡镇审核批次'
            : '待财政复核批次'
        }
        extra={<Button onClick={fetchData}>刷新</Button>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无待审核数据' }}
        />
      </Card>

      <Modal
        title={
          selectedBatch?.status === BatchStatus.SECOND_REVIEW
            ? '二次复核'
            : currentUser?.role === Role.TOWN_AUDITOR
            ? '乡镇审核'
            : '财政复核'
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedBatch(null);
        }}
        onOk={() => form.submit()}
        okText="提交"
        width={600}
      >
        {selectedBatch && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <p><strong>批次:</strong> {selectedBatch.batchNo}</p>
            <p><strong>农户:</strong> {selectedBatch.farmer.name}</p>
            <p><strong>重量:</strong> {formatWeight(selectedBatch.weight)} / <strong>补贴:</strong> {formatCurrency(selectedBatch.subsidyAmount)}</p>
            {selectedBatch.isAnomaly && (
              <p style={{ color: '#ff4d4f' }}>
                <strong>异常提示:</strong> {selectedBatch.anomalyReason}
              </p>
            )}
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleReview}>
          <Form.Item
            name="isPassed"
            label="审核结果"
            rules={[{ required: true, message: '请选择审核结果' }]}
          >
            <Radio.Group>
              <Radio value={true}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  通过
                </Space>
              </Radio>
              <Radio value={false}>
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  退回
                </Space>
              </Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="opinion"
            label="审核意见"
            rules={[{ required: true, message: '请填写审核意见' }]}
          >
            <Input.TextArea rows={4} placeholder="请填写审核意见..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理回执"
        open={receiptModalVisible}
        onCancel={() => {
          setReceiptModalVisible(false);
          setSelectedBatch(null);
        }}
        onOk={() => receiptForm.submit()}
        okText="提交"
        width={600}
      >
        {selectedBatch && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
            <p><strong>批次:</strong> {selectedBatch.batchNo}</p>
            <p><strong>农户:</strong> {selectedBatch.farmer.name}</p>
            <p><strong>重量:</strong> {formatWeight(selectedBatch.weight)} / <strong>补贴:</strong> {formatCurrency(selectedBatch.subsidyAmount)}</p>
          </div>
        )}
        <Form form={receiptForm} layout="vertical" onFinish={handleReceiptSubmit}>
          <Form.Item
            name="receiptType"
            label="回执类型"
            rules={[{ required: true, message: '请选择回执类型' }]}
          >
            <Select placeholder="请选择回执类型">
              {Object.entries(ReceiptTypeLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="content"
            label="回执内容"
            rules={[{ required: true, message: '请填写回执内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请填写处理回执内容..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReviewList;
