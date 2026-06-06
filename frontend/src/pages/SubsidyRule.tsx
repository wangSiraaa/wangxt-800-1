import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Descriptions,
  Divider,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { subsidyRuleApi } from '../services/api';
import { formatCurrency } from '../utils';
import type { SubsidyRule } from '../types';

const SubsidyRule: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SubsidyRule[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<SubsidyRule | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await subsidyRuleApi.getAll();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (error) {
      message.error('获取补贴规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (rule: SubsidyRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingRule) {
        const result = await subsidyRuleApi.update(editingRule.id, values);
        if (result.success) {
          message.success('规则更新成功');
        } else {
          message.error(result.error || '更新失败');
        }
      } else {
        const result = await subsidyRuleApi.create(values);
        if (result.success) {
          message.success('规则创建成功');
        } else {
          message.error(result.error || '创建失败');
        }
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.error || '操作失败');
    }
  };

  const activeRule = data.find((r) => r.isActive);

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      render: (text: string, record: SubsidyRule) => (
        <Space>
          <strong>{text}</strong>
          {record.isActive && <Tag color="success">生效中</Tag>}
        </Space>
      ),
    },
    {
      title: '补贴单价',
      dataIndex: 'pricePerKg',
      render: (p: number) => formatCurrency(p) + ' /公斤',
    },
    {
      title: '单批次阈值',
      dataIndex: 'weightThreshold',
      render: (w: number) => `${w} kg`,
    },
    {
      title: '异常倍数',
      dataIndex: 'anomalyRatio',
      render: (r: number) => `${r} 倍均值`,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: SubsidyRule) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      {activeRule && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions title="当前生效规则" bordered column={3}>
            <Descriptions.Item label="规则名称">{activeRule.name}</Descriptions.Item>
            <Descriptions.Item label="补贴单价">
              <span style={{ color: '#faad14', fontSize: 18, fontWeight: 'bold' }}>
                {formatCurrency(activeRule.pricePerKg)} /公斤
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="单批次阈值">{activeRule.weightThreshold} kg</Descriptions.Item>
            <Descriptions.Item label="异常判定">
              超过历史均值 {activeRule.anomalyRatio} 倍或单批次超过 {activeRule.weightThreshold}kg
            </Descriptions.Item>
            <Descriptions.Item label="说明" span={2}>
              {activeRule.description || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider>补贴计算示例</Divider>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Space size="large" direction="horizontal" wrap>
              <div>
                <div style={{ fontSize: 14, color: '#666' }}>回收 50 kg</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1677ff' }}>
                  {formatCurrency(50 * activeRule.pricePerKg)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#666' }}>回收 100 kg</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1677ff' }}>
                  {formatCurrency(100 * activeRule.pricePerKg)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#666' }}>回收 200 kg</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1677ff' }}>
                  {formatCurrency(200 * activeRule.pricePerKg)}
                </div>
              </div>
            </Space>
          </div>
        </Card>
      )}

      <Card
        title="补贴规则管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建规则
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRule ? '编辑补贴规则' : '新建补贴规则'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText="保存"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="例如：2024年农膜回收补贴标准" />
          </Form.Item>
          <Form.Item
            name="pricePerKg"
            label="补贴单价 (元/公斤)"
            rules={[{ required: true, message: '请输入补贴单价' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
          </Form.Item>
          <Form.Item
            name="weightThreshold"
            label="单批次重量阈值 (kg)"
            rules={[{ required: true, message: '请输入单批次重量阈值' }]}
            extra="超过该重量的批次将进入二次复核"
          >
            <InputNumber style={{ width: '100%' }} min={0} step={1} precision={0} />
          </Form.Item>
          <Form.Item
            name="anomalyRatio"
            label="异常倍数"
            rules={[{ required: true, message: '请输入异常倍数' }]}
            extra="超过历史均值多少倍判定为异常，如 1.5 表示超过均值1.5倍"
          >
            <InputNumber style={{ width: '100%' }} min={1} step={0.1} precision={1} />
          </Form.Item>
          <Form.Item name="description" label="规则描述">
            <Input.TextArea rows={3} placeholder="请输入规则描述" />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="设为当前生效规则"
            valuePropName="checked"
            extra="设置为生效后，其他规则将自动失效"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubsidyRule;
