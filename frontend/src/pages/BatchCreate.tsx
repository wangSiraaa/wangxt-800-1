import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Button,
  Space,
  message,
  Row,
  Col,
  Alert,
  Divider,
} from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { farmerApi, batchApi } from '../services/api';
import type { Farmer } from '../types';

const { Option } = Select;

const BatchCreate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [subsidyPreview, setSubsidyPreview] = useState<number | null>(null);
  const [activeRule, setActiveRule] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    try {
      const result = await farmerApi.getAll();
      if (result.success && result.data) {
        setFarmers(result.data);
      }
    } catch (error) {
      message.error('获取农户列表失败');
    }
  };

  const handleWeightChange = (value: number | null) => {
    if (value) {
      setSubsidyPreview(value * 2.5);
    } else {
      setSubsidyPreview(null);
    }
  };

  const handleCreate = async (submit: boolean) => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const result = await batchApi.create({
        farmerId: values.farmerId,
        weight: values.weight,
        plotNumber: values.plotNumber,
        collectionDate: values.collectionDate.format('YYYY-MM-DD'),
      });

      if (result.success && result.data) {
        if (submit) {
          navigate(`/batches/${result.data.id}`);
          message.success('创建成功！请在详情页上传照片后提交审核');
        } else {
          message.success('保存为草稿成功');
          navigate('/batches');
        }
      } else {
        message.error(result.error || '创建失败');
      }
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写完整的表单信息');
      } else {
        message.error(error.response?.data?.error || '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card title="录入农膜回收称重信息">
        <Alert
          type="info"
          showIcon
          message="提示"
          description="请如实填写回收信息，提交时需要上传称重照片。重量异常的批次将自动进入二次复核流程。"
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="vertical" initialValues={{ collectionDate: dayjs() }}>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="选择农户"
                name="farmerId"
                rules={[{ required: true, message: '请选择农户' }]}
              >
                <Select placeholder="请选择农户" showSearch optionFilterProp="children">
                  {farmers.map((farmer) => (
                    <Option key={farmer.id} value={farmer.id}>
                      {farmer.name} - {farmer.town} {farmer.village} ({farmer.idCard})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="地块编号"
                name="plotNumber"
                rules={[{ required: true, message: '请填写地块编号' }]}
              >
                <Input placeholder="例如：DN-001" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="回收重量 (kg)"
                name="weight"
                rules={[{ required: true, message: '请填写回收重量' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.1}
                  step={0.1}
                  precision={2}
                  placeholder="请输入回收重量"
                  onChange={handleWeightChange}
                  addonAfter="kg"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="回收日期"
                name="collectionDate"
                rules={[{ required: true, message: '请选择回收日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {subsidyPreview !== null && (
            <>
              <Divider />
              <Alert
                type="success"
                showIcon
                message="预计补贴金额"
                description={
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                    ¥ {subsidyPreview.toFixed(2)}
                    <span style={{ fontSize: 14, color: '#666', marginLeft: 12 }}>
                      （按 2.5 元/公斤 计算）
                    </span>
                  </div>
                }
              />
            </>
          )}

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="default"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={() => handleCreate(false)}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={loading}
                onClick={() => handleCreate(true)}
              >
                创建并去上传照片
              </Button>
              <Button onClick={() => navigate('/batches')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BatchCreate;
