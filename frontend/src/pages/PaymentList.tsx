import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, message, Modal, Form, Input, Statistic, Row, Col, Tabs, Select, InputNumber } from 'antd';
import { EyeOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { paymentApi, batchApi } from '../services/api';
import { BatchStatusLabels, BatchStatusColors, formatCurrency, formatWeight, getCurrentUser } from '../utils';
import type { Payment, Correction, Batch, BatchStatus } from '../types';

const PaymentList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [correctModalVisible, setCorrectModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [pendingBatches, setPendingBatches] = useState<Batch[]>([]);
  const [payForm] = Form.useForm();
  const [correctForm] = Form.useForm();
  const currentUser = getCurrentUser();
  const canOperate = currentUser?.role === 'FINANCE_REVIEWER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payResult, corrResult, batchResult] = await Promise.all([
        paymentApi.getAll(),
        paymentApi.getCorrections(),
        batchApi.getAll({ status: 'FINANCE_APPROVED' }),
      ]);

      if (payResult.success) setPayments(payResult.data || []);
      if (corrResult.success) setCorrections(corrResult.data || []);
      if (batchResult.success) setPendingBatches(batchResult.data || []);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePay = async (values: any) => {
    if (!selectedBatch) return;
    try {
      const result = await paymentApi.pay({
        batchId: selectedBatch.id,
        remark: values.remark,
      });
      if (result.success) {
        message.success('发放成功');
        setPayModalVisible(false);
        payForm.resetFields();
        setSelectedBatch(null);
        fetchData();
      } else {
        message.error(result.error || '发放失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '发放失败');
    }
  };

  const handleCorrection = async (values: any) => {
    if (!selectedBatch) return;
    try {
      const result = await paymentApi.createCorrection({
        batchId: selectedBatch.id,
        correctedAmount: values.correctedAmount,
        reason: values.reason,
      });
      if (result.success) {
        message.success('更正成功');
        setCorrectModalVisible(false);
        correctForm.resetFields();
        setSelectedBatch(null);
        fetchData();
      } else {
        message.error(result.error || '更正失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '更正失败');
    }
  };

  const paymentColumns = [
    {
      title: '批次编号',
      dataIndex: ['batch', 'batchNo'],
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '农户',
      dataIndex: ['batch', 'farmer', 'name'],
      width: 100,
    },
    {
      title: '发放金额',
      dataIndex: 'amount',
      width: 120,
      render: (a: number) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{formatCurrency(a)}</span>
      ),
    },
    {
      title: '发放状态',
      dataIndex: 'payStatus',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'PAID' ? 'success' : 'warning'}>
          {s === 'PAID' ? '已发放' : '待发放'}
        </Tag>
      ),
    },
    {
      title: '发放人',
      dataIndex: ['payer', 'name'],
      width: 100,
    },
    {
      title: '发放时间',
      dataIndex: 'payDate',
      width: 160,
      render: (d: string) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      render: (_: any, record: Payment) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/batches/${record.batchId}`)}>
            详情
          </Button>
          {canOperate && record.payStatus === 'PAID' && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelectedBatch(record.batch as any);
                correctForm.setFieldsValue({
                  originalAmount: record.amount,
                  correctedAmount: record.amount,
                });
                setCorrectModalVisible(true);
              }}
            >
              更正
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const correctionColumns = [
    {
      title: '批次编号',
      dataIndex: ['batch', 'batchNo'],
      width: 160,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '农户',
      dataIndex: ['batch', 'farmer', 'name'],
      width: 100,
    },
    {
      title: '原金额',
      dataIndex: 'originalAmount',
      width: 120,
      render: (a: number) => formatCurrency(a),
    },
    {
      title: '更正后金额',
      dataIndex: 'correctedAmount',
      width: 120,
      render: (a: number) => (
        <span style={{ color: '#faad14', fontWeight: 'bold' }}>{formatCurrency(a)}</span>
      ),
    },
    {
      title: '差额',
      width: 120,
      render: (_: any, record: Correction) => {
        const diff = record.correctedAmount - record.originalAmount;
        return (
          <span style={{ color: diff > 0 ? '#52c41a' : '#ff4d4f' }}>
            {diff > 0 ? '+' : ''}{formatCurrency(diff)}
          </span>
        );
      },
    },
    {
      title: '更正原因',
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: '更正人',
      dataIndex: ['corrector', 'name'],
      width: 100,
    },
    {
      title: '更正时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const totalPaid = payments.filter((p) => p.payStatus === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalCorrected = corrections.reduce((s, c) => s + c.correctedAmount, 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已发放总额"
              value={totalPaid}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="发放笔数"
              value={payments.filter((p) => p.payStatus === 'PAID').length}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="更正笔数"
              value={corrections.length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="补贴发放管理"
        extra={
          canOperate && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setPayModalVisible(true);
              }}
            >
              发放补贴
            </Button>
          )
        }
      >
        <Tabs
          items={[
            {
              key: 'payments',
              label: '发放记录',
              children: (
                <Table
                  rowKey="id"
                  columns={paymentColumns}
                  dataSource={payments}
                  loading={loading}
                  scroll={{ x: 1200 }}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: 'corrections',
              label: '更正记录',
              children: (
                <Table
                  rowKey="id"
                  columns={correctionColumns}
                  dataSource={corrections}
                  loading={loading}
                  scroll={{ x: 1200 }}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="发放补贴"
        open={payModalVisible}
        onCancel={() => {
          setPayModalVisible(false);
          setSelectedBatch(null);
        }}
        onOk={() => payForm.submit()}
        okText="确认发放"
        width={600}
      >
        <Form form={payForm} layout="vertical" onFinish={handlePay}>
          <Form.Item name="batchId" label="选择批次" rules={[{ required: true, message: '请选择批次' }]}>
            <Select placeholder="请选择待发放的批次">
              {pendingBatches.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.batchNo} - {b.farmer.name} - {formatCurrency(b.subsidyAmount)}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请填写备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="创建更正单"
        open={correctModalVisible}
        onCancel={() => {
          setCorrectModalVisible(false);
          setSelectedBatch(null);
        }}
        onOk={() => correctForm.submit()}
        okText="确认更正"
      >
        <Form form={correctForm} layout="vertical" onFinish={handleCorrection}>
          <Form.Item label="原发放金额">
            {selectedBatch && formatCurrency(selectedBatch.subsidyAmount)}
          </Form.Item>
          <Form.Item
            name="correctedAmount"
            label="更正后金额"
            rules={[{ required: true, message: '请输入更正后金额' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="更正原因"
            rules={[{ required: true, message: '请填写更正原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请说明更正原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentList;
