import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Form,
  Input,
  Button,
  Tabs,
  Table,
  InputNumber,
  Select,
  message,
  Modal,
  Tag,
  Space,
  Typography
} from 'antd';
import {
  LoginOutlined,
  SettingOutlined,
  DollarOutlined,
  LogoutOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import './Admin.css';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [unitPrice, setUnitPrice] = useState('12');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm] = Form.useForm();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setAuthToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnitPrice();
      fetchPayments();
    }
  }, [isAuthenticated]);

  const handleLogin = async (values) => {
    setLoginLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        localStorage.setItem('adminToken', token);
        setAuthToken(token);
        setIsAuthenticated(true);
        message.success('Login successful!');
      } else {
        const error = await response.json();
        message.error(error.details || 'Login failed');
      }
    } catch (error) {
      message.error('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setIsAuthenticated(false);
    message.info('Logged out successfully');
  };

  const fetchUnitPrice = async () => {
    try {
      const response = await fetch('/api/admin/settings/unit-price', {
        headers: {
          'Authorization': `Basic ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnitPrice(data.unitPrice);
      } else {
        message.error('Failed to fetch unit price');
      }
    } catch (error) {
      message.error('Network error');
    }
  };

  const handleUpdateUnitPrice = async (values) => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/admin/settings/unit-price', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
        },
        body: JSON.stringify({ unitPrice: values.unitPrice }),
      });

      if (response.ok) {
        const data = await response.json();
        setUnitPrice(data.unitPrice);
        message.success('Unit price updated successfully!');
      } else {
        const error = await response.json();
        message.error(error.details || 'Failed to update unit price');
      }
    } catch (error) {
      message.error('Network error. Please try again.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const response = await fetch('/api/admin/payments', {
        headers: {
          'Authorization': `Basic ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
      } else {
        message.error('Failed to fetch payments');
      }
    } catch (error) {
      message.error('Network error');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleEditPaymentStatus = (payment) => {
    setEditingPayment(payment);
    editForm.setFieldsValue({ status: payment.status });
    setEditModalVisible(true);
  };

  const handleUpdatePaymentStatus = async (values) => {
    try {
      const response = await fetch(`/api/admin/payments/${editingPayment.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
        },
        body: JSON.stringify({ status: values.status }),
      });

      if (response.ok) {
        message.success('Payment status updated successfully!');
        setEditModalVisible(false);
        fetchPayments();
      } else {
        const error = await response.json();
        message.error(error.details || 'Failed to update payment status');
      }
    } catch (error) {
      message.error('Network error. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      CREATED: 'blue',
      PAID: 'green',
      DECLINED: 'red',
      ERROR: 'red',
      CANCELLED: 'orange',
      CREDITED: 'purple',
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Date Created',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (date) => new Date(date).toLocaleString('sv-SE'),
      sorter: (a, b) => new Date(a.dateCreated) - new Date(b.dateCreated),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Date Updated',
      dataIndex: 'dateUpdated',
      key: 'dateUpdated',
      render: (date) => date ? new Date(date).toLocaleString('sv-SE') : '-',
    },
    {
      title: 'Payer',
      dataIndex: 'payerAlias',
      key: 'payerAlias',
      render: (alias) => alias || '-',
    },
    {
      title: 'Payee',
      dataIndex: 'payeeAlias',
      key: 'payeeAlias',
    },
    {
      title: 'Price',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => `${amount} ${record.currency}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
      filters: [
        { text: 'CREATED', value: 'CREATED' },
        { text: 'PAID', value: 'PAID' },
        { text: 'DECLINED', value: 'DECLINED' },
        { text: 'ERROR', value: 'ERROR' },
        { text: 'CANCELLED', value: 'CANCELLED' },
        { text: 'CREDITED', value: 'CREDITED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Error Message',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (message) => message || '-',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleEditPaymentStatus(record)}
        >
          Edit Status
        </Button>
      ),
    },
  ];

  if (!isAuthenticated) {
    return (
      <Layout className="admin-layout">
        <Content className="admin-content">
          <Card className="login-card" style={{ maxWidth: 400, margin: '100px auto' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>
              <LoginOutlined /> Admin Login
            </Title>
            <Form
              name="login"
              onFinish={handleLogin}
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please input your username!' }]}
              >
                <Input size="large" placeholder="admin" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password size="large" placeholder="password" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loginLoading}
                  block
                >
                  Login
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    );
  }

  const tabItems = [
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          Settings
        </span>
      ),
      children: (
        <Card>
          <Title level={4}>
            <DollarOutlined /> Unit Price Configuration
          </Title>
          <Form
            layout="vertical"
            onFinish={handleUpdateUnitPrice}
            initialValues={{ unitPrice: parseFloat(unitPrice) }}
          >
            <Form.Item
              label="Unit Price (SEK)"
              name="unitPrice"
              rules={[
                { required: true, message: 'Please input unit price!' },
                { type: 'number', min: 0.01, message: 'Price must be greater than 0' },
              ]}
            >
              <InputNumber
                size="large"
                style={{ width: 200 }}
                min={0.01}
                step={1}
                precision={2}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={settingsLoading}
                  size="large"
                >
                  Update Price
                </Button>
                <Button size="large" onClick={fetchUnitPrice}>
                  Reset
                </Button>
              </Space>
            </Form.Item>
          </Form>
          <div style={{ marginTop: 16, padding: 16, background: '#f0f2f5', borderRadius: 8 }}>
            <strong>Current Price:</strong> {unitPrice} SEK
          </div>
        </Card>
      ),
    },
    {
      key: 'payments',
      label: (
        <span>
          <DollarOutlined />
          Payments
        </span>
      ),
      children: (
        <Card
          title="Payment History"
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPayments}
              loading={paymentsLoading}
            >
              Refresh
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={payments}
            rowKey="id"
            loading={paymentsLoading}
            size='small'
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} payments`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      ),
    },
  ];

  return (
    <Layout className="admin-layout">
      <Content className="admin-content" style={{ padding: '24px' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            Admin Dashboard
          </Title>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            danger
          >
            Logout
          </Button>
        </div>

        <Tabs defaultActiveKey="settings" items={tabItems} size="large" />

        <Modal
          title="Edit Payment Status"
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          footer={null}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdatePaymentStatus}
          >
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Please select status!' }]}
            >
              <Select size="large">
                <Option value="CREATED">CREATED</Option>
                <Option value="PAID">PAID</Option>
                <Option value="DECLINED">DECLINED</Option>
                <Option value="ERROR">ERROR</Option>
                <Option value="CANCELLED">CANCELLED</Option>
                <Option value="CREDITED">CREDITED</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" size="large">
                  Update
                </Button>
                <Button size="large" onClick={() => setEditModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
}

export default Admin;
