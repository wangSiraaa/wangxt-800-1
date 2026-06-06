import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  List,
  Upload,
  message,
  Modal,
  Form,
  Input,
  Radio,
  Image,
  Divider,
  Empty,
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { batchApi, reviewApi, paymentApi, receiptApi } from '../services/api';
import {
  BatchStatusLabels,
  BatchStatusColors,
  ReviewTypeLabels,
  ReceiptTypeLabels,
  formatWeight,
  formatCurrency,
  getCurrentUser,
} from '../utils';
import type { Batch, BatchStatus, ReviewType, Role, ReceiptType } from '../types';

const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [reviewForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const [receiptForm] = Form.useForm();
  const currentUser = getCurrentUser();

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await batchApi.getById(id);
      if (result.success && result.data) {
        setBatch(result.data);
      }
    } catch (error) {
      message.error('获取批次详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitLoading(true);
    try {
      const result = await batchApi.submit(id);
      if (result.success) {
        message.success(
          result.data?.anomalyCheck?.isAnomaly
            ? '提交成功！该批次重量异常，已自动进入二次复核流程'
            : '提交成功！等待审核'
        );
        fetchDetail();
      } else {
        message.error(result.error || '提交失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReview = async (values: any) => {
    if (!batch) return;
    try {
      const reviewType: ReviewType =
        batch.status === BatchStatus.SECOND_REVIEW
          ? ReviewType.SECOND_REVIEW
          : currentUser?.role === Role.TOWN_AUDITOR
          ? ReviewType.TOWN_AUDIT
          : ReviewType.FINANCE_REVIEW;

      const result = await reviewApi.review({
        batchId: batch.id,
        opinion: values.opinion,
        isPassed: values.isPassed,
        reviewType,
      });

      if (result.success) {
        message.success(values.isPassed ? '审核通过' : '已退回');
        setReviewModalVisible(false);
        reviewForm.resetFields();
        fetchDetail();
      } else {
        message.error(result.error || '审核失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '审核失败');
    }
  };

  const handlePay = async (values: any) => {
    if (!batch) return;
    try {
      const result = await paymentApi.pay({
        batchId: batch.id,
        remark: values.remark,
      });
      if (result.success) {
        message.success('补贴发放成功');
        setPayModalVisible(false);
        payForm.resetFields();
        fetchDetail();
      } else {
        message.error(result.error || '发放失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '发放失败');
    }
  };

  const handleReceiptSubmit = async (values: any) => {
    if (!batch) return;
    try {
      const result = await receiptApi.submit({
        batchId: batch.id,
        content: values.content,
        receiptType: values.receiptType,
      });

      if (result.success) {
        message.success('处理回执提交成功');
        setReceiptModalVisible(false);
        receiptForm.resetFields();
        fetchDetail();
      } else {
        message.error(result.error || '提交失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || '提交失败');
    }
  };

  const handleUpload = async (options: any) => {
    if (!batch) return;
    const { file, onSuccess, onError } = options;
    try {
      const result = await batchApi.uploadPhotos(batch.id, [file]);
      if (result.success) {
        message.success('照片上传成功');
        fetchDetail();
        onSuccess(result.data);
      } else {
        onError(new Error(result.error));
      }
    } catch (error) {
      onError(error);
    }
  };

  const canSubmit =
    currentUser?.role === Role.RECYCLER &&
    batch?.status === BatchStatus.DRAFT &&
    batch?.hasPhoto;

  const canReview =
    ((currentUser?.role === Role.TOWN_AUDITOR && batch?.status === BatchStatus.SUBMITTED) ||
      (currentUser?.role === Role.FINANCE_REVIEWER &&
        [BatchStatus.TOWN_APPROVED, BatchStatus.SECOND_REVIEW].includes(
          batch?.status as BatchStatus
        )));

  const canPay =
    currentUser?.role === Role.FINANCE_REVIEWER &&
    [BatchStatus.FINANCE_APPROVED, BatchStatus.SECOND_REVIEW].includes(
      batch?.status as BatchStatus
    );

  if (!batch && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="未找到该批次信息" />
        <Button onClick={() => navigate('/batches')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/batches')}>
          返回列表
        </Button>
      </div>

      <Card
        title={`批次详情 - ${batch?.batchNo}`}
        loading={loading}
        extra={
          <Space>
            {canSubmit && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitLoading}
                onClick={handleSubmit}
              >
                提交审核
              </Button>
            )}
            {canReview && (
              <Button
                type="primary"
                onClick={() => setReviewModalVisible(true)}
              >
                {batch?.status === BatchStatus.SECOND_REVIEW ? '二次复核' : '审核'}
              </Button>
            )}
            {canPay && (
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => setPayModalVisible(true)}
              >
                发放补贴
              </Button>
            )}
            {batch && (
              <Button
                icon={<FileTextOutlined />}
                onClick={() => setReceiptModalVisible(true)}
              >
                处理回执
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="批次编号" span={1}>
            <strong>{batch?.batchNo}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="当前状态" span={1}>
            {batch && (
              <Tag color={BatchStatusColors[batch.status]}>
                {BatchStatusLabels[batch.status]}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="农户姓名">{batch?.farmer.name}</Descriptions.Item>
          <Descriptions.Item label="身份证号">{batch?.farmer.idCard}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{batch?.farmer.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="所在村镇">
            {batch?.farmer.town} {batch?.farmer.village}
          </Descriptions.Item>
          <Descriptions.Item label="地块编号">{batch?.plotNumber}</Descriptions.Item>
          <Descriptions.Item label="地块面积">
            {batch?.farmer.plotArea ? `${batch.farmer.plotArea} 亩` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="回收重量">
            <strong style={{ color: '#1677ff', fontSize: 16 }}>
              {batch && formatWeight(batch.weight)}
            </strong>
          </Descriptions.Item>
          <Descriptions.Item label="补贴金额">
            <strong style={{ color: '#faad14', fontSize: 16 }}>
              {batch && formatCurrency(batch.subsidyAmount)}
            </strong>
          </Descriptions.Item>
          <Descriptions.Item label="回收日期">
            {batch && dayjs(batch.collectionDate).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="提交人">{batch?.submitter.name}</Descriptions.Item>
          {batch?.isAnomaly && (
            <Descriptions.Item label="异常说明" span={2}>
              <Tag color="error">异常</Tag> {batch.anomalyReason}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider>称重照片</Divider>

        {currentUser?.role === Role.RECYCLER &&
          batch?.status === BatchStatus.DRAFT && (
            <div style={{ marginBottom: 16 }}>
              <Upload
                customRequest={handleUpload}
                showUploadList={false}
                accept="image/*"
                multiple
              >
                <Button icon={<UploadOutlined />}>上传照片</Button>
              </Upload>
            </div>
          )}

        {batch?.photos && batch.photos.length > 0 ? (
          <div className="photo-grid">
            {batch.photos.map((photo) => (
              <div key={photo.id} className="photo-item">
                <Image
                  src={`/uploads/${photo.filePath.split('/').pop()}`}
                  alt={photo.filename}
                  fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjExMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPuWbvueJh+eJh+W4iuWKoTwvdGV4dD48L3N2Zz4="
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无照片" />
        )}

        <Divider>审核记录</Divider>

        {batch?.reviews && batch.reviews.length > 0 ? (
          <List
            dataSource={batch.reviews}
            renderItem={(review) => (
              <List.Item key={review.id}>
                <List.Item.Meta
                  avatar={
                    review.isPassed ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                    )
                  }
                  title={
                    <Space>
                      <Tag>{ReviewTypeLabels[review.reviewType]}</Tag>
                      <span>{review.reviewer.name}</span>
                      <span style={{ color: review.isPassed ? '#52c41a' : '#ff4d4f' }}>
                        {review.isPassed ? '通过' : '退回'}
                      </span>
                    </Space>
                  }
                  description={
                    <div>
                      <div>{review.opinion}</div>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        {dayjs(review.reviewedAt).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无审核记录" />
        )}

        {batch?.payments && batch.payments.length > 0 && (
          <>
            <Divider>发放记录</Divider>
            <List
              dataSource={batch.payments}
              renderItem={(payment) => (
                <List.Item key={payment.id}>
                  <List.Item.Meta
                    avatar={<DollarOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
                    title={
                      <Space>
                        <Tag color="success">{payment.payStatus === 'PAID' ? '已发放' : '待发放'}</Tag>
                        <span>发放人: {payment.payer?.name}</span>
                        <strong style={{ color: '#faad14' }}>{formatCurrency(payment.amount)}</strong>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{payment.remark || '-'}</div>
                        {payment.payDate && (
                          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                            发放时间: {dayjs(payment.payDate).format('YYYY-MM-DD HH:mm:ss')}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}

        {batch?.receipts && batch.receipts.length > 0 && (
          <>
            <Divider>处理回执</Divider>
            <List
              dataSource={batch.receipts}
              renderItem={(receipt) => (
                <List.Item key={receipt.id}>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ color: '#1677ff', fontSize: 20 }} />}
                    title={
                      <Space>
                        <Tag color="blue">{ReceiptTypeLabels[receipt.receiptType as ReceiptType]}</Tag>
                        <span>处理人: {receipt.handler?.name}</span>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{receipt.content}</div>
                        <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                          处理时间: {dayjs(receipt.handledAt).format('YYYY-MM-DD HH:mm:ss')}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      <Modal
        title={batch?.status === BatchStatus.SECOND_REVIEW ? '二次复核' : '审核'}
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        onOk={() => reviewForm.submit()}
        okText="提交"
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
          <Form.Item name="isPassed" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
            <Radio.Group>
              <Radio value={true}>通过</Radio>
              <Radio value={false}>退回</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="opinion" label="审核意见" rules={[{ required: true, message: '请填写审核意见' }]}>
            <Input.TextArea rows={4} placeholder="请填写审核意见" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发放补贴"
        open={payModalVisible}
        onCancel={() => setPayModalVisible(false)}
        onOk={() => payForm.submit()}
        okText="确认发放"
      >
        <Form form={payForm} layout="vertical" onFinish={handlePay}>
          <Form.Item label="拟发放金额">
            <strong style={{ fontSize: 20, color: '#faad14' }}>
              {batch && formatCurrency(batch.subsidyAmount)}
            </strong>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请填写备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理回执"
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        onOk={() => receiptForm.submit()}
        okText="提交"
        width={600}
      >
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

export default BatchDetail;
