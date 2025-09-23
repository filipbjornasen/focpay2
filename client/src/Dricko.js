import React, { useState } from 'react';
import { Button, Layout, Typography, notification } from 'antd';
import './Dricko.css';

const { Content } = Layout;
const { Title, Text } = Typography;

function Dricko() {
  const [loading, setLoading] = useState(false);

  const handleSwishPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/swish-dricko', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'dricko'
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Navigate to the Swish app using the redirectUrl
        if (data.redirectUrl) {
          window.location = data.redirectUrl;
        }

        notification.success({
          message: 'Arrr!',
          description: 'Sailing to Swish waters! Complete your payment there, matey!',
          placement: 'topRight',
        });
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      notification.error({
        message: 'Shiver me timbers!',
        description: 'Something went wrong with the payment. Try again, matey!',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="dricko-layout">
      <Content className="dricko-content">
        <div className="pirate-container">
          <div className="treasure-chest">
            <Title level={1} className="pirate-title">
              🏴‍☠️ Welcome to Dricko's Treasure
            </Title>
            <Text className="pirate-subtitle">
              Ahoy matey! Ready to pay like a true pirate?
            </Text>

            <div className="payment-section">
              <Button
                type="primary"
                size="large"
                loading={loading}
                onClick={handleSwishPayment}
                className="swish-button"
              >
                <span className="swish-icon-left">💰</span>
                Betala med swish
                <span className="swish-icon-right">💰</span>
              </Button>
            </div>

            <div className="pirate-decorations">
              <span className="decoration">⚓</span>
              <span className="decoration">🗡️</span>
              <span className="decoration">💎</span>
              <span className="decoration">🦜</span>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default Dricko;